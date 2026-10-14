#!/usr/bin/env python3
"""Проверка админки на Vue (BACKLOG 47.4 «Режим отладки» + 47.5 перенос на Vue): собранная страница /admin/ в Chromium, сервер Supabase подменён
перехватом сетевых запросов (без сети и без входа): сессия кладётся в localStorage, REST-вызовы (rpc/profiles) отвечает заглушка.
Запуск: python3 scripts/admin_debug_check.py   (нужен playwright, Chromium: /opt/google/chrome/chrome; перед этим собрать пилот: cd web-admin && npm run build).
Печатает OK/FAIL, код возврата 1 при FAIL.
Сценарии: переключатель отладки (включение/выключение, тост), уже включён на сервере, ошибка сервера (галочка откатывается, тост без сырого текста),
колонки нет (миграция 066 не применена: карточки нет, таблица есть), не админ (ни карточки, ни таблицы, подсказка про is_admin),
таблица (значок админа, дата, «(это ты)», у себя нет «Удалить»), удаление (подтверждение → rpc admin_delete_user → тост), отмена удаления."""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 5188
REF = 'haxmgtflegsfpxieaydv'  # проект из web-admin/src/lib/supabase.ts: ключ сессии supabase-js = sb-<ref>-auth-token
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
USERS = [
    {'user_id': 'adm', 'email': 'adm@x.com', 'display_name': 'Админ', 'is_admin': True, 'created_at': '2026-01-01T00:00:00Z'},
    {'user_id': 'u2', 'email': 'u2@x.com', 'display_name': 'Вася', 'is_admin': False, 'created_at': '2026-02-01T00:00:00Z'},
]
SESSION = {'access_token': 'a.b.c', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
           'user': {'id': 'adm', 'email': 'adm@x.com', 'aud': 'authenticated', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-01-01T00:00:00Z'}}


def make_handler(cfg, calls, state):
    def handler(route):
        req = route.request
        if req.method == 'OPTIONS':
            return route.fulfill(status=204, headers=CORS)
        url = req.url
        body = req.post_data or ''
        def ok(data, status=200):
            route.fulfill(status=status, headers={**CORS, 'content-type': 'application/json'}, body=json.dumps(data))
        m = re.search(r'/rest/v1/rpc/(\w+)', url)
        if m:
            fn = m.group(1)
            calls.append([fn, json.loads(body) if body else None])
            if fn == 'admin_list_users':
                return ok({'message': 'forbidden'}, 403) if cfg.get('notAdmin') else ok([u for u in USERS if u['user_id'] not in state['deleted']])
            if fn == 'set_debug_mode':
                if cfg.get('rpcFails'):
                    return ok({'message': 'boom'}, 400)
                state['debug'] = bool(json.loads(body)['p_on'])
                return ok(state['debug'])
            if fn == 'admin_delete_user':
                state['deleted'].add(json.loads(body)['target_user'])
                return ok(None, 204) if False else route.fulfill(status=204, headers=CORS)
            return ok(None)
        if '/rest/v1/profiles' in url and 'debug_mode' in url:
            if cfg.get('noColumn'):
                return ok({'message': 'column profiles.debug_mode does not exist'}, 400)
            return ok({'debug_mode': state['debug']})
        return ok([])  # всё остальное (шапка, прочие таблицы) — пустой список
    return handler


def run_case(browser, cfg, steps):
    state = {'debug': bool(cfg.get('debug')), 'deleted': set()}
    calls = []
    ctx = browser.new_context(viewport={'width': 900, 'height': 800}, service_workers='block')
    page = ctx.new_page()
    page.route('**/*.supabase.co/**', make_handler(cfg, calls, state))
    page.add_init_script("localStorage.setItem('site_lang','ru'); localStorage.setItem('sb-%s-auth-token', %s);" % (REF, json.dumps(json.dumps(SESSION))))
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:%d/admin/' % PORT)
    try:
        page.wait_for_selector('[data-test="users-table"], [data-test="admin-no-access"]', timeout=7000)
    except Exception:
        errors.append('страница админки не отрисовалась')
    page.wait_for_timeout(500)
    res = steps(page, calls)
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

            def on_off(page, calls):
                box = page.locator('#debug-mode-toggle')
                out = {'visible': box.count() == 1, 'start': box.is_checked(), 'table': page.locator('[data-test="users-table"]').count() == 1}
                box.click(); page.wait_for_timeout(400)
                out['after_on'] = box.is_checked()
                out['calls_on'] = [c for c in calls if c[0] == 'set_debug_mode']
                out['toast'] = page.locator('body').inner_text()
                box.click(); page.wait_for_timeout(400)
                out['after_off'] = box.is_checked()
                out['calls_all'] = [c[1]['p_on'] for c in calls if c[0] == 'set_debug_mode']
                return out
            r, errs = run_case(br, {'debug': False}, on_off)
            check('карточка и переключатель есть, режим стартует выключенным, таблица пользователей на месте', r['visible'] and not r['start'] and r['table'])
            check('клик включает: rpc set_debug_mode(p_on=true), галочка стоит', r['after_on'] and r['calls_on'] == [['set_debug_mode', {'p_on': True}]])
            check('тост «Режим отладки включён»', 'Режим отладки включён' in r['toast'])
            check('повторный клик выключает: rpc p_on=false, галочка снята', (not r['after_off']) and r['calls_all'] == [True, False])
            check('JS-ошибок на странице нет', errs == [])

            r, errs = run_case(br, {'debug': True}, lambda pg, c: pg.locator('#debug-mode-toggle').is_checked())
            check('если режим уже включён на сервере — галочка стоит при загрузке', r is True)

            def fail_case(page, calls):
                box = page.locator('#debug-mode-toggle'); box.click(); page.wait_for_timeout(400)
                return {'checked': box.is_checked(), 'enabled': box.is_enabled(), 'toast': page.locator('body').inner_text()}
            r, errs = run_case(br, {'rpcFails': True}, fail_case)
            check('ошибка сервера: галочка откатывается и снова доступна, тост ошибки без сырого текста', (not r['checked']) and r['enabled'] and 'Не удалось изменить режим отладки' in r['toast'] and 'boom' not in r['toast'])

            r, errs = run_case(br, {'noColumn': True}, lambda pg, c: {'card': pg.locator('#debug-mode-toggle').count(), 'table': pg.locator('[data-test="users-table"]').count()})
            check('миграция 066 не применена (нет колонки): карточки нет, таблица пользователей работает', r['card'] == 0 and r['table'] == 1)
            check('...и без JS-ошибок', errs == [])

            def not_admin(page, calls):
                return {'card': page.locator('#debug-mode-toggle').count(), 'table': page.locator('[data-test="users-table"]').count(),
                        'text': page.locator('[data-test="admin-no-access"]').inner_text() if page.locator('[data-test="admin-no-access"]').count() else '',
                        'code': page.locator('[data-test="admin-no-access"] code').count()}
            r, errs = run_case(br, {'notAdmin': True}, not_admin)
            check('не админ: ни карточки, ни таблицы', r['card'] == 0 and r['table'] == 0)
            check('...карточка «нет доступа» с подсказкой про is_admin и без сырого текста ошибки', 'Нет доступа' in r['text'] and r['code'] == 1 and 'forbidden' not in r['text'])

            def table_case(page, calls):
                rows = page.locator('[data-test="users-table"] tbody tr')
                me, vasya = page.locator('[data-test="user-row-adm"]'), page.locator('[data-test="user-row-u2"]')
                return {'n': rows.count(), 'me_mark': me.locator('[data-test="self-mark"]').count(), 'me_del': me.locator('button').count(),
                        'me_admin_icon': me.locator('td').nth(2).locator('svg').count(), 'v_admin_icon': vasya.locator('td').nth(2).locator('svg').count(),
                        'v_date': vasya.locator('td').nth(3).inner_text(), 'v_del': vasya.locator('[data-test="delete-u2"]').count()}
            r, errs = run_case(br, {}, table_case)
            check('таблица: 2 пользователя, у себя «(это ты)» и нет кнопки удаления, значок админа только у админа, дата 01.02.2026, у Васи есть «Удалить»',
                  r['n'] == 2 and r['me_mark'] == 1 and r['me_del'] == 0 and r['me_admin_icon'] == 1 and r['v_admin_icon'] == 0 and r['v_date'] == '01.02.2026' and r['v_del'] == 1)

            def delete_case(page, calls):
                page.locator('[data-test="delete-u2"]').click(); page.wait_for_timeout(300)
                dlg = page.locator('[data-test="confirm-dialog-text"]').inner_text() if page.locator('[data-test="confirm-dialog-text"]').count() else ''
                page.locator('[data-test="confirm-dialog-ok"]').click(); page.wait_for_timeout(700)
                return {'dlg': dlg, 'calls': [c for c in calls if c[0] == 'admin_delete_user'], 'rows': page.locator('[data-test="users-table"] tbody tr').count(), 'body': page.locator('body').inner_text()}
            r, errs = run_case(br, {}, delete_case)
            check('удаление: окно подтверждения с именем, «ОК» → rpc admin_delete_user(target_user=u2), строка исчезла, тост «Пользователь удалён»',
                  'Вася' in r['dlg'] and r['calls'] == [['admin_delete_user', {'target_user': 'u2'}]] and r['rows'] == 1 and 'Пользователь удалён' in r['body'])
            check('...без JS-ошибок', errs == [])

            def cancel_case(page, calls):
                page.locator('[data-test="delete-u2"]').click(); page.wait_for_timeout(300)
                page.locator('[data-test="confirm-dialog-cancel"]').click(); page.wait_for_timeout(400)
                return {'calls': [c for c in calls if c[0] == 'admin_delete_user'], 'rows': page.locator('[data-test="users-table"] tbody tr').count()}
            r, errs = run_case(br, {}, cancel_case)
            check('«Отмена» в подтверждении: ничего не удаляется', r['calls'] == [] and r['rows'] == 2)
            br.close()
    finally:
        srv.terminate()
    print('\nИТОГО: %s' % ('всё OK' if not fails else 'ПРОБЛЕМ: %d' % len(fails)))
    sys.exit(1 if fails else 0)

main()
