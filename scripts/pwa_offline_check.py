#!/usr/bin/env python3
"""Проверка «приложение открывается без сети» настоящим Chromium (BACKLOG 66.3 / 66.8; автоматическая часть чек-листа).

Что делает:
  1. Поднимает статический сервер на корне репозитория (в потоке — после выхода ничего не остаётся жить).
  2. Открывает страницу ОНЛАЙН под фиктивным входом (Supabase замокан), ждёт установки service worker'а и пока в кэше `ld-shell-*`
     окажутся ВСЕ файлы из sw-assets.js (страницы, хэшированные ассеты, runtime-файлы) — иначе офлайн-старт неполный.
  3. Отключает сеть (`set_offline`) и открывает КАЖДУЮ страницу пилота из sw-assets.js. Для каждой требует: ответ дал service worker,
     статус 200, страница отрисовала текст, нет необработанных ошибок JS и нет упавших запросов к своим файлам (.js/.css/иконки).
  4. Перезагружает исходную вкладку без сети.
Код выхода 0 — всё прошло, 1 — есть провалы (они печатаются).

Что НЕ проверяет: реальные данные без сети (Supabase замокан пустыми ответами), запись без сети, обновление версии, установку как приложения
(для неё — scripts/pwa_installability_check.py), и сам боевой сайт.

Нужны playwright и Chromium (pip install playwright --break-system-packages; браузер — /opt/google/chrome/chrome или CHROME_PATH).
Запуск:  python3 scripts/pwa_offline_check.py [/dashboard/ /goals/ …]   (без аргументов — все страницы из sw-assets.js)
"""
import base64
import functools
import http.server
import json
import os
import re
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.environ.get("CHROME_PATH", "/opt/google/chrome/chrome")
SUPABASE_STORAGE_KEY = "sb-haxmgtflegsfpxieaydv-auth-token"  # ключ сессии supabase-js в localStorage (ref проекта)


def b64(obj):
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")


