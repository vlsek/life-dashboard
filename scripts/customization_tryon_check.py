#!/usr/bin/env python3
"""Проверка «Примерить» в Кастомизации (BACKLOG 47.6 срез 5b): собранная страница /customization/ в Chromium, Supabase подменён перехватом запросов.
Запуск: python3 scripts/customization_tryon_check.py  (сначала: cd web-customization && npm run build; нужен playwright, Chromium /opt/google/chrome/chrome).
Проверяет: режим отладки включён → баннер и кнопка «Примерить» у закрытого предмета; клик → пометка «не сохраняется», «Снять примерку», «Сбросить примерку»,
ни одной НОВОЙ записи на сервер (запись языка ui_settings при загрузке — штатная, до примерки); после перезагрузки примерки нет; без режима отладки кнопок нет."""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 5189
REF = 'haxmgtflegsfpxieaydv'
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
SESSION = {'access_token': 'a.b.c', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
           'user': {'id': 'me', 'email': 'me@x.com', 'aud': 'authenticated', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-01-01T00:00:00Z'}}


def handler_for(debug, writes):
    def handler(route):
        req = route.request
        if req.method == 'OPTIONS':
            return route.fulfill(status=204, headers=CORS)
        url = req.url
        def ok(data):
            route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json'}, body=json.dumps(data))
        if req.method in ('POST', 'PATCH', 'PUT', 'DELETE') and '/rest/v1/rpc/' not in url:
            writes.append(req.method + ' ' + url.split('/rest/v1/')[-1] + ' ' + (req.post_data or '')[:200])
            return ok([])
        if '/rest/v1/rpc/get_leaderboard' in url:
            return ok([{'user_id': 'me', 'total_points': 0}])
        if '/rest/v1/rpc/' in url:
            return ok(None)
        if '/rest/v1/profiles' in url:
            if 'debug_mode' in url:
                return ok({'debug_mode': True} if debug else {})
            if 'customization' in url:
                return ok({'customization': {}})
            return ok({'onboarded': True})
        return ok([])
    return handler


def run(browser, debug, steps):
    writes = []
    ctx = browser.new_context(viewport={'width': 900, 'height': 900}, service_workers='block')
    page = ctx.new_page()
    page.route('**/*.supabase.co/**', handler_for(debug, writes))
    page.add_init_script("localStorage.setItem('site_lang','ru'); localStorage.setItem('sb-%s-auth-token', %s);" % (REF, json.dumps(json.dumps(SESSION))))
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:%d/customization/' % PORT)
    try:
        page.wait_for_selector('[data-testid^="item-"]', state='attached', timeout=8000)
    except Exception:
        errors.append('страница не отрисовалась')
    page.wait_for_timeout(500)
    res = steps(page, writes)
    ctx.close()
    return res, errors


def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    fails = []
    def check(label, ok):
        print(('OK   ' if ok else 'FAIL ') + label)
        if not ok: fails.append(label)
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path='/opt/google/chrome/chrome', args=['--no-sandbox'])

            def with_debug(page, writes):
                out = {'banner': page.locator('[data-testid="debug-banner"]').count()}
                btns = page.locator('[data-testid="tryon"]')
                out['n_btn'] = btns.count()
                out['has_reset_before'] = page.locator('[data-testid="tryon-reset"]').count()
                if out['n_btn']:
                    card = page.locator('[data-testid^="item-"]:has([data-testid="tryon"])').first
                    key = card.get_attribute('data-testid').replace('item-', '')
                    out['key'] = key
                    out['before_click'] = list(writes)  # запись ui_settings (язык) делает оболочка при загрузке — к примерке не относится
                    btns.first.click(); page.wait_for_timeout(300)
                    out['untry'] = page.locator('[data-testid="untryon"]').count()
                    out['note'] = page.locator('[data-testid="tryon-note"]').count()
                    out['reset'] = page.locator('[data-testid="tryon-reset"]').count()
                    out['writes'] = list(writes)
                    page.locator('[data-testid="tryon-reset"]').click(); page.wait_for_timeout(300)
                    out['after_reset'] = page.locator('[data-testid="untryon"]').count()
                    btns.first.click(); page.wait_for_timeout(300)
                    page.reload(); page.wait_for_selector('[data-testid^="item-"]', state='attached', timeout=8000); page.wait_for_timeout(500)
                    out['after_reload_note'] = page.locator('[data-testid="tryon-note"]').count()
                    out['writes_total'] = list(writes)
                return out
            r, errs = with_debug_res = run(br, True, with_debug)
            check('режим отладки: баннер и кнопки «Примерить» у закрытых/платных предметов', r['banner'] == 1 and r['n_btn'] > 0 and r['has_reset_before'] == 0)
            check('клик «Примерить»: «Снять примерку», пометка «не сохраняется», кнопка «Сбросить примерку»', r.get('untry') == 1 and r.get('note') == 1 and r.get('reset') == 1)
            allw = r.get('writes_total') or []
            check('примерка, сброс и перезагрузка НЕ добавляют записей на сервер; ни одна запись не трогает выбор/покупки (customization, user_customizations, shop_items)',
                  r.get('writes') == r.get('before_click') and len(allw) == len(r.get('before_click') or []) and not any(re.search(r'customization|shop_items', w) for w in allw))
            check('«Сбросить примерку» снимает примерку', r.get('after_reset') == 0)
            check('после перезагрузки страницы примерки нет', r.get('after_reload_note') == 0)
            check('JS-ошибок нет', errs == [])

            r, errs = run(br, False, lambda pg, w: {'banner': pg.locator('[data-testid="debug-banner"]').count(), 'btn': pg.locator('[data-testid="tryon"]').count()})
            check('без режима отладки баннера и кнопок «Примерить» нет', r['banner'] == 0 and r['btn'] == 0)
            check('...и без JS-ошибок', errs == [])
            br.close()
    finally:
        srv.terminate()
    print('\nИТОГО: %s' % ('всё OK' if not fails else 'ПРОБЛЕМ: %d' % len(fails)))
    sys.exit(1 if fails else 0)

main()
