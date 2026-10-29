#!/usr/bin/env python3
"""Дописывает в КОНЕЦ web-*/src/style.css единый блок «минимум цели нажатия на телефоне» (BACKLOG 576 / 60.2 п.4).
Идемпотентно (маркер `/* tap-targets */`). Блок меняется ТОЛЬКО здесь, потом `python3 scripts/apply_tap_targets.py` и пересборка пилотов.
Не затрагивает web-header (отдельный бандл header.css). Охват: все остальные пилоты, включая dashboard/workouts/customization (с v6.66)."""
import glob, io

SKIP = ('web-header',)
BLOCK = r"""
/* Минимум цели нажатия на телефоне (BACKLOG 576 / 60.2 п.4): аудит Chromium 390 px нашёл кнопки 24–27 px (вкладки «Магазина»,
   фильтры «Достижений», чипы «Навыков», стрелки «Календаря»). Правило только ПОДТЯГИВАЕТ мелкое до 32 px (min-*), крупные кнопки не меняет.
   Исключены: значок-подсказка `.ph-btn` (зона нажатия расширена через ::after), абсолютно позиционированные крестики/точки. Источник — `scripts/apply_tap_targets.py`. */
/* tap-targets */
@media (max-width: 640px) {
  button:not(.ph-btn):not([class*='absolute']),
  a[href].secondary {
    min-height: 32px;
    min-width: 32px;
  }
}
"""
MARK = '/* tap-targets */'

def main():
    n = 0
    for p in sorted(glob.glob('web-*/src/style.css')):
        if p.split('/')[0] in SKIP:
            continue
        t = io.open(p, encoding='utf-8').read()
        if MARK in t:
            continue
        io.open(p, 'w', encoding='utf-8').write(t.rstrip('\n') + '\n' + BLOCK)
        n += 1
        print('+', p)
    print('updated:', n)

if __name__ == '__main__':
    main()
