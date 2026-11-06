#!/usr/bin/env python3
"""Проверка магазина как продукта в настоящем браузере (BACKLOG 72.5): собранная страница /shop/ в Chromium, Supabase подменён перехватом запросов.
Запуск: python3 scripts/shop_audit.py [каталог_для_скриншотов]  (сначала: cd web-shop && npm run build; нужен playwright, Chromium /opt/google/chrome/chrome).
Что смотрит: три вида магазина (Цель / Витрина / Список) × телефон 390 и ПК 1280 × светлая и тёмная тема, с данными (дорогая вещь, длинное название,
купленные, архив). Ищет: горизонтальную прокрутку страницы, элементы за краем экрана (вне горизонтальных контейнеров прокрутки), цели нажатия мельче порога (32 px на телефоне — критерий проекта, 24 px на ПК — WCAG 2.2 AA; мельче 44 на телефоне — «предупреждения»), кнопки/ссылки без доступного имени, картинки без alt, поля без подписи, ошибки консоли и страницы.
Это проверка вёрстки и доступности, не логики. Контраст текста (WCAG AA 4,5:1, крупный 3:1; с учётом прозрачности предков и opacity) выводится отдельным разделом по цветовым парам: общие цвета темы — замечания, STRICT_CONTRAST=1 делает их отказом. Пишет сводку в консоль, скриншоты — в каталог (по умолчанию /tmp/shopaudit)."""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 5191
REF = 'haxmgtflegsfpxieaydv'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shopaudit'
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
SESSION = {'access_token': 'a.b.c', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
           'user': {'id': 'u1', 'email': 'a@b.c', 'aud': 'authenticated', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-01-01T00:00:00Z'}}


def item(i, name, cost_sparks=None, cost=0, redeemed=False, date=None, archived=False):
    return {'id': i, 'user_id': 'u1', 'name': name, 'link': None, 'cost': cost, 'cost_sparks': cost_sparks, 'archived': archived, 'image_url': None, 'redeemed': redeemed, 'redeemed_date': date}


ITEMS = [
    item('a', 'Кофе', 8), item('b', 'Наушники', 150), item('c', 'Билеты в кино', 40),
    item('l', 'Сверхдлинное_название_вещи_без_пробелов_чтобы_проверить_перенос_текста_в_карточке', 90),
    item('r', 'Куплено раньше', 25, redeemed=True, date='2026-10-01'),
    item('o', 'Старая покупка за монеты', None, cost=120, redeemed=True, date='2026-09-01'),
    item('z', 'Старое желание в архиве', None, cost=200),
]


def handler(route):
    req = route.request
    if req.method == 'OPTIONS':
        return route.fulfill(status=204, headers=CORS)
    url = req.url
    single = 'vnd.pgrst.object' in (req.headers.get('accept') or '')
    def ok(data): route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json', 'content-range': '0-0/*'}, body=json.dumps(data))
    if '/rest/v1/rpc/sync_streak_sparks' in url: return ok([{'earned': 120, 'spent': 25, 'balance': 95}])
    if '/rest/v1/rpc/' in url: return ok(None)
    if '/rest/v1/profiles' in url: return ok({'onboarded': True, 'customization': {}, 'display_name': 'Тест'} if single else [{'onboarded': True}])
    if '/rest/v1/sparks_config' in url: return ok({'num': 10} if single else [{'num': 10}])
    if '/rest/v1/shop_items' in url: return ok(ITEMS)
    return ok(None if single else [])


JS = r"""
() => {
  const vw = window.innerWidth
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const inHScroll = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true } return false }
  const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim() || (el.querySelector('img[alt]')?.getAttribute('alt') || '')
  const desc = (el) => (el.tagName.toLowerCase() + (el.getAttribute('data-testid') ? '[' + el.getAttribute('data-testid') + ']' : '') + ' «' + (el.textContent || '').trim().slice(0, 30) + '»')
  const out = { hscroll: document.documentElement.scrollWidth > vw + 1, overflow: [], small: [], warn: [], noName: [], noAlt: [], noLabel: [] }
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 && !inHScroll(el) && el.children.length === 0) out.overflow.push(desc(el))
  }
  for (const el of document.querySelectorAll('button, a[href], [role=button], input:not([type=hidden]), select, textarea')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    if ((tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button')) {
      if (!name(el)) out.noName.push(desc(el))
      // порог отказа: телефон (касание) — 32 px, критерий проекта; ПК (указатель) — 24 px, WCAG 2.2 AA «размер цели»; мельче 44 px на телефоне — предупреждение
      const min = window.__touch ? 32 : 24
      // зону нажатия можно расширить невидимо (::after с отрицательным inset, как у значка «i» подсказки страницы): если точки вокруг рамки до порога попадают в сам элемент — цель достаточна
      const hits = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)) }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const dx = Math.max(0, (min - r.width) / 2), dy = Math.max(0, (min - r.height) / 2)
      const widened = (dx > 0 || dy > 0) && (dx === 0 || (hits(r.left - dx + 1, cy) && hits(r.right + dx - 1, cy))) && (dy === 0 || (hits(cx, r.top - dy + 1) && hits(cx, r.bottom + dy - 1)))
      if (!widened && (r.height < min || r.width < min)) out.small.push(desc(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height))
      else if (window.__touch && (r.height < 44 || r.width < 44)) out.warn.push(desc(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height))
    } else {
      const id = el.id
      const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (id && document.querySelector('label[for="' + id + '"]')) || el.closest('label') || el.getAttribute('title')
      if (!labelled) out.noLabel.push(desc(el) + (el.getAttribute('placeholder') ? ' (есть только placeholder)' : ''))
    }
  }

  // контраст текста (WCAG 2.x): цвет текста с учётом прозрачности цепочки предков против эффективного фона (первый непрозрачный предок, полупрозрачные смешиваются)
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1 } }
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
  const bgOf = (el) => { const chain = []; for (let p = el; p; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break } } let acc = { r: 255, g: 255, b: 255, a: 1 }; if (!chain.length || chain[chain.length - 1].a < 1) acc = parse(getComputedStyle(document.body).backgroundColor) && parse(getComputedStyle(document.body).backgroundColor).a >= 1 ? parse(getComputedStyle(document.body).backgroundColor) : acc; for (let i = chain.length - 1; i >= 0; i--) acc = over(chain[i], acc); return acc }
  const opacityOf = (el) => { let o = 1; for (let p = el; p; p = p.parentElement) o *= Number(getComputedStyle(p).opacity); return o }
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
  out.contrast = []
  const seen = new Set()
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('[aria-hidden=true]')) continue
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)
    if (!own) continue
    const cs = getComputedStyle(el)
    const fgRaw = parse(cs.color); if (!fgRaw) continue
    const bg = bgOf(el)
    const op = opacityOf(el)
    const fg = over({ ...fgRaw, a: fgRaw.a * op }, bg)
    const L1 = lum(fg), L2 = lum(bg)
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
    const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700
    const large = px >= 24 || (px >= 18.66 && bold)
    const need = large ? 3 : 4.5
    const disabled = el.disabled || el.closest('[disabled]')
    if (ratio < need && !disabled) {
      const key = desc(el) + '|' + ratio.toFixed(2)
      if (!seen.has(key)) { seen.add(key); out.contrast.push(desc(el) + ' ' + ratio.toFixed(2) + ':1 (нужно ' + need + ', ' + cs.color + ' на rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + '))' ) }
    }
  }
  for (const img of document.querySelectorAll('img')) if (vis(img) && !img.hasAttribute('alt')) out.noAlt.push(img.getAttribute('src') || 'img')
  return out
}
"""


def main():
    os.makedirs(OUT, exist_ok=True)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    report = []
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path='/opt/google/chrome/chrome', args=['--no-sandbox'])
            for view in ('goal', 'grid', 'list'):
                for vp, (w, h) in {'phone': (390, 844), 'desktop': (1280, 800)}.items():
                    for theme in ('light', 'dark'):
                        ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=(vp == 'phone'), service_workers='block')
                        page = ctx.new_page()
                        # Playwright применяет маршруты в ОБРАТНОМ порядке регистрации: общий «пускать только свой сервер» — первым, мок Supabase — вторым (сработает раньше)
                        page.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
                        page.route('**/*.supabase.co/**', handler)
                        page.add_init_script("localStorage.setItem('site_lang','ru');localStorage.setItem('site_theme','%s');localStorage.setItem('shop_view','%s');localStorage.setItem('shop_idea_seen','1');localStorage.setItem('welcome_tour_seen','1');localStorage.setItem('sb-%s-auth-token', %s);" % (theme, view, REF, json.dumps(json.dumps(SESSION))))
                        errs = []
                        page.on('pageerror', lambda e: errs.append('PAGE ' + str(e)[:120]))
                        page.on('console', lambda m: errs.append('CONSOLE ' + m.text[:120]) if m.type == 'error' and 'ERR_FAILED' not in m.text and 'Failed to load resource' not in m.text else None)
                        page.goto('http://127.0.0.1:%d/shop/' % PORT)
                        try:
                            page.wait_for_selector('text=Сверхдлинное', timeout=10000)  # вещи пришли и отрисованы (а не «Загрузка…»)
                        except Exception:
                            errs.append('вещи не отрисовались (магазин остался на «Загрузка…»)')
                        page.wait_for_timeout(600)
                        page.evaluate('window.__touch = %s' % ('true' if vp == 'phone' else 'false'))
                        res = page.evaluate(JS)
                        res['errors'] = errs
                        res['id'] = '%s-%s-%s' % (view, vp, theme)
                        res['cards'] = page.locator('[data-testid="shop-card"]').count() + page.locator('[data-testid="shop-row"]').count()
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
        print(('FAIL ' if probs else 'OK   ') + r['id'] + ' (карточек: %d)%s' % (r['cards'], warn))
        for pr in probs: print('       - ' + pr)
        bad += 1 if probs else 0
    # Контраст текста — отдельным разделом: большая часть находок упирается в общие цвета темы (--text-dim, акцент) ВСЕХ разделов сайта, поэтому по умолчанию
    # это замечания, а не отказ прогона; STRICT_CONTRAST=1 делает их отказом (когда палитра будет приведена к WCAG AA).
    import re
    from collections import defaultdict
    pairs = defaultdict(set)
    for r in report:
        for c in r['contrast']:
            m = re.match(r'(.*) ([\d.]+):1 \(нужно ([\d.]+), (rgb\([^)]*\)) на (rgb\([^)]*\))\)', c)
            if m: pairs[(m.group(4), m.group(5), m.group(2), m.group(3))].add(m.group(1))
    if pairs:
        print('\nКОНТРАСТ ниже WCAG AA (по цветовым парам; замечания палитры, не отказ без STRICT_CONTRAST=1):')
        for (fg, bg, ratio, need), els in sorted(pairs.items(), key=lambda kv: float(kv[0][2])):
            print('  %s:1 (нужно %s) %s на %s — %d эл., например: %s' % (ratio, need, fg, bg, len(els), '; '.join(sorted(els)[:3])))
    if os.environ.get('STRICT_CONTRAST') == '1' and pairs:
        bad += 1
    print('\nИТОГО: %s' % ('всё OK' if not bad else 'ПРОБЛЕМНЫХ ПРОГОНОВ: %d из %d' % (bad, len(report))))
    print('скриншоты:', OUT)
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), ensure_ascii=False, indent=1)
    sys.exit(1 if bad else 0)


main()
