"""Единый источник правды для тем сайта (BACKLOG 11:49: Mint + набор тем; ответ владельца 2026-10-04: сразу набор, выбор — на усмотрение).

Править ТОЛЬКО здесь, затем запустить `python3 scripts/apply_themes.py` из корня репозитория: он идемпотентно обновит блоки тем во всех
`web-*/src/style.css`, `src/lib/theme.ts`, подписи `theme_*` в `i18n.ts`, карты цветов в `index.html`, шапку и общий сайт.
Порядок словаря = порядок в выпадающем списке тем. kind: 'dark' | 'light' (от него зависят цвет золота стакана и color-scheme).
Ключи переменных: bg, card(--bg-card), border, text, dim(--text-dim), accent, at(--accent-text), ok(--success), bad(--danger),
hist(--hist-ok), wt/wb/wl(--water-top/bottom/line).
"""
DARK_W = dict(wt='#63b3f5', wb='#2f86dc', wl='#4aa3ee')
LIGHT_W = dict(wt='#3f95e0', wb='#1560b8', wl='#1560b8')
SEPIA_W = dict(wt='#3589d6', wb='#1157ac', wl='#1157ac')
SOLAR_W = dict(wt='#2f7fcf', wb='#0f4f9f', wl='#0f4f9f')
NORD_W = dict(wt='#7cc4ff', wb='#4a9be8', wl='#6bb6f5')
P={
 'dark':('dark','🌑 Dark','🌑 Тёмная',dict(bg='#121212',card='#1e1e1e',border='#333333',text='#e6e6e6',dim='#9a9a9a',accent='#5b8def',at='#ffffff',ok='#4caf6a',bad='#e05252',hist='#3fa66b',**DARK_W)),
 'monet':('dark','🎨 Monet','🎨 Monet',dict(bg='#0d0703',card='#1c1108',border='#3a2614',text='#f2cf9e',dim='#b8895c',accent='#f2a93c',at='#1c1108',ok='#8fbf5a',bad='#e0715c',hist='#3fa66b',**DARK_W)),
 'light':('light','☀️ Light','☀️ Светлая',dict(bg='#f7f4ef',card='#ffffff',border='#e2dccf',text='#2b2118',dim='#8a7a63',accent='#d97f2a',at='#ffffff',ok='#4c9a5f',bad='#c94f3f',hist='#3fa66b',**LIGHT_W)),
 'pink':('light','🌸 Pink','🌸 Розовая',dict(bg='#fff0f5',card='#ffe2ec',border='#ffb8ce',text='#5c1a33',dim='#a8577a',accent='#ff4f81',at='#ffffff',ok='#4c9a5f',bad='#d9534f',hist='#3fa66b',wt='#3184d6',wb='#1359b0',wl='#1359b0')),
 'mint':('light','🌿 Mint','🌿 Mint (мятная)',dict(bg='#effaf4',card='#ffffff',border='#cde8d8',text='#17392b',dim='#4a7561',accent='#13805a',at='#ffffff',ok='#2b7d4f',bad='#c0392b',hist='#3fa66b',**LIGHT_W)),
 'sepia':('light','📜 Sepia','📜 Сепия',dict(bg='#f4ecd8',card='#fbf5e6',border='#dccfae',text='#433422',dim='#6f5b3d',accent='#9a5b13',at='#ffffff',ok='#4f7d34',bad='#b5432f',hist='#5a8a3c',**SEPIA_W)),
 'solarlight':('light','🌞 Solarized Light','🌞 Solarized Light',dict(bg='#fdf6e3',card='#eee8d5',border='#d3cbb0',text='#33474f',dim='#586e75',accent='#1d6fa8',at='#ffffff',ok='#6b7a00',bad='#c0302d',hist='#859900',**SOLAR_W)),
 'nord':('dark','❄️ Nord','❄️ Nord',dict(bg='#2e3440',card='#3b4252',border='#4c566a',text='#eceff4',dim='#aab4c5',accent='#88c0d0',at='#2e3440',ok='#a3be8c',bad='#e07a84',hist='#a3be8c',**NORD_W)),
 'mocha':('dark','☕ Catppuccin Mocha','☕ Catppuccin Mocha',dict(bg='#1e1e2e',card='#313244',border='#45475a',text='#cdd6f4',dim='#a6adc8',accent='#cba6f7',at='#1e1e2e',ok='#a6e3a1',bad='#f38ba8',hist='#a6e3a1',**DARK_W)),
 'amoled':('dark','⚫ AMOLED','⚫ AMOLED (чёрная)',dict(bg='#000000',card='#0d0d0d',border='#262626',text='#f2f2f2',dim='#9a9a9a',accent='#4ea1ff',at='#000000',ok='#4caf6a',bad='#ff6b6b',hist='#3fa66b',**DARK_W)),
 'contrast':('dark','◐ High contrast','◐ Высокий контраст',dict(bg='#000000',card='#0a0a0a',border='#ffffff',text='#ffffff',dim='#d6d6d6',accent='#ffd60a',at='#000000',ok='#5cff8a',bad='#ff8080',hist='#5cff8a',**DARK_W)),
}
NEW = [k for k in P if k not in ('dark', 'monet', 'light', 'pink')]


