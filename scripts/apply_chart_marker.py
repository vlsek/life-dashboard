#!/usr/bin/env python3
"""Копирует web-dashboard/src/lib/chartMarker.ts в web-customization/src/lib/ БЕЗ изменений (стили маркеров графиков,
BACKLOG 13:54). Править только в Дашборде. Идемпотентно."""
src = open('web-dashboard/src/lib/chartMarker.ts', encoding='utf-8').read()
dst = 'web-customization/src/lib/chartMarker.ts'
try: cur = open(dst, encoding='utf-8').read()
except FileNotFoundError: cur = None
if cur != src: open(dst, 'w', encoding='utf-8').write(src)
print('изменено файлов:', int(cur != src))
