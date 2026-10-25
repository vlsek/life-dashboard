#!/usr/bin/env python3
"""Быстрая проверка, что СОБРАННЫЕ файлы целы: нет маркеров конфликта слияния и главные JS-бандлы разбираются (node --check).

Авария 21–23.10.2026: коммит «WIP rebuilt on merged sources» (разрешение конфликта при ребейзе) выложил бандлы account и community с маркерами
`<<<<<<<< HEAD:…` / `========` / `>>>>>>>> …` — git ставит 8 символов, а не 7, когда конфликтуют две версии переименованного хэш-файла, —
и обе страницы были пустыми у всех пользователей около двух суток. Эту проверку делает scripts/rebase_rebuild.sh перед коммитом,
а тест web-dashboard/src/builtBundlesSane.test.ts — в обычных тестах.

Запуск:  python3 scripts/check_built.py     (код выхода 1 и список файлов, если что-то сломано)
"""
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = re.compile(r'^(<{7,8} |>{7,8} |={7,8}$)', re.M)  # длинные разделители из «=» в docs/HANDOFF.md — не маркеры
EXTRA = ['sw.js', 'sw-assets.js', 'config.js', 'version.json', 'COORDINATION.md', 'docs/BACKLOG.md', 'docs/ROADMAP.md', 'docs/HANDOFF.md']


def out_dirs():
    dirs = []
    for cfg in sorted(glob.glob(os.path.join(ROOT, 'web-*', 'vite.config.ts'))):
        m = re.search(r"outDir:\s*'\.\./([^']+)'", open(cfg, encoding='utf-8').read())
        if m and os.path.isdir(os.path.join(ROOT, m.group(1))):
            dirs.append(m.group(1))
    return dirs


def main():
    bad = []
    checked = 0
    mains = []
    for d in out_dirs():
        for dirpath, _dirs, names in os.walk(os.path.join(ROOT, d)):
            for n in names:
                if re.search(r'\.(js|css|html|json|svg)$', n):
                    full = os.path.join(dirpath, n)
                    if MARKER.search(open(full, encoding='utf-8', errors='replace').read()):
                        bad.append(f'{os.path.relpath(full, ROOT)}: маркеры конфликта слияния')
        index = os.path.join(ROOT, d, 'index.html')
        if os.path.isfile(index):
            for m in re.finditer(r'src="/([^"]*assets/[^"]+\.js)"', open(index, encoding='utf-8').read()):
                mains.append(m.group(1))
    for f in EXTRA:
        full = os.path.join(ROOT, f)
        if os.path.isfile(full) and MARKER.search(open(full, encoding='utf-8', errors='replace').read()):
            bad.append(f'{f}: маркеры конфликта слияния')
    mains.append('header-widgets/header.js')
    tmp = tempfile.mkdtemp(prefix='ld-built-')
    try:
        for i, rel in enumerate(mains):
            src = os.path.join(ROOT, rel)
            if not os.path.isfile(src):
                continue
            dst = os.path.join(tmp, f'b{i}.mjs')
            shutil.copyfile(src, dst)
            r = subprocess.run(['node', '--check', dst], capture_output=True, text=True)
            checked += 1
            if r.returncode != 0:
                bad.append(f'{rel}: JS не разбирается — {r.stderr.strip().splitlines()[-1][:120] if r.stderr.strip() else "?"}')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if bad:
        print('СОБРАННЫЕ ФАЙЛЫ СЛОМАНЫ — не коммитьте и не пушьте, пересоберите пилот из слитых исходников:')
        for b in bad:
            print(' -', b)
        sys.exit(1)
    print(f'собранные файлы целы: маркеров нет, {checked} JS-бандлов разбираются')


if __name__ == '__main__':
    main()
