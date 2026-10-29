#!/usr/bin/env python3
"""Генератор наборов иконок для «Стиль иконок» (BACKLOG 44.18г, срез 3).

Кладёт в web-header/public/icon-packs/ (оттуда Vite копирует в header-widgets/icon-packs/):
  index.json    — имя → разметка «Контура» (наши иконки; по ней рантайм-подменщик узнаёт иконку на странице)
  fill.json     — «Заливка»  (Phosphor Icons, вариант fill, MIT)
  duotone.json  — «Дуотон»   (Phosphor Icons, вариант duotone, MIT — двухслойный)
  pixel.json    — «Пиксели»  (НАШИ иконки, растеризованные на сетку 16×16: цельный набор, покрывает все имена)
  sketch.json   — «Рукописный» (НАШИ иконки, перерисованные дрожащей линией «от руки»: те же формы, штрих слегка гуляет; покрывает все имена)

Запуск (нужны: npm и playwright с Chrome; пакет Phosphor НЕ хранится в репозитории):
  cd /tmp && npm pack @phosphor-icons/core && mkdir -p ph && tar -xzf phosphor-icons-core-*.tgz -C ph
  python3 scripts/gen_icon_packs.py /tmp/ph/package/assets
Только «Рукописный» (Phosphor не нужен, остальные файлы не трогаются):  python3 scripts/gen_icon_packs.py --only sketch

Лицензии наборов — docs/THIRD_PARTY_ICONS.md. Генератор идемпотентен: те же входные данные → те же файлы.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'web-header', 'public', 'icon-packs')

# Наше имя → кандидаты в Phosphor (берётся первый существующий). Нет подходящего — пустой список: иконка остаётся «Контуром».
PH = {
    'alert': ['warning'], 'apple': ['orange', 'cherries'], 'bandage': ['bandaids', 'first-aid'], 'bed': ['bed'], 'bell': ['bell'],
    'bike': ['bicycle', 'person-simple-bike'], 'bird': ['bird'], 'book': ['book-open', 'book'], 'bottle': ['flask', 'beer-bottle'],
    'boxing': ['boxing-glove'], 'brain': ['brain'], 'bread': ['bread'], 'briefcase': ['briefcase'], 'broom': ['broom'],
    'bulb': ['lightbulb'], 'cake': ['cake'], 'calendar': ['calendar-blank'], 'camera': ['camera'], 'car': ['car'],
    'card': ['credit-card'], 'cart': ['shopping-cart'], 'challenges': ['flag'], 'chart': ['chart-line-up', 'chart-line'],
    'check': ['check'], 'checklist': ['list-checks'], 'chevron_down': ['caret-down'], 'chevron_left': ['caret-left'],
    'chevron_right': ['caret-right'], 'clock': ['clock'], 'cloud': ['cloud'], 'code': ['code'], 'coffee': ['coffee'],
    'coin': ['coin'], 'community': ['users-three'], 'compass': ['compass'], 'done': ['check-circle'], 'download': ['download-simple'],
    'droplet': ['drop'], 'dumbbell': ['barbell'], 'edit': ['pencil-simple'], 'english': ['globe'], 'eye': ['eye'],
    'eyeoff': ['eye-slash'], 'fish': ['fish'], 'flame': ['fire'], 'flower': ['flower'], 'gamepad': ['game-controller'],
    'gear': ['gear'], 'gift': ['gift'], 'goals': ['target'], 'guitar': ['guitar'], 'hand': ['hand'], 'hash': ['hash'],
    'headphones': ['headphones'], 'heart': ['heart'], 'help': ['question'], 'history': ['clock-counter-clockwise'],
    'home': ['house'], 'hourglass': ['hourglass'], 'info': ['info'], 'jumprope': [], 'key': ['key'], 'laptop': ['laptop'],
    'laundry': ['washing-machine'], 'leaf': ['leaf'], 'link': ['link'], 'list': ['list-bullets'], 'lock': ['lock'],
    'lungs': [], 'mail': ['envelope-simple'], 'meal': ['fork-knife'], 'medal': ['medal'], 'medical': ['first-aid'],
    'menu': ['list'], 'milestones': ['signpost'], 'mountain': ['mountains'], 'music': ['music-notes'], 'note': ['note'],
    'paintbrush': ['paint-brush'], 'party': ['confetti'], 'paw': ['paw-print'], 'phone': ['device-mobile'],
    'piggybank': ['piggy-bank'], 'pill': ['pill'], 'pin': ['push-pin'], 'pizza': ['pizza'], 'plane': ['airplane'],
    'plate': ['bowl-food'], 'plus': ['plus'], 'pullup': [], 'pulse': ['heartbeat'], 'pushup': [], 'rain': ['cloud-rain'],
    'receipt': ['receipt'], 'refresh': ['arrows-clockwise'], 'ruler': ['ruler'], 'run': ['person-simple-run'],
    'salad': ['bowl-food', 'leaf'], 'save': ['floppy-disk'], 'scale': ['scales'], 'shop': ['shopping-bag'],
    'ski': ['person-simple-ski'], 'skills': ['seal-check', 'certificate'], 'sleep': ['moon'], 'smile': ['smiley'],
    'snow': ['snowflake'], 'sparkles': ['sparkle'], 'squat': [], 'star': ['star'], 'stretch': ['person-arms-spread'],
    'study': ['graduation-cap'], 'suitcase': ['suitcase'], 'sun': ['sun'], 'swim': ['person-simple-swim'], 'tea': ['coffee'],
    'thermometer': ['thermometer'], 'tooth': ['tooth'], 'train': ['train'], 'trash': ['trash'], 'trash2': ['trash-simple'],
    'treadmill': ['person-simple-walk'], 'tree': ['tree-evergreen'], 'trophy': ['trophy'], 'tv': ['television'],
    'undo': ['arrow-counter-clockwise'], 'upload': ['upload-simple'], 'user': ['user'], 'walk': ['person-simple-walk'],
    'wallet': ['wallet'], 'workouts': ['barbell'], 'wrench': ['wrench'], 'x': ['x'], 'yoga': ['person-simple-tai-chi'], 'zap': ['lightning'],
}

PIXEL_GRID = 16        # клеток по стороне
PIXEL_STROKE = 1.9     # толщина штриха при растеризации «Контура»
PIXEL_THRESHOLD = 0.35  # доля покрытия клетки, начиная с которой она «чёрная»
SKETCH_STEP = 1.0      # шаг выборки точек вдоль контура, в единицах viewBox 24×24
SKETCH_WOBBLE = 0.6    # размах «дрожания руки», те же единицы
CHROME = os.environ.get('ICON_PACK_CHROME', '/opt/google/chrome/chrome')


def js_unescape(t):
    """Содержимое одинарных кавычек TS-строки → настоящая строка (\\" \\' \\\\ \\n)."""
    return re.sub(r'\\(.)', lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), t)


