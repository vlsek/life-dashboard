#!/usr/bin/env python3
"""Выбор заставки в «Кастомизации» (BACKLOG 16, срез 2): переносит из web-dashboard в web-customization компоненты вариантов
(SplashFireRing.vue, SplashFlameTongues.vue) и их CSS (три языка, огненный круг, «классика») — блок
`splash-picker:start/end` в web-customization/src/style.css. Источник правды по оформлению вариантов — Дашборд;
править там, потом запустить этот скрипт. Идемпотентно."""
import re, shutil

DASH, CUST = 'web-dashboard/src', 'web-customization/src'
d = open(f'{DASH}/style.css', encoding='utf-8').read()

def block(start):
    i = d.index(start); depth = 0; j = d.index('{', i)
    for k in range(j, len(d)):
        if d[k] == '{': depth += 1
        elif d[k] == '}':
            depth -= 1
            if depth == 0: return d[i:k + 1] + '\n'
    raise SystemExit('нет закрывающей скобки: ' + start)

tong = re.search(r'/\* splash-tongues:start.*?/\* splash-tongues:end \*/\n', d, re.S).group(0)
ring = d[d.index('.splash-ring .ring-base {'): d.index('@keyframes ring-spin {')] + block('@keyframes ring-spin {')
classic = ''.join(block(s) for s in ['.splash-flame {', '@keyframes flame-flicker', '.splash-flame .fl-outer {', '.splash-flame .fl-inner {', 'html.theme-monet .splash-flame .fl-outer {'])
extra = '''.splash-ring { overflow: visible; animation: splash-glow 2.4s ease-in-out infinite; }
.splash-flame { overflow: visible; }
@media (prefers-reduced-motion: reduce) {
  .splash-ring, .splash-ring *, .splash-tongues *, .splash-flame { animation: none !important; }
}
html[data-motion='off'] .splash-ring,
html[data-motion='off'] .splash-ring *,
html[data-motion='off'] .splash-tongues *,
html[data-motion='off'] .splash-flame { animation: none !important; }
'''
BLOCK = '/* splash-picker:start (scripts/apply_splash_picker.py — не править руками) */\n' + classic + ring + tong + extra + '/* splash-picker:end */\n'

p = f'{CUST}/style.css'; t = open(p, encoding='utf-8').read(); o = t
if 'splash-picker:start' in t:
    t = re.sub(r'/\* splash-picker:start.*?/\* splash-picker:end \*/\n', lambda m: BLOCK, t, flags=re.S)
else:
    i = t.index('/* splash-flame:end */\n') + len('/* splash-flame:end */\n')
    t = t[:i] + BLOCK + t[i:]
changed = 0
if t != o: open(p, 'w', encoding='utf-8').write(t); changed += 1
for f in ('SplashFireRing.vue', 'SplashFlameTongues.vue'):
    src = open(f'{DASH}/components/splash/{f}', encoding='utf-8').read()
    dst = f'{CUST}/components/splash/{f}'
    try: cur = open(dst, encoding='utf-8').read()
    except FileNotFoundError: cur = None
    if cur != src: open(dst, 'w', encoding='utf-8').write(src); changed += 1
print('изменено файлов:', changed)
