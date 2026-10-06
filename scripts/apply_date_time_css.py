#!/usr/bin/env python3
"""Дописывает в КОНЕЦ web-*/src/style.css единый блок для нативных полей даты/времени (BACKLOG 567).
Идемпотентно (маркер `/* date-time-fields */`). Блок меняется ТОЛЬКО здесь, потом `python3 scripts/apply_date_time_css.py`
и пересборка пилотов. web-header (отдельный бандл, `header.css`) не затрагивается."""
import glob, io

BLOCK = r"""
/* Нативные поля даты и времени (BACKLOG 567, «Аудит устаревшего оформления»): единый вид вместо системного «из 2000-х».
   (1) color-scheme для четырёх исходных тем: в пилотах он задан только у новых тем (блок `themes-scheme` выше), без него на тёмной
   теме значок календаря и всплывающий пикер остаются светлыми. (2) Значок календаря/часов — спокойный, при наведении подсвечивается
   акцентом темы. Фон, рамку и размеры поля правило НЕ трогает (у каждого поля свои классы); прозрачный input внутри DateStepper
   (opacity: 0) от правила не меняется. Источник — `scripts/apply_date_time_css.py`. */
/* date-time-fields */
html.theme-dark,
html.theme-monet { color-scheme: dark; }
html.theme-light,
html.theme-pink { color-scheme: light; }
input[type='date'],
input[type='time'] {
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}
input[type='date']::-webkit-calendar-picker-indicator,
input[type='time']::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  border-radius: 6px;
  padding: 3px;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}
input[type='date']::-webkit-calendar-picker-indicator:hover,
input[type='time']::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
  background-color: color-mix(in srgb, var(--accent) 22%, transparent);
}
"""
MARK = '/* date-time-fields */'

def main():
    n = 0
    for p in sorted(glob.glob('web-*/src/style.css')):
        t = io.open(p, encoding='utf-8').read()
        if MARK in t:
            continue
        io.open(p, 'w', encoding='utf-8').write(t.rstrip('\n') + '\n' + BLOCK)
        n += 1
        print('+', p)
    print('updated:', n)

if __name__ == '__main__':
    main()
