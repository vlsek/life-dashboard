#!/usr/bin/env python3
"""Вариант заставки «Три языка» (BACKLOG 16: старое пламя из трёх языков + искры, просьба владельца 2026-10-10)
в статичной заставке index.html ВСЕХ пилотов: разметка .pre-tongues, её стили/keyframes и ключ 'tongues' в списке
вариантов скрипта выбора. Компонент для Дашборда — web-dashboard/src/components/splash/SplashFlameTongues.vue.
Идемпотентно (второй запуск: «изменено файлов: 0»). Править ЗДЕСЬ, не руками."""
import glob, re

SVG = '''<svg class="pre-tongues" viewBox="0 0 64 64" width="80" height="80">
          <path class="tg tl" d="M17 22C20 31 11 36 11 44C11 52 18 57 25 57C18 52 22 44 24 38C21 33 18 29 17 22Z" />
          <path class="tg tr" d="M47 22C44 31 53 36 53 44C53 52 46 57 39 57C46 52 42 44 40 38C43 33 46 29 47 22Z" />
          <path class="tg tc" d="M32 3C34 13 46 21 46 37C46 49 40 58 32 58C24 58 18 49 18 37C18 29 24 25 26 17C28 21 30 21 31 15C31.5 10 31.8 7 32 3Z" />
          <path class="tg tk" d="M32 30C33 36 40 40 40 47C40 53 36 58 32 58C28 58 24 53 24 47C24 40 31 36 32 30Z" />
          <circle class="sp" cx="25" cy="14" r="1.3" style="--dx: -5px; --d: 2.1s; --o: 0s" />
          <circle class="sp" cx="34" cy="10" r="1.1" style="--dx: 3px; --d: 1.7s; --o: -0.6s" />
          <circle class="sp" cx="41" cy="16" r="1.4" style="--dx: 6px; --d: 2.4s; --o: -1.2s" />
          <circle class="sp" cx="30" cy="12" r="0.9" style="--dx: -2px; --d: 1.9s; --o: -1.7s" />
        </svg>'''

CSS = '''      /* splash-tongues:start (scripts/apply_splash_tongues.py) */
      html[data-splash='tongues'] .pre-splash .pre-flame { display: none; }
      html[data-splash='tongues'] .pre-splash .pre-tongues { display: block; }
      .pre-tongues .tg { transform-box: fill-box; transform-origin: 50% 100%; }
      .pre-tongues .tc { fill: var(--pre-accent, #5b8def); animation: pre-tc 1.3s ease-in-out infinite; }
      .pre-tongues .tl { fill: color-mix(in srgb, var(--pre-accent, #5b8def) 78%, transparent); animation: pre-tl 0.95s ease-in-out -0.3s infinite; }
      .pre-tongues .tr { fill: color-mix(in srgb, var(--pre-accent, #5b8def) 78%, transparent); animation: pre-tr 1.15s ease-in-out -0.7s infinite; }
      .pre-tongues .tk { fill: color-mix(in srgb, var(--pre-accent, #5b8def) 35%, #fff); animation: pre-tk 0.8s ease-in-out -0.2s infinite; }
      .pre-tongues .sp { fill: color-mix(in srgb, var(--pre-accent, #5b8def) 45%, #fff); opacity: 0; animation: pre-sp var(--d, 2s) ease-out var(--o, 0s) infinite; }
      @keyframes pre-tc { 0%, 100% { transform: scale(1, 1) skewX(0deg); } 30% { transform: scale(0.96, 1.08) skewX(-4deg); } 65% { transform: scale(1.03, 0.95) skewX(3deg); } }
      @keyframes pre-tl { 0%, 100% { transform: scale(1, 1) skewX(0deg); } 40% { transform: scale(0.9, 1.15) skewX(-7deg); } 75% { transform: scale(1.05, 0.9) skewX(4deg); } }
      @keyframes pre-tr { 0%, 100% { transform: scale(1, 1) skewX(0deg); } 35% { transform: scale(0.92, 1.12) skewX(6deg); } 70% { transform: scale(1.06, 0.92) skewX(-4deg); } }
      @keyframes pre-tk { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(0.88, 1.12); } }
      /* splash-tongues:end */
'''

changed = 0
for p in sorted(glob.glob('web-*/index.html')):
    t = open(p, encoding='utf-8').read()
    if 'pre-classic' not in t:
        continue
    o = t
    t = t.replace("var sv = ['classic', 'flame', 'ring']", "var sv = ['classic', 'flame', 'ring', 'tongues']")
    if 'splash-tongues:start' in t:
        t = re.sub(r'      /\* splash-tongues:start.*?/\* splash-tongues:end \*/\n', lambda m: CSS, t, flags=re.S)
    else:
        i = t.index('      /* splash-flame:start */')
        t = t[:i] + CSS + t[i:]
    if 'class="pre-tongues"' in t:
        t = re.sub(r'<svg class="pre-tongues".*?</svg>', lambda m: SVG, t, count=1, flags=re.S)
    else:
        m = re.search(r'<svg class="pre-flame pre-live".*?</svg>', t, flags=re.S)
        t = t[:m.end()] + '\n        ' + SVG + t[m.end():]
    if t != o:
        open(p, 'w', encoding='utf-8').write(t); changed += 1
print('изменено файлов:', changed)
