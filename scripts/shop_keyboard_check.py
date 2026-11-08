#!/usr/bin/env python3
"""Клавиатурная проверка магазина в настоящем браузере (BACKLOG 72.5): собранная страница /shop/ в Chromium, Supabase подменён (мок из scripts/shop_audit.py).
Запуск: python3 scripts/shop_keyboard_check.py  (сначала: cd web-shop && npm run build; нужен playwright, Chromium /opt/google/chrome/chrome).
Сценарии (ПК 1280, светлая тема, вид «Витрина»):
  A. обход Tab по странице: у каждой остановки виден фокус (контур или тень), обход не застревает, интерактивные элементы достижимы;
  B. форма «Добавить товар»: открывается с клавиатуры, фокус внутри, у окна роль диалога и название, у полей есть подписи, Tab не уходит за окно, Esc закрывает, фокус возвращается на кнопку;
  C. подсказка-идея («ⓘ»): Enter открывает, фокус внутри, Esc закрывает, фокус возвращается;
  D. покупка с клавиатуры: Enter на «Купить» отправляет покупку;
  E. удаление: Enter на корзине открывает подтверждение, фокус на «Отмене», Esc закрывает, фокус возвращается на корзину.
Выводит PASS/FAIL по каждой проверке, код возврата 1 при любом FAIL. Это проверка клавиатуры и фокуса, не скринридера: как читает вслух — вживую не проверяется."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shop_audit as sa
from playwright.sync_api import sync_playwright

PORT = 5193
results = []


def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + ((' — ' + detail) if detail else ''))


ACTIVE = r"""() => {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const cs = getComputedStyle(el)
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
  const shadow = cs.boxShadow !== 'none'
  const label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 28)
  if (!el.hasAttribute('data-kbid')) { window.__kb = (window.__kb || 0) + 1; el.setAttribute('data-kbid', String(window.__kb)) } // уникальный ключ: одинаковые подписи («Купить») — разные остановки
  return { key: el.getAttribute('data-kbid'), desc: el.tagName.toLowerCase() + (el.getAttribute('data-testid') ? '[' + el.getAttribute('data-testid') + ']' : '') + ' «' + label + '»', visibleFocus: outline || shadow }
}"""

INTERACTIVE = r"""() => {
  // видим по-настоящему: размер, visibility/opacity и не обрезан скрытым (overflow) контейнером — пункты свёрнутого меню в счёт не идут
  const shown = (el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
    if (!(r.width > 0 && r.height > 0) || s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false
    let box = { l: r.left, t: r.top, r: r.right, b: r.bottom }
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ps = getComputedStyle(p)
      if (ps.display === 'none' || ps.visibility === 'hidden') return false
      if (/(hidden|clip)/.test(ps.overflowX + ps.overflowY)) { const pr = p.getBoundingClientRect(); box = { l: Math.max(box.l, pr.left), t: Math.max(box.t, pr.top), r: Math.min(box.r, pr.right), b: Math.min(box.b, pr.bottom) }; if (box.r - box.l <= 0 || box.b - box.t <= 0) return false }
    }
    return true
  }
  return [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [tabindex]')]
    .filter((el) => shown(el) && !el.disabled && el.getAttribute('tabindex') !== '-1' && !el.closest('[aria-hidden=true]'))
    .map((el) => { if (!el.hasAttribute('data-kbid')) { window.__kb = (window.__kb || 0) + 1; el.setAttribute('data-kbid', String(window.__kb)) } return { key: el.getAttribute('data-kbid'), desc: el.tagName.toLowerCase() + (el.getAttribute('data-testid') ? '[' + el.getAttribute('data-testid') + ']' : '') + ' «' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28) + '»' } })
}"""

IN_DIALOG = r"""(sel) => { const d = document.querySelector(sel); const a = document.activeElement; return !!(d && a && d.contains(a)) }"""


def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=sa.ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path='/opt/google/chrome/chrome', args=['--no-sandbox'])
            ctx = br.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
            page = ctx.new_page()
            page.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
            page.route('**/*.supabase.co/**', sa.handler)
            page.add_init_script("localStorage.setItem('site_lang','ru');localStorage.setItem('site_theme','light');localStorage.setItem('shop_view','grid');localStorage.setItem('shop_idea_seen','1');localStorage.setItem('welcome_tour_seen','1');localStorage.setItem('page_hint_seen_shop','1');localStorage.setItem('sb-%s-auth-token', %s);" % (sa.REF, json.dumps(json.dumps(sa.SESSION))))
            patches = []
            page.on('request', lambda r: patches.append(r.post_data or '') if r.method == 'PATCH' and 'shop_items' in r.url else None)
            page.goto('http://127.0.0.1:%d/shop/' % PORT)
            page.wait_for_selector('text=Сверхдлинное', timeout=10000)
            page.wait_for_timeout(500)

            # A. обход Tab
            page.evaluate('document.activeElement && document.activeElement.blur()')
            stops, seen, no_focus = [], set(), []
            looped = False
            for _ in range(200):
                page.keyboard.press('Tab')
                a = page.evaluate(ACTIVE)
                if a is None:
                    continue
                if a['key'] in seen:
                    looped = True
                    break
                seen.add(a['key']); stops.append(a['key'])
                if not a['visibleFocus']: no_focus.append(a['desc'])
            check('A1 обход Tab проходит всю страницу и возвращается к началу (не застревает)', looped, '%d остановок, вернулся к началу: %s' % (len(stops), 'да' if looped else 'нет'))
            check('A2 у каждой остановки виден фокус (контур или тень)', not no_focus, '; '.join(no_focus[:6]) + (' …+%d' % (len(no_focus) - 6) if len(no_focus) > 6 else ''))
            inter = page.evaluate(INTERACTIVE)
            missed = [i['desc'] for i in inter if i['key'] not in seen]
            check('A3 все видимые интерактивные элементы достижимы Tab', not missed, '; '.join(missed[:6]) + (' …+%d' % (len(missed) - 6) if len(missed) > 6 else ''))

            # B. форма «Добавить товар»
            page.evaluate('document.activeElement && document.activeElement.blur()')
            page.focus('[data-testid="add-item"]')
            page.keyboard.press('Enter')
            page.wait_for_timeout(400)
            opened = page.locator('.modal').count() > 0
            check('B1 форма открывается с клавиатуры (Enter на «Добавить товар»)', opened)
            if opened:
                check('B2 фокус после открытия внутри окна', page.evaluate(IN_DIALOG, '.modal'))
                check('B3 у окна есть роль диалога и aria-modal', page.evaluate("() => { const m = document.querySelector('.modal'); const d = m.closest('[role=dialog]') || m.querySelector('[role=dialog]') || (m.getAttribute('role') === 'dialog' ? m : null); return !!d && d.getAttribute('aria-modal') === 'true' }"))
                check('B4 у окна есть доступное название (aria-label / aria-labelledby)', page.evaluate("() => { const m = document.querySelector('.modal'); const d = m.closest('[role=dialog]') || m.querySelector('[role=dialog]') || (m.getAttribute('role') === 'dialog' ? m : null); return !!d && !!(d.getAttribute('aria-label') || d.getAttribute('aria-labelledby')) }"))
                unl = page.evaluate("""() => [...document.querySelectorAll('.modal input:not([type=hidden]), .modal select, .modal textarea')].filter((el) => { const id = el.id; return !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (id && document.querySelector('label[for="' + id + '"]')) || el.closest('label')) }).map((el) => el.tagName.toLowerCase() + (el.getAttribute('data-testid') ? '[' + el.getAttribute('data-testid') + ']' : '') + (el.getAttribute('placeholder') ? ' (placeholder ' + el.getAttribute('placeholder') + ')' : ''))""")
                check('B5 у всех полей формы есть связанная подпись', not unl, '; '.join(unl[:6]))
                escaped = False
                for _ in range(40):
                    page.keyboard.press('Tab')
                    if not page.evaluate(IN_DIALOG, '.modal'):
                        escaped = True
                        break
                check('B6 Tab не уходит за пределы открытого окна (ловушка фокуса)', not escaped)
                page.keyboard.press('Escape')
                page.wait_for_timeout(300)
                closed = page.locator('.modal').count() == 0
                check('B7 Esc закрывает форму', closed)
                if closed:
                    check('B8 после закрытия фокус вернулся на «Добавить товар»', page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-testid') === 'add-item'"))
                else:
                    page.evaluate("() => document.querySelector('.modal button.secondary, .modal [data-testid=cancel]')?.click()")
                    page.wait_for_timeout(300)

            # C. подсказка-идея
            page.evaluate('document.activeElement && document.activeElement.blur()')
            if page.locator('[data-testid="idea-info"]').count():
                page.focus('[data-testid="idea-info"]')
                page.keyboard.press('Enter')
                page.wait_for_timeout(300)
                co = page.locator('[data-testid="idea-modal"]').count() > 0
                check('C1 подсказка-идея открывается с клавиатуры', co)
                if co:
                    check('C2 фокус внутри окна подсказки', page.evaluate(IN_DIALOG, '[data-testid="idea-modal"]'))
                    page.keyboard.press('Escape')
                    page.wait_for_timeout(300)
                    cc = page.locator('[data-testid="idea-modal"]').count() == 0
                    check('C3 Esc закрывает подсказку', cc)
                    if cc:
                        check('C4 после закрытия фокус вернулся на «ⓘ»', page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-testid') === 'idea-info'"))
                    else:
                        page.evaluate("() => document.querySelector('[data-testid=idea-modal] button')?.click()")
                        page.wait_for_timeout(300)

            # D. покупка с клавиатуры
            page.evaluate('document.activeElement && document.activeElement.blur()')
            buy = page.locator('[data-testid="grid-view"] button:has-text("Купить")').first
            buy.focus()
            before = len(patches)
            page.keyboard.press('Enter')
            page.wait_for_timeout(600)
            check('D1 Enter на «Купить» отправляет покупку', len(patches) > before and any('"redeemed":true' in x.replace(' ', '') for x in patches[before:]))

            # E. удаление
            page.reload()
            page.wait_for_selector('text=Сверхдлинное', timeout=10000)
            page.wait_for_timeout(400)
            dels = page.locator('[data-testid="delete-btn"]')
            if dels.count():
                d0 = dels.first
                d0.focus()
                page.keyboard.press('Enter')
                page.wait_for_timeout(400)
                dlg = page.locator('[data-test="confirm-dialog"]').count() > 0
                check('E1 Enter на корзине открывает подтверждение', dlg)
                if dlg:
                    check('E2 фокус на «Отмене», а не на «Удалить»', page.evaluate("() => { const a = document.activeElement; return !!a && /Отмена|Cancel/.test(a.textContent || '') }"))
                    page.keyboard.press('Escape')
                    page.wait_for_timeout(300)
                    check('E3 Esc закрывает подтверждение', page.locator('[data-test="confirm-dialog"]').count() == 0)
                    check('E4 после закрытия фокус вернулся на корзину', page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-testid') === 'delete-btn'"))
            br.close()
    finally:
        srv.terminate()
    bad = [r for r in results if not r[0]]
    print('\nИТОГО: %s' % ('всё OK (%d проверок)' % len(results) if not bad else 'FAIL: %d из %d' % (len(bad), len(results))))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
