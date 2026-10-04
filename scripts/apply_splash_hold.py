#!/usr/bin/env python3
"""Кладёт общий скрипт «удержания заставки» (scripts/splash-hold.snippet.html) во все web-*/index.html.

Идемпотентно: блок между <!-- splash-hold:start ... --> и <!-- splash-hold:end --> заменяется целиком; если его нет —
вставляется перед <script type="module" src="/src/main.ts"></script>. Запуск из корня репозитория: python3 scripts/apply_splash_hold.py
"""
import glob
import re
import sys

SNIPPET = open('scripts/splash-hold.snippet.html', encoding='utf-8').read().rstrip('\n')
ANCHOR = '    <script type="module" src="/src/main.ts"></script>'
BLOCK = re.compile(r'[ \t]*<!-- splash-hold:start.*?<!-- splash-hold:end -->', re.S)

changed = 0
for path in sorted(glob.glob('web-*/index.html')):
    text = open(path, encoding='utf-8').read()
    if BLOCK.search(text):
        new = BLOCK.sub(lambda m: '    ' + SNIPPET.lstrip(), text, count=1)
    else:
        if ANCHOR not in text:
            print('НЕТ ЯКОРЯ:', path)
            sys.exit(1)
        new = text.replace(ANCHOR, '    ' + SNIPPET.lstrip() + '\n' + ANCHOR, 1)
    if new != text:
        open(path, 'w', encoding='utf-8').write(new)
        changed += 1
print('обновлено страниц:', changed)
