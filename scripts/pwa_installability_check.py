#!/usr/bin/env python3
"""Проверка «можно ли установить сайт как приложение (PWA)» настоящим Chromium через DevTools Protocol.

Браузер сам отвечает, почему страница НЕ считается устанавливаемой (Page.getInstallabilityErrors) — то же, что вкладка
DevTools → Application → Manifest → Installability. Пустой список = значок установки в адресной строке должен появиться.

Использование (нужны playwright и Chromium/Chrome; в контейнере: pip install playwright --break-system-packages,
браузер — /opt/google/chrome/chrome):
    # локально: раздать репозиторий и проверить страницы
    python3 -m http.server 8099 --bind 127.0.0.1 &
    python3 scripts/pwa_installability_check.py http://127.0.0.1:8099
    # боевой сайт (если сеть позволяет):
    python3 scripts/pwa_installability_check.py https://<адрес-сайта> /dashboard/ /goals/

ВАЖНО: контекст ОБЯЗАТЕЛЬНО постоянный (launch_persistent_context), а не обычный new_context: в «инкогнито» браузер всегда отвечает
`in-incognito`, и все остальные причины не видны.
"""
import os
import sys
import tempfile

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099").rstrip("/")
PAGES = sys.argv[2:] or ["/dashboard/index.html", "/goals/index.html", "/shop/index.html", "/calendar/index.html", "/login/index.html",
                         "/workouts/index.html", "/community/index.html", "/customization/index.html", "/index.html"]
CHROME = os.environ.get("CHROME_PATH", "/opt/google/chrome/chrome")

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(tempfile.mkdtemp(), executable_path=CHROME, args=["--no-sandbox"], viewport={"width": 1000, "height": 700})
    bad = 0
    for path in PAGES:
        pg = ctx.new_page()
        try:
            r = pg.goto(BASE + path, wait_until="load", timeout=20000)
            pg.wait_for_timeout(1500)
            cdp = ctx.new_cdp_session(pg)
            errs = [e["errorId"] for e in cdp.send("Page.getInstallabilityErrors").get("installabilityErrors", [])]
            has_link = pg.evaluate("!!document.querySelector('link[rel=manifest]')")
            ok = not errs and has_link
            bad += 0 if ok else 1
            print(f"{path:28} http={r.status if r else '?'} manifest-link={has_link} ошибки={errs or 'нет — установка доступна'}")
        except Exception as e:  # noqa: BLE001
            bad += 1
            print(f"{path:28} ОШИБКА {str(e)[:120]}")
        pg.close()
    ctx.close()
sys.exit(1 if bad else 0)
