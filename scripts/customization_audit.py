#!/usr/bin/env python3
"""Проверка «Кастомизации» как продукта в настоящем браузере (BACKLOG 72.x): собранная страница /customization/ в Chromium, Supabase подменён перехватом запросов.
Запуск: python3 scripts/customization_audit.py [каталог_скриншотов]  (сначала: cd web-customization && npm run build; нужен playwright, Chromium /opt/google/chrome/chrome).
Берёт измерение вёрстки и доступности из scripts/shop_audit.py (горизонтальная прокрутка, элементы за краем экрана, кнопки без имени, img без alt, поля без подписи,
ошибки консоли, цели нажатия — телефон 32 px / ПК 24 px, контраст текста по цветовым парам) и прогоняет его по Кастомизации:
два состояния («по умолчанию» и «показать все» предметы) × телефон 390 и ПК 1280 × светлая и тёмная тема. Замечания контраста — отдельным разделом (STRICT_CONTRAST=1 делает их отказом).
Скриншоты — в каталог (по умолчанию /tmp/custaudit)."""
import json, os, re, subprocess, sys, time
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shop_audit as sa
import shop_keyboard_check as skc
from playwright.sync_api import sync_playwright

PORT = 5196
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/custaudit'


def handler_for(rich):
    """rich=False — пустой профиль; rich=True — человек с данными: баллов 180 (хватает на дешёвые и средние рамки, на дорогие — нет), надета купленная рамка frame_neon,
    открыта за достижение frame_gold (достижение streak_30), остальные достижения закрыты — на странице есть все статусы: надето, открыто, можно купить, не хватает, закрыто."""
    def handler(route):
        req = route.request
        url = req.url
        if req.method == 'OPTIONS':
            return route.fulfill(status=204, headers=sa.CORS)
        single = 'vnd.pgrst.object' in (req.headers.get('accept') or '')
        def ok(d): route.fulfill(status=200, headers={**sa.CORS, 'content-type': 'application/json', 'content-range': '0-0/*'}, body=json.dumps(d))
        if req.method in ('POST', 'PATCH', 'PUT', 'DELETE') and '/rpc/' not in url:
            return ok([])
        if '/rest/v1/rpc/get_leaderboard' in url:
            return ok([{'user_id': 'u1', 'total_points': 180 if rich else 120}])
        if '/rest/v1/rpc/sync_streak_sparks' in url:
            return ok([{'earned': 120, 'spent': 25, 'balance': 95}])
        if '/rest/v1/rpc/' in url:
            return ok(None)
        if '/rest/v1/profiles' in url:
            if 'customization' in url:
                return ok({'customization': {'avatar_frame': 'frame_neon'} if rich else {}} if single else [])
            return ok({'onboarded': True, 'debug_mode': False} if single else [{'onboarded': True}])
        if rich and '/rest/v1/user_customizations' in url:
            return ok([{'item_key': 'frame_neon', 'source': 'points', 'unlocked_at': '2026-10-01T10:00:00Z'}, {'item_key': 'frame_gold', 'source': 'achievement', 'unlocked_at': '2026-10-05T10:00:00Z'}])
        if rich and '/rest/v1/user_achievements' in url:
            return ok([{'key': 'streak_30'}])
        return ok(None if single else [])
    return handler


handler = handler_for(False)  # совместимость: прежнее имя (его берёт shop_keyboard_check-подобный код)


