#!/usr/bin/env python3
"""Проверка движения в магазине в настоящем браузере (BACKLOG 72.4): собранная страница /shop/ в Chromium, Supabase подменён (мок из scripts/shop_audit.py).
Запуск: python3 scripts/shop_motion_check.py  (сначала: cd web-shop && npm run build; нужен playwright, Chromium /opt/google/chrome/chrome).
Три режима (ПК 1280, светлая тема, вид «Витрина»), в каждом — покоящаяся страница и покупка вещи (Enter на «Купить»):
  обычный        — анимации ЕСТЬ (иначе проверки двух остальных режимов ничего не значили бы): после покупки бегут «всплеск искр», «всплытие плашки»;
  уменьшить движение (prefers-reduced-motion: reduce в системе) — после покупки ни одной запущенной CSS-анимации сайта, всплеск скрыт, плашка «Куплено» при этом показана;
  «Отключить все анимации» (localStorage site_motion=off → <html data-motion="off">) — то же.
Считаются запущенные CSSAnimation из document.getAnimations() (имя анимации в списке «своих» ключевых кадров сайта) и бесконечные анимации на покоящейся странице.
Выводит PASS/FAIL по каждой проверке, код возврата 1 при любом FAIL."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shop_audit as sa
from playwright.sync_api import sync_playwright

PORT = 5194
results = []
SITE_ANIMS = ['bought-spark', 'balance-delta-rise', 'balance-tick', 'goal-pop', 'flame-flicker', 'flame-sway', 'flame-morph-out', 'flame-morph-core', 'spark-rise']


def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + ((' — ' + detail) if detail else ''))


RUNNING = """() => document.getAnimations().filter((a) => a.constructor.name === 'CSSAnimation' && a.playState === 'running').map((a) => ({ name: a.animationName, infinite: a.effect && a.effect.getComputedTiming().iterations === Infinity }))"""
BURST_VISIBLE = """() => { const b = document.querySelector('[data-testid="bought-burst"]'); if (!b) return null; if (getComputedStyle(b).display === 'none') return false; return [...b.querySelectorAll('i')].some((i) => { const s = getComputedStyle(i); return s.display !== 'none' && Number(s.opacity) > 0.01 }) }"""  # видны ли частицы всплеска глазами: контейнер не скрыт и у частицы есть непрозрачность


def run_mode(br, label, reduced, motion_off):
    ctx = br.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block', reduced_motion='reduce' if reduced else 'no-preference')
    page = ctx.new_page()
    page.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
    page.route('**/*.supabase.co/**', sa.handler)
    init = "localStorage.setItem('site_lang','ru');localStorage.setItem('site_theme','light');localStorage.setItem('shop_view','grid');localStorage.setItem('shop_idea_seen','1');localStorage.setItem('welcome_tour_seen','1');localStorage.setItem('page_hint_seen_shop','1');localStorage.setItem('sb-%s-auth-token', %s);" % (sa.REF, json.dumps(json.dumps(sa.SESSION)))
    if motion_off:
        init += "localStorage.setItem('site_motion','off');"
    page.add_init_script(init)
    page.goto('http://127.0.0.1:%d/shop/' % PORT)
    page.wait_for_selector('text=Сверхдлинное', timeout=10000)
    sa.wait_ready(page)
    idle = page.evaluate(RUNNING)
    idle_inf = [a['name'] for a in idle if a['infinite']]
    html_motion = page.evaluate("() => document.documentElement.getAttribute('data-motion')")
    buy = page.locator('[data-testid="grid-view"] button:has-text("Купить")').first
    buy.focus()
    page.keyboard.press('Enter')
    page.wait_for_selector('[data-testid="bought-toast"]', timeout=5000)
    page.wait_for_timeout(120)
    run = page.evaluate(RUNNING)
    names = sorted({a['name'] for a in run if a['name'] in SITE_ANIMS})
    burst = page.evaluate(BURST_VISIBLE)
    toast = page.locator('[data-testid="bought-toast"]').count() > 0
    ctx.close()
    return {'label': label, 'idle_inf': idle_inf, 'after_buy': names, 'burst': burst, 'toast': toast, 'html_motion': html_motion}


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
    check('M1 обычный режим: после покупки бегут анимации (проверка осмысленна)', len(normal['after_buy']) > 0, ', '.join(normal['after_buy']))
    check('M2 обычный режим: частицы всплеска видны (проверка осмысленна)', normal['burst'] is True)
    check('M3 «уменьшить движение»: после покупки нет запущенных анимаций сайта', not reduced['after_buy'], ', '.join(reduced['after_buy']))
    check('M4 «уменьшить движение»: частицы всплеска не видны, плашка «Куплено» показана', reduced['burst'] is False and reduced['toast'], 'burst=%s toast=%s' % (reduced['burst'], reduced['toast']))
    check('M5 «уменьшить движение»: на покоящейся странице нет бесконечных анимаций', not reduced['idle_inf'], ', '.join(reduced['idle_inf']))
    check('M6 «отключить все анимации»: на <html> стоит data-motion="off"', off['html_motion'] == 'off', str(off['html_motion']))
    check('M7 «отключить все анимации»: после покупки нет запущенных анимаций сайта', not off['after_buy'], ', '.join(off['after_buy']))
    check('M8 «отключить все анимации»: частицы всплеска не видны, плашка «Куплено» показана', off['burst'] is False and off['toast'], 'burst=%s toast=%s' % (off['burst'], off['toast']))
    check('M9 «отключить все анимации»: на покоящейся странице нет бесконечных анимаций', not off['idle_inf'], ', '.join(off['idle_inf']))
    print('\nсправка: в обычном режиме на покоящейся странице бесконечных анимаций: %d (%s)' % (len(normal['idle_inf']), ', '.join(sorted(set(normal['idle_inf'])))))
    bad = [r for r in results if not r[0]]
    print('ИТОГО: %s' % ('всё OK (%d проверок)' % len(results) if not bad else 'FAIL: %d из %d' % (len(bad), len(results))))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