def outline_icons():
    """Union ICON_PATHS всех пилотов (разметка одинаковых имён совпадает — это проверяет тест)."""
    union = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'web-*', 'src', 'lib', 'icons.ts'))):
        s = open(f, encoding='utf-8').read()
        i = s.index('export const ICON_PATHS')
        j = s.index('\n} as const', i) if '\n} as const' in s[i:] else s.index('\n}', i)
        for m in re.finditer(r"^\s{2}(\w+):\s*\n?\s*'((?:[^'\\]|\\.)*)'", s[i:j], re.M):
            union.setdefault(m.group(1), js_unescape(m.group(2)))
    return union


def inner_svg(path):
    s = open(path, encoding='utf-8').read().strip()
    m = re.match(r'<svg[^>]*viewBox="([^"]+)"[^>]*>(.*)</svg>', s, re.S)
    return m.group(1), re.sub(r'\s*\n\s*', '', m.group(2)).strip()


def phosphor_pack(assets, kind, names):
    """kind: fill | duotone. Возвращает {имя: {vb, h}} и список имён без пары."""
    icons, missing = {}, []
    for n in names:
        pick = None
        for cand in PH.get(n, []):
            f = os.path.join(assets, kind, f'{cand}-{kind}.svg')
            if os.path.exists(f):
                pick = f
                break
        if not pick:
            missing.append(n)
            continue
        vb, html = inner_svg(pick)
        icons[n] = {'vb': vb, 'h': html}
    return icons, missing


def pixel_pack(outline):
    """Растеризует «Контур» в Chromium, усредняет в клетки, склеивает клетки подряд в прямоугольники одного <path>."""
    import numpy as np
    from PIL import Image
    from playwright.sync_api import sync_playwright
    N = PIXEL_GRID
    px = 192  # кратно N
    icons = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = b.new_page(viewport={'width': px, 'height': px})
        tmp = '/tmp/_icon_pix.png'
        for n in sorted(outline):
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="{px}" height="{px}" fill="none" stroke="#000" '
                   f'stroke-width="{PIXEL_STROKE}" stroke-linecap="round" stroke-linejoin="round">{outline[n]}</svg>')
            pg.set_content(f'<body style="margin:0;background:#fff">{svg}</body>')
            pg.screenshot(path=tmp)
            a = np.array(Image.open(tmp).convert('L'), dtype=float) / 255
            cell = px // N
            cov = 1 - a.reshape(N, cell, N, cell).mean(axis=(1, 3))
            grid = cov >= PIXEL_THRESHOLD
            d = []
            for y in range(N):
                x = 0
                while x < N:
                    if grid[y][x]:
                        x0 = x
                        while x < N and grid[y][x]:
                            x += 1
                        d.append(f'M{x0} {y}h{x - x0}v1h-{x - x0}z')
                    else:
                        x += 1
            if d:
                icons[n] = {'vb': f'0 0 {N} {N}', 'h': f'<path d="{"".join(d)}"/>', 'a': {'shape-rendering': 'crispEdges'}}
        b.close()
    return icons


