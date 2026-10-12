#!/usr/bin/env python3
"""Ещё два варианта заставки загрузки: «Эквалайзер» (bars) и «Пульс» (pulse) — BACKLOG 56.1 срез 2 (по рецепту «Орбиты», apply_splash_orbit.py).

Чистый SVG + CSS, цвет — акцент темы. Идемпотентно (второй запуск: «изменено файлов: 0»). Править ЗДЕСЬ, не руками. Делает:
  1) во ВСЕХ web-*/index.html: разметку .pre-bars / .pre-pulse, их стили и ключи 'bars', 'pulse' в списке вариантов скрипта выбора заставки;
  2) в web-dashboard/src/style.css и web-customization/src/style.css: блоки стилей .splash-bars / .splash-pulse (с «уменьшить движение» и «Отключить анимации»).
Компоненты: web-dashboard/src/components/splash/SplashBars.vue, SplashPulse.vue и копии в web-customization (фигуры совпадают — проверяет splashLoader.test.ts).
"""
import glob, re

BARS_SHAPES = [f'<rect class="eq-b eq-b-{i + 1}" x="{6.5 + i * 11.5:g}" y="14" width="7" height="36" rx="3.5" />' for i in range(5)]
PULSE_SHAPES = [
    '<circle class="pl-ring" cx="32" cy="32" r="10" />',
    '<circle class="pl-ring pl-r2" cx="32" cy="32" r="10" />',
    '<circle class="pl-core" cx="32" cy="32" r="5" />',
]


def svg(cls, shapes, ind):
    pad = ' ' * ind
    return f'<svg class="{cls}" viewBox="0 0 64 64" width="80" height="80">\n' + '\n'.join(pad + '  ' + s for s in shapes) + '\n' + pad + '</svg>'


STATIC_BARS = svg('pre-bars', BARS_SHAPES, 8)
STATIC_PULSE = svg('pre-pulse', PULSE_SHAPES, 8)

STATIC_CSS = '''      /* splash-more:start (scripts/apply_splash_more.py) */
      html[data-splash='bars'] .pre-splash .pre-flame, html[data-splash='pulse'] .pre-splash .pre-flame { display: none; }
      html[data-splash='bars'] .pre-splash .pre-bars, html[data-splash='pulse'] .pre-splash .pre-pulse { display: block; }
      .pre-bars .eq-b { fill: var(--pre-accent, #5b8def); transform-box: fill-box; transform-origin: 50% 100%; animation: pre-eq 1s ease-in-out infinite; }
      .pre-bars .eq-b-2 { animation-delay: -0.25s; }
      .pre-bars .eq-b-3 { animation-delay: -0.5s; }
      .pre-bars .eq-b-4 { animation-delay: -0.15s; }
      .pre-bars .eq-b-5 { animation-delay: -0.4s; }
      .pre-pulse .pl-core { fill: var(--pre-accent, #5b8def); transform-box: fill-box; transform-origin: 50% 50%; animation: pre-pl-core 1.8s ease-in-out infinite; }
      .pre-pulse .pl-ring { fill: none; stroke: var(--pre-accent, #5b8def); stroke-width: 1.6; transform-box: fill-box; transform-origin: 50% 50%; animation: pre-pl-ring 1.8s ease-out infinite; }
      .pre-pulse .pl-r2 { animation-delay: -0.9s; }
      @keyframes pre-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
      @keyframes pre-pl-ring { 0% { transform: scale(0.5); opacity: 0.9; } 100% { transform: scale(2.8); opacity: 0; } }
      @keyframes pre-pl-core { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.25); } }
      /* splash-more:end */
'''

COMP_CSS = '''
/* splash-more:start — варианты «Эквалайзер» и «Пульс» (BACKLOG 56.1 срез 2, scripts/apply_splash_more.py); цвет — акцент темы */
.splash-bars, .splash-pulse { overflow: visible; filter: drop-shadow(0 0 8px var(--accent)); }
.splash-bars .eq-b { fill: var(--accent); transform-box: fill-box; transform-origin: 50% 100%; animation: eq-bounce 1s ease-in-out infinite; }
.splash-bars .eq-b-2 { animation-delay: -0.25s; }
.splash-bars .eq-b-3 { animation-delay: -0.5s; }
.splash-bars .eq-b-4 { animation-delay: -0.15s; }
.splash-bars .eq-b-5 { animation-delay: -0.4s; }
.splash-pulse .pl-core { fill: var(--accent); transform-box: fill-box; transform-origin: 50% 50%; animation: pl-core 1.8s ease-in-out infinite; }
.splash-pulse .pl-ring { fill: none; stroke: var(--accent); stroke-width: 1.6; transform-box: fill-box; transform-origin: 50% 50%; animation: pl-ring 1.8s ease-out infinite; }
.splash-pulse .pl-r2 { animation-delay: -0.9s; }
@keyframes eq-bounce { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes pl-ring { 0% { transform: scale(0.5); opacity: 0.9; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes pl-core { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.25); } }
@media (prefers-reduced-motion: reduce) { .splash-bars *, .splash-pulse * { animation: none !important; } }
html[data-motion='off'] .splash-bars *, html[data-motion='off'] .splash-pulse * { animation: none !important; }
/* splash-more:end */
'''

changed = 0


def write(p, t, o):
    global changed
    if t != o:
        open(p, 'w', encoding='utf-8').write(t)
        changed += 1


for p in sorted(glob.glob('web-*/index.html')):
    t = open(p, encoding='utf-8').read()
    if 'pre-classic' not in t:
        continue
    o = t
    t = t.replace("'tongues', 'orbit']", "'tongues', 'orbit', 'bars', 'pulse']")
    if 'splash-more:start' in t:
        t = re.sub(r'      /\* splash-more:start.*?/\* splash-more:end \*/\n', lambda m: STATIC_CSS, t, flags=re.S)
    else:
        i = t.index('      /* splash-flame:start */')
        t = t[:i] + STATIC_CSS + t[i:]
    for cls, markup in (('pre-bars', STATIC_BARS), ('pre-pulse', STATIC_PULSE)):
        if f'class="{cls}"' in t:
            t = re.sub(rf'<svg class="{cls}".*?</svg>', lambda m: markup, t, count=1, flags=re.S)
        else:
            m = re.search(r'<svg class="pre-orbit".*?</svg>', t, flags=re.S) if cls == 'pre-bars' else re.search(r'<svg class="pre-bars".*?</svg>', t, flags=re.S)
            t = t[:m.end()] + '\n        ' + markup + t[m.end():]
    write(p, t, o)

for p in ('web-dashboard/src/style.css', 'web-customization/src/style.css'):
    t = open(p, encoding='utf-8').read()
    o = t
    if 'splash-more:start' in t:
        t = re.sub(r'\n/\* splash-more:start.*?/\* splash-more:end \*/\n', lambda m: COMP_CSS, t, flags=re.S)
    else:
        t = t.rstrip('\n') + '\n' + COMP_CSS
    write(p, t, o)

print('изменено файлов:', changed)
