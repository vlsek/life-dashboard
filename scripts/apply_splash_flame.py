#!/usr/bin/env python3
"""Единое живое пламя заставки (BACKLOG 16, v4.20): ОДИН контур с морфингом `d`, два слоя глубины и сердцевина.
Канонический источник — этот файл. Раскатывает: компонент SplashFlameLive.vue, блок .splash-live в style.css,
статичную копию .pre-live в index.html — во все web-*/ пилоты. Идемпотентно (второй запуск: «изменено файлов: 0»)."""
import glob, re, sys

OUT_A = "M32 3C34 13 46 21 46 37C46 49 40 58 32 58C24 58 18 49 18 37C18 29 24 25 26 17C28 21 30 21 31 15C31.5 10 31.8 7 32 3Z"
OUT_B = "M33 1C36 12 47 21 46 37C46 49 40 58 32 58C24 58 17 49 18 37C18 29 25 25 27 16C29 20 31 20 32 13C32.5 8 32.8 5 33 1Z"
OUT_C = "M31 5C32 14 45 22 46 37C46 49 40 58 32 58C24 58 19 49 18 37C18 30 23 26 25 18C27 22 29 22 30 16C30.4 11 30.8 8 31 5Z"
COR_A = "M32 30C33 36 40 40 40 47C40 53 36 58 32 58C28 58 24 53 24 47C24 40 31 36 32 30Z"
COR_B = "M33 27C34 34 40 40 40 47C40 53 36 58 32 58C28 58 24 53 24 47C24 40 30 35 33 27Z"
COR_C = "M31 32C32 37 39 41 40 47C40 53 36 58 32 58C28 58 24 53 24 47C24 41 30 37 31 32Z"
# Ширина пламени (владелец 2026-10-10: «скукожен огонёк»): у прежнего пламени из трёх языков контур занимал x=11..53, у одного пламени было 18..46 —
# на треть уже. Растягиваем все контуры по горизонтали от оси x=32 (высота та же), чтобы ширина вернулась к прежней.
WIDEN = 1.4
def widen(path, k=WIDEN):
    out, xy = [], 0
    for tok in re.findall(r"[A-Za-z]|-?\d+\.?\d*", path):
        if tok.isalpha():
            out.append(tok)
            xy = 0
            continue
        v = float(tok)
        if xy % 2 == 0:
            v = 32 + (v - 32) * k
        xy += 1
        out.append(("%.2f" % v).rstrip("0").rstrip("."))
    # соседние числа через пробел, команда сразу к числу: «M32 3C34 13 …»
    res = ""
    for i, t in enumerate(out):
        if t.isalpha():
            res += t
        else:
            res += (" " if res and not res[-1].isalpha() else "") + t
    return res
OUT_A, OUT_B, OUT_C, COR_A, COR_B, COR_C = (widen(x) for x in (OUT_A, OUT_B, OUT_C, COR_A, COR_B, COR_C))
SPARKS = [(round(32 + (x - 32) * WIDEN, 1), y, r, dx, d, o) for x, y, r, dx, d, o in [(25, 14, 1.3, -5, 2.1, 0), (34, 10, 1.1, 3, 1.7, -0.6), (41, 16, 1.4, 6, 2.4, -1.2), (30, 12, 0.9, -2, 1.9, -1.7)]]

VUE = f'''<script setup lang="ts">
// Вариант «живое пламя» (v4.20): ОДНО пламя — единый контур, который плавно перетекает между тремя формами
// (CSS `d: path()` в style.css, .splash-live), два слоя глубины (внешний, средний) и светлая сердцевина;
// всё группой слегка качается (запасной вариант для браузеров без морфинга контура), над ним поднимаются искры.
// Чистый SVG + CSS, без библиотек. Статичная копия для index.html — .pre-live; контуры должны совпадать
// (проверяет splashLoader.test.ts). Тот же компонент оживляет логотип слева сверху в шапке (AppShell.vue):
// там size=30 и без искр. Генерируется scripts/apply_splash_flame.py — правь там.
withDefaults(defineProps<{{ size?: number; sparks?: boolean }}>(), {{ size: 80, sparks: true }})
</script>

<template>
  <svg class="splash-live" :class="{{ 'splash-live-sm': size < 48 }}" viewBox="0 0 64 64" :width="size" :height="size" aria-hidden="true">
    <g class="flame-body">
      <path class="flame-layer layer-outer" d="{OUT_A}" />
      <path class="flame-layer layer-mid" d="{OUT_A}" />
      <path class="flame-layer layer-core" d="{COR_A}" />
    </g>
''' + ''.join(
    f'    <circle v-if="sparks" class="spark" cx="{x}" cy="{y}" r="{r}" style="--dx: {dx}px; --d: {d}s; --o: {o}s" />\n'
    for x, y, r, dx, d, o in SPARKS) + '''  </svg>
</template>
'''

def morph(name, a, b, c):
    return (f"@keyframes {name} {{\n  0%, 100% {{ d: path(\"{a}\"); }}\n  35% {{ d: path(\"{b}\"); }}\n  70% {{ d: path(\"{c}\"); }}\n}}\n")