def keyboard_sweep():
    out = []
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT + 1), '--bind', '127.0.0.1'], cwd=sa.ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path='/opt/google/chrome/chrome', args=['--no-sandbox'])
            ctx = br.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
            page = ctx.new_page()
            page.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
            page.route('**/*.supabase.co/**', handler_for(True))
            page.add_init_script("localStorage.setItem('site_lang','ru');localStorage.setItem('site_theme','light');localStorage.setItem('welcome_tour_seen','1');localStorage.setItem('page_hint_seen_customization','1');localStorage.setItem('sb-%s-auth-token', %s);" % (sa.REF, json.dumps(json.dumps(sa.SESSION))))
            page.goto('http://127.0.0.1:%d/customization/' % (PORT + 1))
            page.wait_for_selector('[data-testid="slot-cell-themes"]', timeout=10000)
            sa.wait_ready(page)
            page.evaluate('document.activeElement && document.activeElement.blur()')
            seen, stops, no_focus, looped = set(), [], [], False
            for _ in range(260):
                page.keyboard.press('Tab')
                a = page.evaluate(skc.ACTIVE)
                if a is None:
                    continue
                if a['key'] in seen:
                    looped = True
                    break
                seen.add(a['key']); stops.append(a['key'])
                if not a['visibleFocus']: no_focus.append(a['desc'])
            out.append((looped, 'K1 обход Tab проходит всю страницу и возвращается к началу', '%d остановок' % len(stops)))
            out.append((not no_focus, 'K2 у каждой остановки виден фокус', '; '.join(no_focus[:6]) + (' …+%d' % (len(no_focus) - 6) if len(no_focus) > 6 else '')))
            missed = [i['desc'] for i in page.evaluate(skc.INTERACTIVE) if i['key'] not in seen]
            out.append((not missed, 'K3 все видимые интерактивные элементы достижимы Tab', '; '.join(missed[:6]) + (' …+%d' % (len(missed) - 6) if len(missed) > 6 else '')))
            br.close()
    finally:
        srv.terminate()
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=sa.ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    report = []
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path='/opt/google/chrome/chrome', args=['--no-sandbox'])
            for mode in ('empty', 'rich'):
              for state in ('default', 'show-all'):
                for vp, (w, h) in {'phone': (390, 844), 'desktop': (1280, 800)}.items():
                    for theme in ('light', 'dark'):
                        ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=(vp == 'phone'), service_workers='block')
                        page = ctx.new_page()
                        page.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
                        page.route('**/*.supabase.co/**', handler_for(mode == 'rich'))
                        page.add_init_script("localStorage.setItem('site_lang','ru');localStorage.setItem('site_theme','%s');localStorage.setItem('welcome_tour_seen','1');localStorage.setItem('page_hint_seen_customization','1');localStorage.setItem('sb-%s-auth-token', %s);" % (theme, sa.REF, json.dumps(json.dumps(sa.SESSION))))
                        errs = []
                        page.on('pageerror', lambda e: errs.append('PAGE ' + str(e)[:120]))
                        page.on('console', lambda m: errs.append('CONSOLE ' + m.text[:120]) if m.type == 'error' and 'ERR_FAILED' not in m.text and 'Failed to load resource' not in m.text else None)
                        page.goto('http://127.0.0.1:%d/customization/' % PORT)
                        try:
                            page.wait_for_selector('[data-testid="slot-cell-themes"]', timeout=10000)
                        except Exception:
                            errs.append('страница не отрисовалась')
                        sa.wait_ready(page)
                        if mode == 'rich':  # самопроверка мока: данные должны дойти до страницы, иначе прогон «с данными» ничего не проверяет
                            bal = page.locator('[data-testid="balance"]').first.inner_text() if page.locator('[data-testid="balance"]').count() else ''
                            if '180' not in bal:
                                errs.append('мок с данными не применился (баланс: %r)' % bal[:30])
                        if state == 'show-all':
                            btn = page.locator('[data-testid="slot-show-all"]')
                            if btn.count():
                                btn.first.click()
                                page.wait_for_timeout(500)
                            else:
                                errs.append('нет кнопки «показать все»')
                        page.evaluate('window.__touch = %s' % ('true' if vp == 'phone' else 'false'))
                        res = page.evaluate(sa.JS)
                        res['errors'] = errs
                        res['id'] = '%s-%s-%s-%s' % (mode, state, vp, theme)
                        res['cards'] = page.locator('button:visible').count()
                        page.screenshot(path=os.path.join(OUT, res['id'] + '.png'), full_page=True)
                        report.append(res)
                        ctx.close()
            br.close()
    finally:
        srv.terminate()
    bad = 0
    for r in report:
        probs = []
        if r['hscroll']: probs.append('горизонтальная прокрутка страницы')
        for k, label in (('overflow', 'за краем экрана'), ('small', 'цель нажатия мельче порога (32 телефон / 24 ПК)'), ('noName', 'кнопка без имени'), ('noAlt', 'img без alt'), ('noLabel', 'поле без подписи'), ('errors', 'ошибки')):
            if r[k]: probs.append('%s: %s' % (label, '; '.join(r[k][:4]) + (' …+%d' % (len(r[k]) - 4) if len(r[k]) > 4 else '')))
        warn = ('; предупреждений (цель < 44 px): %d' % len(r['warn'])) if r['warn'] else ''
        print(('FAIL ' if probs else 'OK   ') + r['id'] + ' (видимых кнопок: %d)%s' % (r['cards'], warn))
        for pr in probs: print('       - ' + pr)
        bad += 1 if probs else 0
    bad_runs = bad
    # Клавиатура (ПК, светлая тема, состояние «по умолчанию»): обход Tab — не застревает, фокус виден, всё достижимо
    kb = keyboard_sweep()
    for ok, name, detail in kb:
        print(('PASS ' if ok else 'FAIL ') + name + ((' — ' + detail) if detail else ''))
        bad += 0 if ok else 1
    pairs = defaultdict(set)
    for r in report:
        for c in r['contrast']:
            m = re.match(r'(.*) ([\d.]+):1 \(нужно ([\d.]+), (rgb\([^)]*\)) на (rgb\([^)]*\))\)', c)
            if m: pairs[(m.group(4), m.group(5), m.group(2), m.group(3))].add(m.group(1))
    if pairs:
        print('\nКОНТРАСТ ниже WCAG AA (по цветовым парам; замечания, не отказ без STRICT_CONTRAST=1):')
        for (fg, bg, ratio, need), els in sorted(pairs.items(), key=lambda kv: float(kv[0][2])):
            print('  %s:1 (нужно %s) %s на %s — %d эл., например: %s' % (ratio, need, fg, bg, len(els), '; '.join(sorted(els)[:3])))
    if os.environ.get('STRICT_CONTRAST') == '1' and pairs:
        bad += 1
    print('\nИТОГО: %s' % ('всё OK' if not bad else 'ПРОБЛЕМ: %d (прогонов вёрстки с замечаниями: %d из %d, клавиатурных: %d)' % (bad, bad_runs, len(report), bad - bad_runs - (1 if (os.environ.get('STRICT_CONTRAST') == '1' and pairs) else 0))))
    print('скриншоты:', OUT)
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), ensure_ascii=False, indent=1)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
