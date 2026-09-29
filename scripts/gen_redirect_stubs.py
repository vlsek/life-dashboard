#!/usr/bin/env python3
"""Генерирует корневые заглушки-редиректы для страниц, переехавших в фазе 2 на короткие адреса.

Старые адреса (`/goals.html`, `/english.html`, ...) после переезда классики в /legacy/ отдавали бы 404 —
ломаются закладки, установленные PWA и ссылки из писем. `_redirects` на Cloudflare Workers не работает
(см. docs/HANDOFF.md), поэтому — обычный HTML: meta refresh (без JS) + location.replace (с сохранением
?query и #hash). Запуск: python3 scripts/gen_redirect_stubs.py — идемпотентен.

Логин/Онбординг сюда пока НЕ входят (их переезд — отдельный этап, docs/PHASE2_DECISIONS.md, раздел 2).
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# старый файл в корне -> новый адрес пилота
STUBS = {
    "dashboard.html": "/dashboard/",
    "goals.html": "/goals/",
    "skills.html": "/skills/",
    "workouts.html": "/workouts/",
    "challenges.html": "/challenges/",
    "english.html": "/languages/",
    "calendar.html": "/calendar/",
    "milestones.html": "/milestones/",
    "shop.html": "/shop/",
    "community.html": "/community/",
    "history.html": "/history/",
    "account.html": "/account/",
}

TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url={target}">
<meta name="robots" content="noindex">
<title>Life Dashboard</title>
<script>location.replace("{target}" + location.search + location.hash);</script>
</head>
<body><p><a href="{target}">{target}</a></p></body>
</html>
"""

for name, target in STUBS.items():
    (ROOT / name).write_text(TEMPLATE.format(target=target), encoding="utf-8")
    print("wrote", name, "->", target)