SKETCH_JS = """
([markup, step, amp, seed]) => {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  document.body.appendChild(svg)
  svg.innerHTML = markup
  // «дрожание» — гладкая функция координат (не случайный шум): замкнутые фигуры остаются замкнутыми, стыки линий сходятся
  const w = (x, y) => [
    amp * (Math.sin(0.55 * y + seed) + 0.5 * Math.sin(1.1 * x + 2.1 * seed)) / 1.5,
    amp * (Math.sin(0.5 * x + 1.3 * seed) + 0.5 * Math.sin(1.2 * y + 0.7 * seed)) / 1.5,
  ]
  const out = []
  let kept = 0
  for (const el of svg.children) {
    const fill = el.getAttribute('fill')
    if (!(el instanceof SVGGeometryElement) || (fill && fill !== 'none')) { out.push(el.outerHTML); kept++; continue }
    const L = el.getTotalLength()
    if (!(L > 0)) continue
    const n = Math.max(2, Math.ceil(L / step))
    let d = ''
    let prev = null
    for (let i = 0; i <= n; i++) {
      const pt = el.getPointAtLength((L * i) / n)
      const [dx, dy] = w(pt.x, pt.y)
      const x = Math.round((pt.x + dx) * 10) / 10
      const y = Math.round((pt.y + dy) * 10) / 10
      const jump = prev && Math.hypot(pt.x - prev.x, pt.y - prev.y) > (L / n) * 2 + 0.5 // перерыв между подконтурами одного <path>
      d += (!prev || jump ? 'M' : 'L') + x + ' ' + y
      prev = pt
    }
    out.push('<path d="' + d + '"/>')
  }
  svg.remove()
  return out.join('')
}
"""


def sketch_pack(outline):
    """«Рукописный»: каждая фигура «Контура» пересэмплируется вдоль длины (getPointAtLength в Chromium) и сдвигается гладкой функцией — линия «гуляет»."""
    from playwright.sync_api import sync_playwright
    icons = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = b.new_page()
        pg.set_content('<body></body>')
        for n in sorted(outline):
            seed = (sum(ord(c) * (i + 1) for i, c in enumerate(n)) % 628) / 100  # у каждой иконки своя «рука»
            h = pg.evaluate(SKETCH_JS, [outline[n], SKETCH_STEP, SKETCH_WOBBLE, seed])
            if h:
                icons[n] = {'vb': '0 0 24 24', 'h': h, 'a': {'fill': 'none', 'stroke': 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}}
        b.close()
    return icons


def write(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
        f.write('\n')


def only_sketch():
    outline = {}
    by_markup = {}
    for n, m in sorted(outline_icons().items()):
        if m not in by_markup:
            by_markup[m] = n
            outline[n] = m
    sk = sketch_pack(outline)
    write('sketch', {'pack': 'sketch', 'title': 'Рукописный', 'license': 'Перерисовка собственных иконок проекта', 'icons': sk})
    print(f'sketch: {len(sk)}/{len(outline)} иконок')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1:] == ['--only', 'sketch']:
        return only_sketch()
    assets = sys.argv[1]
    outline_all = outline_icons()
    # Одинаковая разметка под разными именами (trash/trash2 — одна иконка) = один канонический ключ: иконку узнают именно по разметке,
    # поэтому дубль в index.json сделал бы подмену неоднозначной. Канон — первое имя по алфавиту.
    outline, by_markup = {}, {}
    for n in sorted(outline_all):
        if outline_all[n] in by_markup:
            print(f'алиас: {n} = {by_markup[outline_all[n]]} (в индекс не входит)')
            continue
        by_markup[outline_all[n]] = n
        outline[n] = outline_all[n]
    names = sorted(outline)
    write('index', {'icons': outline})
    report = {}
    for kind, label in (('fill', 'Заливка'), ('duotone', 'Дуотон')):
        icons, missing = phosphor_pack(assets, kind, names)
        write(kind, {'pack': kind, 'title': label, 'license': 'Phosphor Icons, MIT, © 2020-present Phosphor Icons', 'icons': icons})
        report[kind] = (len(icons), missing)
    pix = pixel_pack(outline)
    write('pixel', {'pack': 'pixel', 'title': 'Пиксели', 'license': 'Растеризация собственных иконок проекта', 'icons': pix})
    report['pixel'] = (len(pix), [n for n in names if n not in pix])
    sk = sketch_pack(outline)
    write('sketch', {'pack': 'sketch', 'title': 'Рукописный', 'license': 'Перерисовка собственных иконок проекта', 'icons': sk})
    report['sketch'] = (len(sk), [n for n in names if n not in sk])
    for k, (n, miss) in report.items():
        print(f'{k}: {n}/{len(names)} иконок; без пары: {miss}')


if __name__ == '__main__':
    main()
