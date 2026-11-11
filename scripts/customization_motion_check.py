#!/usr/bin/env python3
"""Проверка движения в «Кастомизации» в настоящем браузере (BACKLOG 72.4): собранная страница /customization/ в Chromium, Supabase подменён (мок «с данными» из scripts/customization_audit.py).
Запуск: python3 scripts/customization_motion_check.py  (сначала: cd web-customization && npm run build; нужен playwright, Chromium /opt/google/chrome/chrome).
Страница «всё одним списком» (все предметы разом: рамки с живыми эффектами, вода, огонь и т.д.) в трёх режимах — обычный, системное «уменьшить движение»
(prefers-reduced-motion: reduce) и сайтовое «Отключить все анимации» (localStorage site_motion=off → <html data-motion="off">). В каждом режиме считаются ВСЕ запущенные
CSSAnimation из document.getAnimations() (без списка имён — любая забытая анимация будет поймана): на покоящейся странице, после прокрутки до конца списка
(чтобы отрисовались все карточки) и после действия (клик по первой доступной кнопке «Купить»/«Надеть»/«Применить»).
Обычный режим нужен как контроль: анимации ЕСТЬ, иначе проверки остальных режимов ничего бы не значили. Выводит PASS/FAIL, код возврата 1 при любом FAIL."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shop_audit as sa
import customization_audit as ca
from playwright.sync_api import sync_playwright

PORT = 5198
results = []


def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + ((' — ' + detail) if detail else ''))


RUNNING = """() => document.getAnimations().filter((a) => a.constructor.name === 'CSSAnimation' && a.playState === 'running').map((a) => ({ name: a.animationName, infinite: !!(a.effect && a.effect.getComputedTiming().iterations === Infinity) }))"""


def summarize(items):
    names = {}
    for a in items:
        names.setdefault(a['name'], 0)
        names[a['name']] += 1
    return names


def fmt(names, limit=6):
    parts = ['%s×%d' % (k, v) for k, v in sorted(names.items(), key=lambda kv: -kv[1])]
    return ', '.join(parts[:limit]) + (' …+%d' % (len(parts) - limit) if len(parts) > limit else '')


def run_mode(br, label, reduced, motion_off):
    ctx = br.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block', reduced_motion='reduce' if reduced else 'no-preference')
    page = ctx.new_page()
    page.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
    page.route('**/*.supabase.co/**', ca.handler_for(True))
    init = "localStorage.setItem('site_lang','ru');localStorage.setItem('site_theme','light');localStorage.setItem('welcome_tour_seen','1');localStorage.setItem('page_hint_seen_customization','1');localStorage.setItem('sb-%s-auth-token', %s);" % (sa.REF, json.dumps(json.dumps(sa.SESSION)))
    if motion_off:
        init += "localStorage.setItem('site_motion','off');"
    page.add_init_script(init)
    page.goto('http://127.0.0.1:%d/customization/' % PORT)
    page.wait_for_selector('[data-testid="slot-cell-themes"]', timeout=10000)
    sa.wait_ready(page)
    html_motion = page.evaluate("() => document.documentElement.getAttribute('data-motion')")
    idle = summarize(page.evaluate(RUNNING))
    page.locator('[data-testid="slot-show-all"]').first.click()
    page.wait_for_timeout(500)
    # прокрутка до конца списка, чтобы отрисовались и «ожили» все карточки
    h = page.evaluate('document.documentElement.scrollHeight')
    y = 0
    while y < h:
        page.evaluate('window.scrollTo(0, %d)' % y)
        page.wait_for_timeout(60)
        y += 700
        h = page.evaluate('document.documentElement.scrollHeight')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)
    all_list = summarize(page.evaluate(RUNNING))
    # действия по очереди: «Применить» (выбор предмета), «Купить», «Надеть» — каждое, если такая кнопка есть; после каждого считаем запущенные анимации
    actions = []
    for rx in ('Применить', 'Купить', 'Надеть'):
        clicked = page.evaluate("""(rx) => { const re = new RegExp(rx); const b = [...document.querySelectorAll('button')].find((x) => !x.disabled && re.test(x.textContent || '') && x.getBoundingClientRect().width > 0); if (!b) return null; const t = (b.textContent || '').trim().slice(0, 30); b.scrollIntoView({ block: 'center' }); b.click(); return t }""", rx)
        page.wait_for_timeout(150)
        actions.append({'rx': rx, 'clicked': clicked, 'after': summarize(page.evaluate(RUNNING))})
    # диалог подтверждения покупки (если открылся) закрываем Esc, чтобы не мешал
    page.keyboard.press('Escape')
    ctx.close()
    return {'label': label, 'html_motion': html_motion, 'idle': idle, 'all_list': all_list, 'actions': actions}


def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=sa.ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path='/opt/google/chrome/chrome', args=['--no-sandbox'])
            normal = run_mode(br, 'обычный', False, False)
            reduced = run_mode(br, 'уменьшить движение', True, False)
            off = run_mode(br, 'отключить все анимации', False, True)
            br.close()
    finally:
        srv.terminate()
    check('C1 обычный режим: в списке всех предметов бегут анимации (проверка осмысленна)', sum(normal['all_list'].values()) > 0, fmt(normal['all_list']))
    found = [a['rx'] for a in normal['actions'] if a['clicked']]
    check('C2 обычный режим: нашлись и нажались кнопки действий', len(found) >= 2, ', '.join('%s → «%s»' % (a['rx'], a['clicked']) for a in normal['actions'] if a['clicked']) or 'ни одной')
    check('R1 «уменьшить движение»: на покоящейся странице нет анимаций', not reduced['idle'], fmt(reduced['idle']))
    check('R2 «уменьшить движение»: в списке всех предметов нет анимаций', not reduced['all_list'], fmt(reduced['all_list']))
    for a in reduced['actions']:
        if a['rx'] in found:
            check('R3 «уменьшить движение»: после «%s» нет анимаций' % a['rx'], a['clicked'] is not None and not a['after'], '%s | нажато: %s' % (fmt(a['after']), a['clicked']))
    check('O1 «отключить все анимации»: на <html> стоит data-motion="off"', off['html_motion'] == 'off', str(off['html_motion']))
    check('O2 «отключить все анимации»: на покоящейся странице нет анимаций', not off['idle'], fmt(off['idle']))
    check('O3 «отключить все анимации»: в списке всех предметов нет анимаций', not off['all_list'], fmt(off['all_list']))
    for a in off['actions']:
        if a['rx'] in found:
            check('O4 «отключить все анимации»: после «%s» нет анимаций' % a['rx'], a['clicked'] is not None and not a['after'], '%s | нажато: %s' % (fmt(a['after']), a['clicked']))
    print('\nсправка (обычный режим): покой — %s; список — %s' % (fmt(normal['idle'], 4) or 'нет', fmt(normal['all_list'], 4)))
    bad = [r for r in results if not r[0]]
    print('ИТОГО: %s' % ('всё OK (%d проверок)' % len(results) if not bad else 'FAIL: %d из %d' % (len(bad), len(results))))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