# ---------------------------------------------------------------------------------------------------------------------------
# Палитра диаграмм особенностей подхода по теме (BACKLOG 13:55). Токены темы --chart-1…--chart-8, --chart-none, --chart-other.
# Правила: первая особенность — акцент темы; остальные семь — оттенки разных тонов (синий, красный, янтарь, зелёный, фиолет, циан,
# розовый, пурпур) без тона, слишком близкого к акценту; светлота подбирается под тему, чтобы контраст с карточкой был ≥ 3:1;
# цвета различимы между собой (ΔE по CIE76: первые четыре особенности ≥ 25, любые две из восьми ≥ 14 — проверяет web-dashboard/src/themes.test.ts).
# ---------------------------------------------------------------------------------------------------------------------------
import colorsys as _cs
import math as _m

_HUES = [215, 5, 40, 150, 275, 185, 325]
_RESERVE = [300, 245, 125, 20, 60]


def _rgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


def _hex(r):
    return '#%02x%02x%02x' % tuple(round(max(0, min(1, v)) * 255) for v in r)


def _lum(h):
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in _rgb(h)]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def _cr(a, b):
    x, y = sorted((_lum(a), _lum(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


def _hue(h):
    return _cs.rgb_to_hls(*_rgb(h))[0] * 360


def _hd(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _fit(hex_color, kind, card, floor=3.2):
    """Сдвигает светлоту до контраста с карточкой >= floor, не меняя тон и насыщенность."""
    h, l, s = _cs.rgb_to_hls(*_rgb(hex_color))
    step = 0.02 if kind == 'dark' else -0.02
    for _ in range(45):
        c = _hex(_cs.hls_to_rgb(h, l, s))
        if _cr(c, card) >= floor:
            return c
        l = max(0.0, min(1.0, l + step))
    return _hex(_cs.hls_to_rgb(h, l, s))


# Сдвиг светлоты по тону: соседние по кругу оттенки (янтарь/лайм/зелёный, циан/синий) иначе сливаются на светлых темах.
_L_SHIFT = {85: 0.10, 40: -0.03, 185: 0.05, 150: -0.04, 125: 0.08, 60: 0.08}


def _tone(hue, kind, card):
    s, l = (0.78, 0.64) if kind == 'dark' else (0.72, 0.40)
    l += _L_SHIFT.get(hue, 0) * (1 if kind == 'dark' else 1.2)
    return _fit(_hex(_cs.hls_to_rgb(hue / 360, l, s)), kind, card)


def _mix(a, b, t):
    ra, rb = _rgb(a), _rgb(b)
    return _hex([ra[i] * (1 - t) + rb[i] * t for i in range(3)])


def chart_palette(key):
    """-> {'c': [8 hex], 'none': hex, 'other': hex} для темы key."""
    kind, _, _, v = P[key]
    card, acc = v['card'], v['accent']
    ah = _hue(acc)
    tones = []
    for gap in (28, 20, 12):  # сначала строгий зазор по тону, при нехватке цветов — мягче (всегда нужно ровно 7 + акцент)
        for h in _HUES + _RESERVE:
            if len(tones) < 7 and h not in tones and _hd(h, ah) >= gap and all(_hd(h, t) >= gap for t in tones):
                tones.append(h)
    cols = [_fit(acc, kind, card)] + [_tone(h, kind, card) for h in tones]
    # «без особенности» и «остальные» — нейтральные серые (не оттенки темы, чтобы не путались с цветными особенностями)
    none = _fit('#9aa0a6' if kind == 'dark' else '#6b7280', kind, card, 3.2)
    other = _fit(_mix(none, '#000000' if kind == 'dark' else '#ffffff', 0.4), kind, card, 3.0)
    return {'c': cols, 'none': none, 'other': other}