def fake_session():
    now = int(time.time())
    jwt = ".".join([b64({"alg": "HS256", "typ": "JWT"}), b64({"sub": "u1", "exp": now + 3600, "role": "authenticated"}), "sig"])
    user = {"id": "u1", "aud": "authenticated", "role": "authenticated", "email": "a@b.c", "created_at": "2026-01-01T00:00:00Z", "app_metadata": {}, "user_metadata": {}}
    session = {"access_token": jwt, "refresh_token": "r", "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "user": user}
    profile = {"user_id": "u1", "onboarded": True, "customization": {}, "display_name": "Тест", "gender": "female", "timezone": None}
    return user, session, profile


def shell_lists():
    """pages / assets / runtime из sw-assets.js (его пишет scripts/gen_sw_assets.py)."""
    src = open(os.path.join(ROOT, "sw-assets.js"), encoding="utf-8").read()
    out = {}
    for key in ("pages", "assets", "runtime"):
        m = re.search(key + r": \[(.*?)\n  \]", src, re.S)
        out[key] = json.loads("[" + m.group(1).rstrip().rstrip(",") + "]") if m else []
    return out


def start_server():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args, **kwargs):  # без шума в выводе
            pass

    handler = functools.partial(Quiet, directory=ROOT)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    shell = shell_lists()
    pages = sys.argv[1:] or shell["pages"]
    expected = set(shell["pages"] + shell["assets"] + shell["runtime"])
    httpd = start_server()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    user, session, profile = fake_session()
    failures = []

    def mock(route):
        u = route.request.url
        if "supabase.co" not in u:
            return route.continue_()
        if "/auth/v1/user" in u:
            return route.fulfill(json=user)
        obj = "vnd.pgrst.object" in (route.request.headers.get("accept") or "")
        hdr = {"content-range": "0-0/0", "access-control-allow-origin": "*"}
        if "/profiles" in u:
            return route.fulfill(status=200, headers=hdr, json=profile if obj else [profile])
        route.fulfill(status=200, headers=hdr, json=None if obj else [])

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="allow")
        ctx.add_init_script(
            f"localStorage.setItem('{SUPABASE_STORAGE_KEY}', {json.dumps(json.dumps(session))});"
            "localStorage.setItem('site_lang','ru');localStorage.setItem('welcome_tour_seen','1');"
        )
        ctx.route("**/*", mock)
        first = ctx.new_page()
        first.goto(base + "/dashboard/", wait_until="load")
        first.evaluate("navigator.serviceWorker.ready.then(() => 1)")
        cached = set()
        for _ in range(60):  # до 30 с: предкэш ~120 файлов
            urls = first.evaluate(
                "caches.keys().then(async ks => { const out = []; for (const k of ks) { if (!k.startsWith('ld-shell-')) continue;"
                " for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname) } return out })"
            )
            cached = set(urls)
            if expected <= cached:
                break
            time.sleep(0.5)
        missing = sorted(expected - cached)
        print(f"предкэш: {len(cached & expected)}/{len(expected)} файлов из sw-assets.js")
        if missing:
            failures.append(f"в кэше нет {len(missing)} файлов из sw-assets.js, например {missing[:3]}")
        first.reload(wait_until="load")  # теперь вкладка под контролем service worker'а
        if not first.evaluate("!!navigator.serviceWorker.controller"):
            failures.append("после перезагрузки страница не под контролем service worker'а")

        ctx.set_offline(True)
        print(f"{'страница':<22}{'ответил SW':<12}{'статус':<8}{'текст':<8}замечания")
        for path in pages:
            page = ctx.new_page()
            errors, failed = [], []
            page.on("pageerror", lambda e, errors=errors: errors.append(str(e)[:100]))
            # ERR_ABORTED — запрос покинутой страницы (клиентский редирект, напр. /history/ → /calendar/?view=history): не провал
            page.on(
                "requestfailed",
                lambda r, failed=failed: failed.append(r.url)
                if r.url.startswith(base) and not r.url.endswith(".map") and "ERR_ABORTED" not in (r.failure or "")
                else None,
            )
            notes = []
            try:
                resp = page.goto(base + path, wait_until="load", timeout=15000)
                page.wait_for_timeout(1200)
                from_sw = bool(resp and resp.from_service_worker)
                status = resp.status if resp else 0
                text = page.evaluate("(document.body.innerText || '').trim().length")
                if not from_sw:
                    notes.append("ответила сеть, а не service worker")
                if status != 200:
                    notes.append(f"статус {status}")
                if text < 50:
                    notes.append("страница пустая")
                if errors:
                    notes.append("ошибки JS: " + "; ".join(errors[:2]))
                if failed:
                    notes.append(f"упали запросы к своим файлам: {[u.replace(base, '') for u in failed[:3]]}")
                final = page.url.replace(base, "")
                if final != path:
                    notes_info = f" (→ {final})"
                else:
                    notes_info = ""
                print(f"{path:<22}{str(from_sw):<12}{status:<8}{text:<8}{'; '.join(notes) or 'ок'}{notes_info}")
            except Exception as e:  # noqa: BLE001 — любой сбой навигации = провал страницы
                notes.append(f"навигация упала: {str(e)[:80]}")
                print(f"{path:<22}{'-':<12}{'-':<8}{'-':<8}{notes[-1]}")
            if notes:
                failures.append(f"{path}: " + "; ".join(notes))
            page.close()
        try:
            first.reload(wait_until="load", timeout=15000)
        except Exception as e:  # noqa: BLE001
            failures.append(f"перезагрузка вкладки без сети упала: {str(e)[:80]}")
        browser.close()
    httpd.shutdown()
    if failures:
        print("\nПРОВАЛЫ:")
        for f in failures:
            print(" -", f)
        sys.exit(1)
    print(f"\nвсё прошло: {len(pages)} страниц открываются без сети")


if __name__ == "__main__":
    main()
