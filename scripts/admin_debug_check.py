#!/usr/bin/env python3
"""Проверка переключателя «Режим отладки» в админке (BACKLOG 47.4): admin.html в Chromium, Supabase подменён заглушкой (без сети и без входа).
Запуск: python3 scripts/admin_debug_check.py   (нужен playwright, Chromium: /opt/google/chrome/chrome). Печатает OK/FAIL, код возврата 1 при FAIL.
Сценарии: включение (rpc set_debug_mode p_on=true, тост, галочка), ошибка сервера (галочка откатывается, тост ошибки),
колонки нет (миграция 066 не применена: карточки нет, таблица пользователей есть), не админ (карточки нет)."""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 5188
STUB = """
window.__calls = [];
var delay = function () { return new Promise(function (r) { setTimeout(r, 120); }); }; // как сеть: i18n.js применяет подписи по DOMContentLoaded и иначе перезапишет готовый результат
window.supabase = { createClient: function () {
  var cfg = window.__cfg || {};
  var state = { debug: !!cfg.debug };
  return {
    auth: { getSession: async function () { await delay(); return { data: { session: { user: { id: 'adm', email: 'adm@x.com' } } } }; },
            onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }, signOut: async function () {} },
    rpc: async function (fn, args) {
      await delay();
      window.__calls.push([fn, args || null]);
      if (fn === 'admin_list_users') {
        if (cfg.notAdmin) return { data: null, error: { message: 'forbidden' } };
        return { data: [{ user_id: 'adm', email: 'adm@x.com', display_name: 'Админ', is_admin: true, created_at: '2026-01-01T00:00:00Z' },
                        { user_id: 'u2', email: 'u2@x.com', display_name: 'Вася', is_admin: false, created_at: '2026-02-01T00:00:00Z' }], error: null };
      }
      if (fn === 'set_debug_mode') {
        if (cfg.rpcFails) return { data: null, error: { message: 'boom' } };
        state.debug = !!args.p_on; return { data: state.debug, error: null };
      }
      return { data: null, error: null };
    },
    from: function (table) {
      var q = { select: function () { return q; }, eq: function () { return q; },
        maybeSingle: async function () {
          await delay();
          if (table === 'profiles' && cfg.noColumn) return { data: null, error: { message: 'column profiles.debug_mode does not exist' } };
          if (table === 'profiles') return { data: { debug_mode: state.debug }, error: null };
          return { data: null, error: null };
        },
        then: function (res) { res({ data: [], error: null }); } };
      return q;
    }
  };
} };
"""

def run_case(browser, name, cfg, steps):
    ctx = browser.new_context(viewport={'width': 900, 'height': 700}, service_workers='block')
    page = ctx.new_page()
    page.route('**/@supabase/supabase-js**', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    page.route('**/cdn.jsdelivr.net/**', lambda r: r.abort() if 'supabase' not in r.request.url else r.fulfill(body=STUB, content_type='application/javascript'))
    page.add_init_script('window.__cfg = %s;' % json.dumps(cfg))
    page.add_init_script("localStorage.setItem('site_lang','ru')")
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:%d/admin.html' % PORT)
    try:
        page.wait_for_selector('#admin-content table, #admin-content p.dim', timeout=5000)
    except Exception:
        errors.append('страница админки не отрисовалась (render упал или завис)')
    page.wait_for_timeout(600)
    res = steps(page)
    ctx.close()
    return name, res, errors

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

            def on_off(page):
                box = page.locator('#debug-mode-toggle')
                out = {'visible': box.count() == 1, 'start': box.is_checked(), 'table': page.locator('#admin-content table').count() == 1}
                box.click(); page.wait_for_timeout(300)
                out['after_on'] = box.is_checked()
                out['calls_on'] = [c for c in page.evaluate('window.__calls') if c[0] == 'set_debug_mode']
                out['toast'] = page.locator('body').inner_text()
                box.click(); page.wait_for_timeout(300)
                out['after_off'] = box.is_checked()
                out['calls_all'] = [c[1]['p_on'] for c in page.evaluate('window.__calls') if c[0] == 'set_debug_mode']
                return out
            n, r, errs = run_case(br, 'toggle', {'debug': False}, on_off)
            check('карточка и переключатель есть, режим стартует выключенным, таблица пользователей на месте', r['visible'] and not r['start'] and r['table'])
            check('клик включает: rpc set_debug_mode(p_on=true), галочка стоит', r['after_on'] and r['calls_on'] == [['set_debug_mode', {'p_on': True}]])
            check('тост «Режим отладки включён»', 'Режим отладки включён' in r['toast'])
            check('повторный клик выключает: rpc p_on=false, галочка снята', (not r['after_off']) and r['calls_all'] == [True, False])
            check('JS-ошибок на странице нет', errs == [])

            n, r, errs = run_case(br, 'already_on', {'debug': True}, lambda pg: pg.locator('#debug-mode-toggle').is_checked())
            check('если режим уже включён на сервере — галочка стоит при загрузке', r is True)

            def fail_case(page):
                box = page.locator('#debug-mode-toggle'); box.click(); page.wait_for_timeout(300)
                return {'checked': box.is_checked(), 'enabled': box.is_enabled(), 'toast': page.locator('body').inner_text()}
            n, r, errs = run_case(br, 'rpc_fails', {'rpcFails': True}, fail_case)
            check('ошибка сервера: галочка откатывается и снова доступна, тост ошибки без сырого текста', (not r['checked']) and r['enabled'] and 'Не удалось изменить режим отладки' in r['toast'] and 'boom' not in r['toast'])

            n, r, errs = run_case(br, 'no_column', {'noColumn': True}, lambda pg: {'card': pg.locator('#debug-mode-toggle').count(), 'table': pg.locator('#admin-content table').count()})
            check('миграция 066 не применена (нет колонки): карточки нет, таблица пользователей работает', r['card'] == 0 and r['table'] == 1)
            check('...и без JS-ошибок', errs == [])

            n, r, errs = run_case(br, 'not_admin', {'notAdmin': True}, lambda pg: {'card': pg.locator('#debug-mode-toggle').count(), 'table': pg.locator('#admin-content table').count()})
            check('не админ: ни карточки, ни таблицы', r['card'] == 0 and r['table'] == 0)
            br.close()
    finally:
        srv.terminate()
    print('\nИТОГО: %s' % ('всё OK' if not fails else 'ПРОБЛЕМ: %d' % len(fails)))
    sys.exit(1 if fails else 0)

main()