CSS = f'''/* splash-flame:start (генерирует scripts/apply_splash_flame.py — не править руками) */
.splash-live .flame-body {{
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: flame-sway 1.9s ease-in-out infinite;
}}
.splash-live .flame-layer {{ transform-box: fill-box; transform-origin: 50% 100%; }}
.splash-live .layer-outer {{
  fill: var(--accent);
  animation: flame-morph-out 1.7s ease-in-out infinite;
}}
.splash-live .layer-mid {{
  fill: color-mix(in srgb, var(--accent) 60%, #ffffff);
  transform: scale(0.7);
  animation: flame-morph-out 1.3s ease-in-out -0.5s infinite;
}}
.splash-live .layer-core {{
  fill: color-mix(in srgb, var(--accent) 22%, #ffffff);
  animation: flame-morph-core 1.1s ease-in-out -0.3s infinite;
}}
.splash-live .spark {{
  fill: color-mix(in srgb, var(--accent) 45%, #ffffff);
  opacity: 0;
  animation: spark-rise var(--d, 2s) ease-out var(--o, 0s) infinite;
}}
@keyframes flame-sway {{
  0%, 100% {{ transform: scale(1, 1) skewX(0deg); }}
  35% {{ transform: scale(0.98, 1.05) skewX(-2deg); }}
  70% {{ transform: scale(1.02, 0.97) skewX(2deg); }}
}}
{morph("flame-morph-out", OUT_A, OUT_B, OUT_C)}{morph("flame-morph-core", COR_A, COR_B, COR_C)}/* splash-flame:end */
'''

PRE_CSS = f'''      /* splash-flame:start */
      .pre-live .fb {{ transform-box: fill-box; transform-origin: 50% 100%; animation: pre-sway 1.9s ease-in-out infinite; }}
      .pre-live .fl {{ transform-box: fill-box; transform-origin: 50% 100%; }}
      .pre-live .fo {{ fill: var(--pre-accent, #5b8def); animation: pre-mo 1.7s ease-in-out infinite; }}
      .pre-live .fm {{ fill: color-mix(in srgb, var(--pre-accent, #5b8def) 60%, #fff); transform: scale(0.7); animation: pre-mo 1.3s ease-in-out -0.5s infinite; }}
      .pre-live .fk {{ fill: color-mix(in srgb, var(--pre-accent, #5b8def) 22%, #fff); animation: pre-mk 1.1s ease-in-out -0.3s infinite; }}
      .pre-live .sp {{ fill: color-mix(in srgb, var(--pre-accent, #5b8def) 45%, #fff); opacity: 0; animation: pre-sp var(--d, 2s) ease-out var(--o, 0s) infinite; }}
      /* splash-flame:end */
'''
PRE_KF = ("      /* splash-flame-kf:start */\n"
  "      @keyframes pre-sway { 0%, 100% { transform: scale(1, 1) skewX(0deg); } 35% { transform: scale(0.98, 1.05) skewX(-2deg); } 70% { transform: scale(1.02, 0.97) skewX(2deg); } }\n"
  f"      @keyframes pre-mo {{ 0%, 100% {{ d: path(\"{OUT_A}\"); }} 35% {{ d: path(\"{OUT_B}\"); }} 70% {{ d: path(\"{OUT_C}\"); }} }}\n"
  f"      @keyframes pre-mk {{ 0%, 100% {{ d: path(\"{COR_A}\"); }} 35% {{ d: path(\"{COR_B}\"); }} 70% {{ d: path(\"{COR_C}\"); }} }}\n"
  "      /* splash-flame-kf:end */\n")
PRE_SVG = ('<svg class="pre-flame pre-live" viewBox="0 0 64 64" width="80" height="80">\n'
  '          <g class="fb">\n'
  f'            <path class="fl fo" d="{OUT_A}" />\n'
  f'            <path class="fl fm" d="{OUT_A}" />\n'
  f'            <path class="fl fk" d="{COR_A}" />\n'
  '          </g>\n' + ''.join(
  f'          <circle class="sp" cx="{x}" cy="{y}" r="{r}" style="--dx: {dx}px; --d: {d}s; --o: {o}s" />\n'
  for x, y, r, dx, d, o in SPARKS) + '        </svg>')

changed = 0
def put(path, new):
    global changed
    old = open(path, encoding='utf-8').read()
    if old != new:
        open(path, 'w', encoding='utf-8').write(new); changed += 1

for p in sorted(glob.glob('web-*/src/components/splash/SplashFlameLive.vue')):
    put(p, VUE)

for p in sorted(glob.glob('web-*/src/style.css')):
    t = open(p, encoding='utf-8').read()
    if 'splash-flame:start' in t:
        t = re.sub(r'/\* splash-flame:start.*?/\* splash-flame:end \*/\n', lambda m: CSS, t, flags=re.S)
    else:
        m = re.search(r'\.splash-live \.tongue \{.*?(?=@keyframes tongue-c)', t, flags=re.S)
        if not m:
            continue
        t = t[:m.start()] + CSS + t[m.end():]
    put(p, t)

for p in sorted(glob.glob('web-*/index.html')):
    t = open(p, encoding='utf-8').read()
    if '.pre-live' not in t:
        continue
    if 'splash-flame:start' in t:
        t = re.sub(r'      /\* splash-flame:start \*/.*?/\* splash-flame:end \*/\n', lambda m: PRE_CSS, t, flags=re.S)
        t = re.sub(r'      /\* splash-flame-kf:start \*/.*?/\* splash-flame-kf:end \*/\n', lambda m: PRE_KF, t, flags=re.S)
    else:
        t, n = re.subn(r'      \.pre-live \.tg \{.*?\.pre-live \.sp \{[^\n]*\n', lambda m: PRE_CSS, t, flags=re.S)
        t, n2 = re.subn(r'      @keyframes pre-tc .*?@keyframes pre-tk [^\n]*\n', lambda m: PRE_KF, t, flags=re.S)
        if not (n and n2):
            print('!! не найден блок пламени в', p); continue
    t = re.sub(r'<svg class="pre-flame pre-live".*?</svg>', lambda m: PRE_SVG, t, count=1, flags=re.S)
    put(p, t)

print('изменено файлов:', changed)
