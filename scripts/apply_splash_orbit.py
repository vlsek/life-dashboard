#!/usr/bin/env python3
"""Вариант заставки «Орбита» (BACKLOG 56.1: новые анимации загрузки как предметы «Кастомизации», срез 1 — бесплатный вариант).

Центр с мягким пульсом, два кольца-дорожки и точки, бегущие по ним в разные стороны. Чистый SVG + CSS, цвет — акцент темы.
Идемпотентно (второй запуск: «изменено файлов: 0»). Править ЗДЕСЬ, не руками. Делает:
  1) во ВСЕХ web-*/index.html: разметку .pre-orbit, её стили и ключ 'orbit' в списке вариантов скрипта выбора заставки;
  2) в web-dashboard/src/style.css и web-customization/src/style.css: блок стилей .splash-orbit для компонента SplashOrbit.vue
     (с «уменьшить движение» и «Отключить анимации»).
Компонент: web-dashboard/src/components/splash/SplashOrbit.vue и его копия в web-customization (контур совпадает — проверяет splashLoader.test.ts).
"""
import glob, re

SHAPES = '''<circle class="ob-track" cx="32" cy="32" r="22" />
  <circle class="ob-track" cx="32" cy="32" r="12" />
  <circle class="ob-core" cx="32" cy="32" r="4.5" />
  <g class="ob-o1">
    <circle class="ob-dot" cx="32" cy="10" r="3" />
    <circle class="ob-dot ob-dim" cx="51" cy="43" r="2.2" />
    <circle class="ob-dot ob-dim" cx="13" cy="43" r="1.6" />
  </g>
  <g class="ob-o2">
    <circle class="ob-dot ob-light" cx="32" cy="20" r="2" />
    <circle class="ob-dot ob-dim" cx="32" cy="44" r="1.4" />
  </g>'''

def indent(s, n):
    return s.replace('\n  ', '\n' + ' ' * n)

STATIC_SVG = '<svg class="pre-orbit" viewBox="0 0 64 64" width="80" height="80">\n          ' + indent(SHAPES, 10) + '\n        </svg>'

STATIC_CSS = '''      /* splash-orbit:start (scripts/apply_splash_orbit.py) */
      html[data-splash='orbit'] .pre-splash .pre-flame { display: none; }
      html[data-splash='orbit'] .pre-splash .pre-orbit { display: block; }
      .pre-orbit .ob-track { fill: none; stroke: var(--pre-accent, #5b8def); stroke-opacity: 0.22; stroke-width: 1.2; }
      .pre-orbit .ob-core { fill: var(--pre-accent, #5b8def); transform-box: fill-box; transform-origin: 50% 50%; animation: pre-ob-core 1.4s ease-in-out infinite; }
      .pre-orbit .ob-dot { fill: var(--pre-accent, #5b8def); }
      .pre-orbit .ob-dim { fill: color-mix(in srgb, var(--pre-accent, #5b8def) 60%, transparent); }
      .pre-orbit .ob-light { fill: color-mix(in srgb, var(--pre-accent, #5b8def) 40%, #fff); }
      .pre-orbit .ob-o1 { transform-box: view-box; transform-origin: 50% 50%; animation: pre-ob-spin 2.2s linear infinite; }
      .pre-orbit .ob-o2 { transform-box: view-box; transform-origin: 50% 50%; animation: pre-ob-spin 1.3s linear infinite reverse; }
      @keyframes pre-ob-spin { to { transform: rotate(360deg); } }
      @keyframes pre-ob-core { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.7; } }
      /* splash-orbit:end */
'''

COMP_CSS = '''
/* splash-orbit:start — вариант «Орбита» (BACKLOG 56.1, scripts/apply_splash_orbit.py); цвет — акцент темы */
.splash-orbit { overflow: visible; filter: drop-shadow(0 0 8px var(--accent)); }
.splash-orbit .ob-track { fill: none; stroke: var(--accent); stroke-opacity: 0.22; stroke-width: 1.2; }
.splash-orbit .ob-core { fill: var(--accent); transform-box: fill-box; transform-origin: 50% 50%; animation: ob-core 1.4s ease-in-out infinite; }
.splash-orbit .ob-dot { fill: var(--accent); }
.splash-orbit .ob-dim { fill: color-mix(in srgb, var(--accent) 60%, transparent); }
.splash-orbit .ob-light { fill: color-mix(in srgb, var(--accent) 40%, #fff); }
.splash-orbit .ob-o1 { transform-box: view-box; transform-origin: 50% 50%; animation: ob-spin 2.2s linear infinite; }
.splash-orbit .ob-o2 { transform-box: view-box; transform-origin: 50% 50%; animation: ob-spin 1.3s linear infinite reverse; }
@keyframes ob-spin { to { transform: rotate(360deg); } }
@keyframes ob-core { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.7; } }
@media (prefers-reduced-motion: reduce) { .splash-orbit * { animation: none !important; } }
html[data-motion='off'] .splash-orbit * { animation: none !important; }
/* splash-orbit:end */
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
    t = t.replace("var sv = ['classic', 'flame', 'ring', 'tongues']", "var sv = ['classic', 'flame', 'ring', 'tongues', 'orbit']")
    if 'splash-orbit:start' in t:
        t = re.sub(r'      /\* splash-orbit:start.*?/\* splash-orbit:end \*/\n', lambda m: STATIC_CSS, t, flags=re.S)
    else:
        i = t.index('      /* splash-flame:start */')
        t = t[:i] + STATIC_CSS + t[i:]
    if 'class="pre-orbit"' in t:
        t = re.sub(r'<svg class="pre-orbit".*?</svg>', lambda m: STATIC_SVG, t, count=1, flags=re.S)
    else:
        m = re.search(r'<svg class="pre-tongues".*?</svg>', t, flags=re.S)
        t = t[:m.end()] + '\n        ' + STATIC_SVG + t[m.end():]
    write(p, t, o)

for p in ('web-dashboard/src/style.css', 'web-customization/src/style.css'):
    t = open(p, encoding='utf-8').read()
    o = t
    if 'splash-orbit:start' in t:
        t = re.sub(r'\n/\* splash-orbit:start.*?/\* splash-orbit:end \*/\n', lambda m: COMP_CSS, t, flags=re.S)
    else:
        t = t.rstrip('\n') + '\n' + COMP_CSS
    write(p, t, o)

print('изменено файлов:', changed)
