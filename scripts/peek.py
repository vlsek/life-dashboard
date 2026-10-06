#!/usr/bin/env python3
"""Безопасный просмотр текстовых файлов с кириллицей (замена `cut -c`, `head -c`, `tail -c`, `sed -n | cut`).

Почему: `cut -c`/`head -c` режут по БАЙТАМ и рвут многобайтовые символы UTF-8 посередине; вывод с «битым» символом инструмент
не принимает целиком («output was not valid UTF-8») — пропадает весь вывод, а не одна строка. Этот скрипт режет по СИМВОЛАМ.

Примеры:
  python3 scripts/peek.py docs/BACKLOG.md 570 590          строки 570–590, каждая обрезана до 300 символов
  python3 scripts/peek.py docs/BACKLOG.md 570 590 -w 1500  то же, но до 1500 символов в строке
  python3 scripts/peek.py COORDINATION.md -g 'Агент 7' -w 200   только строки с совпадением (регэксп, без учёта регистра)
  python3 scripts/peek.py docs/ROADMAP.md -t 5             последние 5 строк
  python3 scripts/peek.py docs/BACKLOG.md --outline        только заголовки (# …) с номерами строк
Вывод команд git/grep с кириллицей: `git log … | python3 scripts/peek.py -` (читает stdin).
"""
import argparse
import re
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('file', help='путь к файлу или - для stdin')
    ap.add_argument('start', nargs='?', type=int, help='первая строка (с 1)')
    ap.add_argument('end', nargs='?', type=int, help='последняя строка (включительно)')
    ap.add_argument('-w', '--width', type=int, default=300, help='макс. символов в строке (по умолчанию 300; 0 — без обрезки)')
    ap.add_argument('-g', '--grep', help='показать только строки, подходящие под регэксп')
    ap.add_argument('-t', '--tail', type=int, help='показать последние N строк')
    ap.add_argument('--outline', action='store_true', help='только строки-заголовки markdown')
    a = ap.parse_args()

    raw = sys.stdin.buffer.read() if a.file == '-' else open(a.file, 'rb').read()
    lines = raw.decode('utf-8', errors='replace').split('\n')
    rows = list(enumerate(lines, 1))
    if a.outline:
        rows = [(n, l) for n, l in rows if l.startswith('#')]
    if a.grep:
        rx = re.compile(a.grep, re.I)
        rows = [(n, l) for n, l in rows if rx.search(l)]
    if a.start is not None:
        end = a.end if a.end is not None else a.start
        rows = [(n, l) for n, l in rows if a.start <= n <= end]
    if a.tail:
        rows = rows[-a.tail:]

    out = sys.stdout
    try:
        out.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    for n, l in rows:
        if a.width and len(l) > a.width:
            l = l[: a.width] + f'… [+{len(l) - a.width} симв.]'
        out.write(f'{n}\t{l}\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
