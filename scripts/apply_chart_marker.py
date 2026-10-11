#!/usr/bin/env python3
"""Копирует web-dashboard/src/lib/chartMarker.ts и chartLine.ts в web-customization/src/lib/ БЕЗ изменений (стили маркеров и
линии графиков, BACKLOG 13:54 и 55.2). Править только в Дашборде. Идемпотентно."""
changed = 0
for name in ('chartMarker.ts', 'chartLine.ts'):
    src = open(f'web-dashboard/src/lib/{name}', encoding='utf-8').read()
    dst = f'web-customization/src/lib/{name}'
    try: cur = open(dst, encoding='utf-8').read()
    except FileNotFoundError: cur = None
    if cur != src:
        open(dst, 'w', encoding='utf-8').write(src); changed += 1
print('изменено файлов:', changed)
