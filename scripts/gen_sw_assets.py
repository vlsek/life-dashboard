#!/usr/bin/env python3
"""Список предкэша для service worker'а (BACKLOG 66.3, срез 1).

Читает СОБРАННЫЕ папки пилотов (outDir из web-*/vite.config.ts) и пишет `sw-assets.js` в корень:

    self.LD_SW = { version: "<хэш содержимого>", pages: ["/dashboard/", …], assets: ["/dashboard/assets/index-XXXX.js", …], runtime: […] }

`sw.js` подключает его через importScripts. Браузер сравнивает байты и главного скрипта, и импортированных, поэтому любая пересборка
пилота (новое хэшированное имя файла) → новый `sw-assets.js` → новый service worker → новый кэш `ld-shell-<version>`; ручной бамп
ld-shell-vNN больше не нужен. Версия считается по СОДЕРЖИМОМУ всех файлов списка, а не только по именам: файлы без хэша в имени
(/header-widgets/header.js, manifest, иконки, version.json) меняются на месте.

Запускать после КАЖДОЙ пересборки пилотов (scripts/rebase_rebuild.sh делает это сам). Тест web-dashboard/src/swShell.test.ts
проверяет, что список актуален (все ассеты страниц на диске в списке, висячих ссылок нет).

Запуск:  python3 scripts/gen_sw_assets.py          (записывает sw-assets.js)
         python3 scripts/gen_sw_assets.py --check  (код выхода 1, если файл устарел)
"""
import glob
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sw-assets.js')

# Файлы корня, которые страницы пилотов подгружают сами (без хэша в имени): меняются на месте, поэтому sw.js берёт их «сеть, потом кэш».
ROOT_RUNTIME = ['/manifest.json', '/version.json', '/favicon.svg']
# /version.json меняется при КАЖДОМ релизе (gen_version_json.py идёт уже после сборки) и отдаётся «сеть, потом кэш» — в хэш версии кэша его не берём,
# иначе список «устаревал» бы после каждой записи релиза. Страницы пилотов меняют версию кэша сами (новые хэшированные имена файлов).
HASH_EXCLUDE = {'/version.json'}
ICONS_DIR = 'icons'


def out_dirs():
    """outDir каждого пилота: web-*/vite.config.ts → '../<папка>'."""
    result = []
    for cfg in sorted(glob.glob(os.path.join(ROOT, 'web-*', 'vite.config.ts'))):
        m = re.search(r"outDir:\s*'\.\./([^']+)'", open(cfg, encoding='utf-8').read())
        if m and os.path.isdir(os.path.join(ROOT, m.group(1))):
            result.append(m.group(1))
    return result


def walk(rel_dir):
    base = os.path.join(ROOT, rel_dir)
    for dirpath, _dirs, files in os.walk(base):
        for f in sorted(files):
            full = os.path.join(dirpath, f)
            yield '/' + os.path.relpath(full, ROOT).replace(os.sep, '/')


def build():
    pages, assets, runtime = [], [], list(ROOT_RUNTIME)
    for d in out_dirs():
        has_index = os.path.isfile(os.path.join(ROOT, d, 'index.html'))
        for url in walk(d):
            if has_index and url == f'/{d}/index.html':
                pages.append(f'/{d}/')  # страница пилота: адрес с косой чертой в конце; /index.html sw.js приводит к нему же
            elif '/assets/' in url:
                assets.append(url)  # хэшированные файлы сборки (cache-first, неизменяемые)
            else:
                runtime.append(url)  # без хэша в имени (favicon.svg пилота, /header-widgets/header.js …)
    if os.path.isdir(os.path.join(ROOT, ICONS_DIR)):
        runtime += list(walk(ICONS_DIR))
    pages = sorted(set(pages))
    assets = sorted(set(assets))
    runtime = sorted({u for u in runtime if os.path.isfile(os.path.join(ROOT, u.lstrip('/')))})
    # версия — по содержимому всех файлов списка (страницы — по их index.html)
    h = hashlib.sha1()
    for url in sorted(set(pages + assets + runtime)):
        if url in HASH_EXCLUDE:
            continue
        path = url.lstrip('/')
        if url.endswith('/'):
            path += 'index.html'
        h.update(url.encode('utf-8'))
        h.update(b'\0')
        h.update(open(os.path.join(ROOT, path), 'rb').read())
        h.update(b'\0')
    return {'version': h.hexdigest()[:10], 'pages': pages, 'assets': assets, 'runtime': runtime}


def render(data):
    lines = [
        '// АВТОГЕНЕРАЦИЯ: scripts/gen_sw_assets.py (BACKLOG 66.3). Не править руками; запускать после каждой пересборки пилотов.',
        '// Подключается из sw.js (importScripts): изменился этот файл → браузер ставит новый service worker и новый кэш ld-shell-<version>.',
        'self.LD_SW = {',
        f'  version: {json.dumps(data["version"])},',
    ]
    for key in ('pages', 'assets', 'runtime'):
        lines.append(f'  {key}: [')
        lines += [f'    {json.dumps(u)},' for u in data[key]]
        lines.append('  ],')
    lines.append('}')
    return '\n'.join(lines) + '\n'


def main():
    text = render(build())
    current = open(OUT, encoding='utf-8').read() if os.path.isfile(OUT) else ''
    if '--check' in sys.argv:
        if text != current:
            print('sw-assets.js устарел — запустите python3 scripts/gen_sw_assets.py')
            sys.exit(1)
        print('sw-assets.js актуален')
        return
    if text != current:
        open(OUT, 'w', encoding='utf-8', newline='').write(text)
        print('sw-assets.js обновлён')
    else:
        print('sw-assets.js без изменений')


if __name__ == '__main__':
    main()
