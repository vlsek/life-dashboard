#!/usr/bin/env python3
"""Проверка внутренних ссылок сайта на мёртвые адреса (без сети, только по файлам репозитория).

Зачем: переезды страниц фазы 2 уже дважды ломали меню (v1.15, v1.16). Скрипт ловит такое до пуша.

Что проверяется:
  1. Внутренние адреса в исходниках: классика (корневые *.js/*.html, legacy/), исходники пилотов (web-*/src),
     config.js (pages[]: href и vue), sw.js (ASSETS), manifest.json (start_url), корневые заглушки.
  2. Относительные ссылки внутри legacy/*.html (../style.css и т.п.).
  3. Собранные пилоты: каждый /<страница>/assets/... из <страница>/index.html существует.

Как «Cloudflare Workers Assets» резолвит адрес (html_handling = auto-trailing-slash):
  /x/  -> x/index.html;  /x -> x.html, иначе x/index.html;  /x.html -> x.html (потом 308 на /x);  прочее -> файл как есть.

Запуск: python3 scripts/check_dead_links.py      (код возврата 1, если есть мёртвые ссылки)
Добавляйте в IGNORE адреса, которых в репозитории быть не должно (внешние прокси, генерируемое рантаймом).
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IGNORE = {"/", "/api", "/favicon.ico"}  # корень раздаёт index.html; остальное — не страницы репозитория


def exists(url_path: str) -> bool:
    """Существует ли ресурс, на который приведёт браузер по внутреннему адресу (без ?query и #hash)."""
    p = url_path.split("#")[0].split("?")[0]
    if p in IGNORE:
        return True
    rel = p.lstrip("/")
    if p.endswith("/"):
        return os.path.isfile(os.path.join(ROOT, rel, "index.html"))
    full = os.path.join(ROOT, rel)
    if os.path.isfile(full):
        return True
    if not os.path.splitext(rel)[1]:  # /x без расширения: x.html или x/index.html
        return os.path.isfile(full + ".html") or os.path.isfile(os.path.join(full, "index.html"))
    return False


def read(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def rel(path):
    return os.path.relpath(path, ROOT)


problems = []


def bad(where, target, note=""):
    problems.append(f"{where}: {target} {note}".rstrip())


# Внутренний адрес в кавычках, стоящий в контексте перехода: href=, location.href=, location.replace(, href: и т.п.
CTX = re.compile(
    r"""(?:href\s*[=:]\s*|location\.(?:href\s*=|replace\()\s*|window\.open\(\s*|to=|:href=)
        (?:"|')(/[A-Za-z0-9_\-./]*(?:\.html)?)(?:[?#][^"']*)?(?:"|')""",
    re.X,
)

# 1. Исходники
sources = (
    [p for p in glob.glob(os.path.join(ROOT, "*.js")) if not p.endswith("sw.js")]
    + glob.glob(os.path.join(ROOT, "legacy", "*.js"))
    + glob.glob(os.path.join(ROOT, "legacy", "*.html"))
    + glob.glob(os.path.join(ROOT, "*.html"))
    + [
        p
        for p in glob.glob(os.path.join(ROOT, "web-*", "src", "**", "*"), recursive=True)
        if p.endswith((".vue", ".ts")) and not p.endswith((".test.ts", ".d.ts"))
    ]
)
for path in sources:
    for m in CTX.finditer(read(path)):
        if not exists(m.group(1)):
            bad(rel(path), m.group(1))

# config.js: pages[] — href относительно корня, vue: "x/" -> /x/
cfg = read(os.path.join(ROOT, "config.js"))
for m in re.finditer(r'\{\s*href:\s*"([^"]+)",\s*key:\s*"[^"]+"[^}]*?(?:vue:\s*"([^"]+)")?\s*\}', cfg):
    if not exists("/" + m.group(1)):
        bad("config.js pages[]", m.group(1))
    if m.group(2) and not exists("/" + m.group(2)):
        bad("config.js pages[] vue", m.group(2))

# sw.js ASSETS
sw = read(os.path.join(ROOT, "sw.js"))
assets = re.search(r"ASSETS\s*=\s*\[(.*?)\]", sw, re.S)
if assets:
    for a in re.findall(r'"(/[^"]*)"', assets.group(1)):
        if not exists(a):
            bad("sw.js ASSETS", a)

# manifest
man = json.loads(read(os.path.join(ROOT, "manifest.json")))
if not exists(man.get("start_url", "/")):
    bad("manifest.json start_url", man.get("start_url"))
for sc in man.get("shortcuts", []):
    if not exists(sc.get("url", "/")):
        bad("manifest.json shortcut", sc.get("url"))
for ic in man.get("icons", []):
    if not exists(ic["src"] if ic["src"].startswith("/") else "/" + ic["src"]):
        bad("manifest.json icon", ic["src"])

# 2. Относительные ссылки в legacy/*.html
for path in glob.glob(os.path.join(ROOT, "legacy", "*.html")):
    for m in re.finditer(r'(?:href|src)="([^"#?:]+)"', read(path)):
        if m.group(1).startswith(("/", "//")):
            continue
        if not os.path.isfile(os.path.normpath(os.path.join(os.path.dirname(path), m.group(1)))):
            bad(rel(path), m.group(1), "(относительный путь не найден)")

# 3. Собранные пилоты: ассеты из <страница>/index.html
for idx in glob.glob(os.path.join(ROOT, "*", "index.html")):
    d = os.path.basename(os.path.dirname(idx))
    if not os.path.isdir(os.path.join(ROOT, "web-" + d)):
        continue
    for m in re.finditer(r'(?:href|src)="(/[^"]+)"', read(idx)):
        if not exists(m.group(1)):
            bad(f"{d}/index.html", m.group(1), "(пилот не пересобран?)")
    if not read(idx).count(f'/{d}/'):
        bad(f"{d}/index.html", f"нет базового пути /{d}/", "(base в vite.config.ts не совпадает с папкой?)")

if problems:
    print(f"Мёртвых ссылок: {len(problems)}")
    for p in sorted(set(problems)):
        print("  -", p)
    sys.exit(1)
print("OK: мёртвых внутренних ссылок нет")
