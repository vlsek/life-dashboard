#!/usr/bin/env python3
"""Проверка страницы диагностики /pwa-check.html настоящим Chromium (BACKLOG 926).

1) Нормальный сайт: ни одной красной проверки, нет ошибок JS, отчёт копируется.
2) «Сломанный» манифест (перехват запроса): страница ДОЛЖНА показать красные пункты и вердикт «Найдено проблем».
3) Манифест отдаёт 404: честное сообщение, а не зависание.
Запуск: python3 -m http.server 8099 --bind 127.0.0.1 &  затем  python3 scripts/pwa_check_page_test.py http://127.0.0.1:8099
(контекст постоянный, как в pwa_installability_check.py; браузер — /opt/google/chrome/chrome)."""
import json, os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099").rstrip("/")
CHROME = os.environ.get("CHROME_PATH", "/opt/google/chrome/chrome")
fails = []

def check(cond, msg):
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

def rows(pg):
    return pg.evaluate("[...document.querySelectorAll('#checks li')].map(li => ({cls: li.className, title: li.querySelector('.title').innerText, text: li.innerText}))")

def new_ctx(p, **kw):
    return p.chromium.launch_persistent_context(tempfile.mkdtemp(), executable_path=CHROME, args=["--no-sandbox"], viewport={"width": 800, "height": 900}, **kw)

with sync_playwright() as p:
    ctx = new_ctx(p)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)

    # 1) нормальный сайт
    pg = ctx.new_page(); errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/pwa-check.html"); pg.wait_for_timeout(10000)
    r = rows(pg)
    check(len(r) == 10, f"10 проверок на странице (есть {len(r)})")
    named = {x["title"]: x["cls"] for x in r}
    for k in ("Безопасное соединение (HTTPS)", "Ссылка на манифест в странице", "Манифест загружается и читается", "Обязательные поля манифеста", "Иконки доступны (192 и 512 пикселей)", "Service worker (сервис-воркер)"):
        check(named.get(k) == "ok", f"зелёная проверка: {k} → {named.get(k)}")
    check(named.get("Стартовая страница (start_url) открывается") in ("ok", "warn"), "start_url: ok или предупреждение о редиректе")
    check(not errors, f"нет ошибок JS на странице ({errors})")
    check(pg.locator("#verdict").is_visible(), "итог показан после проверок")
    pg.click("#copy"); pg.wait_for_timeout(300)
    clip = pg.evaluate("navigator.clipboard.readText()")
    check("Отчёт проверки установки" in clip and "Манифест загружается" in clip, "кнопка «Скопировать отчёт» кладёт текст в буфер")

    ctx.close()

    # 2) сломанный манифест (service worker блокируем: наш sw.js отдаёт манифест из кэша мимо перехвата запросов)
    ctx = new_ctx(p, service_workers="block")
    pg2 = ctx.new_page()
    bad = {"name": "X", "start_url": "/login/", "display": "browser", "icons": [{"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png"}], "prefer_related_applications": True}
    pg2.route("**/manifest.json", lambda route: route.fulfill(status=200, content_type="application/manifest+json", body=json.dumps(bad)))
    pg2.goto(BASE + "/pwa-check.html"); pg2.wait_for_timeout(10000)
    r2 = {x["title"]: x for x in rows(pg2)}
    f = r2["Обязательные поля манифеста"]
    check(f["cls"] == "bad", "сломанный манифест → красная проверка полей")
    for needle in ("display должен быть", "prefer_related_applications", "нет иконки ≥512px"):
        check(needle in f["text"], f"названа причина: {needle}")
    check("Найдено проблем" in pg2.inner_text("#verdict"), "вердикт «Найдено проблем»")

    ctx.close()

    # 3) манифест 404
    ctx = new_ctx(p, service_workers="block")
    pg3 = ctx.new_page()
    pg3.route("**/manifest.json", lambda route: route.fulfill(status=404, body="no"))
    pg3.goto(BASE + "/pwa-check.html"); pg3.wait_for_timeout(10000)
    r3 = {x["title"]: x for x in rows(pg3)}
    check(r3["Манифест загружается и читается"]["cls"] == "bad" and "HTTP 404" in r3["Манифест загружается и читается"]["text"], "манифест 404 → красная проверка с кодом")
    check(not any(x["cls"] == "wait" for x in r3.values()), "ничего не зависло в «ожидании»")
    ctx.close()

print("\nИТОГ:", "всё хорошо" if not fails else f"{len(fails)} провалов")
sys.exit(1 if fails else 0)
