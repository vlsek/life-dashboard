#!/usr/bin/env python3
"""Сводный файл ожидающих миграций для владельца.

В COORDINATION.md, раздел «### Ждёт владельца», агенты пишут пункты «Владельцу: применить миграцию `migrations/NNN_name.sql` …».
Владельцу приходится копировать их в Supabase SQL Editor по одной. Скрипт собирает ВСЕ такие миграции в один файл
`docs/pending_migrations_bundle.sql` в порядке номеров (при равных номерах — по имени), с заголовками и линтером «безопасен ли повтор».

Что считается ожидающей миграцией: путь `migrations/NNN_имя.sql` в пункте «- [ ]» раздела «Ждёт владельца», в тексте которого есть слово
«применить» (пункты «ответить на вопросы», «прогнать проверку» и т.п. без «применить» не берутся). Миграции НЕ изменяются и НЕ применяются.

Запуск: python3 scripts/build_pending_migrations.py            — пересобрать docs/pending_migrations_bundle.sql и напечатать отчёт
        python3 scripts/build_pending_migrations.py --check    — только отчёт и линтер, файл не пишется
Когда агент добавляет в «Ждёт владельца» новую миграцию (или владелец вычёркивает применённую) — перегенерировать.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COORD = os.path.join(ROOT, 'COORDINATION.md')
OUT = os.path.join(ROOT, 'docs', 'pending_migrations_bundle.sql')
BASELINE = os.path.join(ROOT, 'docs', 'sql-checks', 'migrations_applied_baseline.txt')  # «применено по N включительно» — подтверждение владельца


def baseline():
    """Номер, по который (включительно) владелец подтвердил применение. Миграции с номером <= baseline в сводку не идут. Нет файла — 0."""
    if not os.path.exists(BASELINE):
        return 0
    for line in open(BASELINE, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and line.isdigit():
            return int(line)
    return 0


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def pending_names(text):
    """Имена миграций (без .sql) из пунктов «- [ ]» раздела «Ждёт владельца», где есть «применить»."""
    k = text.find('### Ждёт владельца')
    if k < 0:
        raise SystemExit('в COORDINATION.md нет раздела «### Ждёт владельца»')
    m_end = re.search(r'\n#{2,3} ', text[k + 5:])  # раздел кончается на следующем заголовке уровня ## или ###; журнал (## Журнал) сюда не входит
    seg = text[k: k + 5 + m_end.start()] if m_end else text[k:]
    names, applied = set(), set()
    for item in re.split(r'\n- \[[ x]\]', seg)[1:]:
        found = re.findall(r'migrations/(\d{3}_[\w\-]+)\.sql', item)
        if not re.search(r'применить', item, re.I):
            continue
        # пункт, где уже написано «применена владельцем (дата)» / «применено» — миграция в сводку не идёт, но в отчёте остаётся
        if re.search(r'применен[аоы]\s+(владельцем|в\s+supabase)|уже\s+применен', item, re.I):
            applied.update(found)
        else:
            names.update(found)
    return names, applied


def catalog_names():
    """Все миграции каталога цен (`NNN_*catalog*.sql`): только upsert (`insert … on conflict do update`), повтор безопасен всегда.
    Входят в сводку как «страховка»: агенты не всегда вписывают их в «Ждёт владельца», а предмет без строки каталога купить нельзя."""
    return {f[:-4] for f in os.listdir(os.path.join(ROOT, 'migrations')) if re.match(r'\d{3}_.*catalog.*\.sql$', f)}


def sort_key(name):
    return (int(name[:3]), name)


# Линтер «повторный запуск безопасен?»: эвристика по тексту (комментарии `--` отрезаются). Не доказательство, а список мест для взгляда.
RULES = [
    (r'\bcreate\s+table\s+(?!if\s+not\s+exists)', 'create table без if not exists'),
    (r'\bcreate\s+(unique\s+)?index\s+(concurrently\s+)?(?!if\s+not\s+exists)', 'create index без if not exists'),
    (r'\balter\s+table\s+[\w\.\"]+\s+add\s+column\s+(?!if\s+not\s+exists)', 'add column без if not exists'),
    (r'\bcreate\s+(?!or\s+replace)(?:constraint\s+)?trigger\b', 'create trigger без or replace (нужен drop trigger if exists выше)'),
    (r'\bcreate\s+policy\b', 'create policy (нужен drop policy if exists выше)'),
    (r'\bcreate\s+type\b', 'create type (повтор упадёт)'),
    (r'\bcreate\s+(?!or\s+replace)(?:materialized\s+)?view\b', 'create view без or replace'),
    (r'\bcreate\s+(?!or\s+replace)function\b', 'create function без or replace'),
]


def strip_sql(s):
    s = re.sub(r'/\*.*?\*/', ' ', s, flags=re.S)
    s = re.sub(r'--[^\n]*', '', s)
    # тела функций ($$ … $$ или $тег$ … $тег$) исполняются при вызове, а не при применении миграции — для линтера их не смотрим
    return re.sub(r'(\$\w*\$).*?\1', ' ', s, flags=re.S)


def lint(name, sql):
    code = strip_sql(sql)
    low = code.lower()
    out = []
    for pat, msg in RULES:
        for m in re.finditer(pat, low):
            line = low.count('\n', 0, m.start()) + 1
            # «drop ... if exists» выше по тексту снимает предупреждение для trigger/policy
            if 'trigger' in msg or 'policy' in msg:
                kind = 'trigger' if 'trigger' in msg else 'policy'
                if re.search(r'\bdrop\s+' + kind + r'\s+if\s+exists', low[: m.start()]):
                    continue
            out.append((line, msg))
    # insert без on conflict в миграциях каталога/сидов
    for m in re.finditer(r'\binsert\s+into\s+([\w\.\"]+)', low):
        stmt_end = low.find(';', m.start())
        stmt = low[m.start(): stmt_end if stmt_end > 0 else len(low)]
        if 'on conflict' not in stmt and 'where not exists' not in stmt and 'select' not in stmt[:80] and 'values' in stmt:
            out.append((low.count('\n', 0, m.start()) + 1, 'insert … values без on conflict (повтор дублирует строки)'))
    if re.search(r'^\s*(begin|commit)\s*;', low, re.M):
        out.append((0, 'явные begin/commit внутри файла — в общий пакет вкладывать осторожно'))
    if re.search(r'^\s*\\\w', sql, re.M):
        out.append((0, 'psql-метакоманда (\\…) — SQL Editor не поймёт'))
    return out


def main():
    check = '--check' in sys.argv
    pend, applied = pending_names(read(COORD))
    base = baseline()
    below = sorted(n for n in (pend | catalog_names()) if int(n[:3]) <= base)  # применено владельцем (<= базовой линии)
    pend = {n for n in pend if int(n[:3]) > base}
    cat = {n for n in catalog_names() - pend if int(n[:3]) > base}
    names = sorted(pend | cat, key=sort_key)
    missing = [n for n in names if not os.path.exists(os.path.join(ROOT, 'migrations', n + '.sql'))]
    if missing:
        raise SystemExit('в «Ждёт владельца» названы файлы, которых нет в migrations/: ' + ', '.join(missing))
    parts, report = [], []
    for n in names:
        sql = read(os.path.join(ROOT, 'migrations', n + '.sql')).rstrip('\n')
        warns = lint(n, sql)
        report.append((n, warns))
        parts.append((n, sql, warns))
    # одинаковые номера — не ошибка, но стоит знать
    nums = [n[:3] for n in names]
    dup = sorted({x for x in nums if nums.count(x) > 1})
    if not parts:
        text = '\n'.join([
            '-- ============================================================================',
            '-- СВОДНЫЙ ФАЙЛ ОЖИДАЮЩИХ МИГРАЦИЙ (собран скриптом scripts/build_pending_migrations.py, руками не править)',
            '-- СЕЙЧАС ОЖИДАЮЩИХ МИГРАЦИЙ НЕТ: владелец подтвердил применение по %03d включительно.' % base,
            '-- Когда агенты добавят новые миграции (номер больше %03d), они появятся в этом файле автоматически — открывайте только его.' % base,
            '-- ============================================================================',
            "select 'ожидающих миграций нет (применено по %03d)' as \"результат\";" % base,
        ]) + '\n'
        print('В сводке: 0 файлов (применено по %03d включительно; пропущено как применённые: %d)' % (base, len(below)))
        if not check:
            with open(OUT, 'w', encoding='utf-8') as f:
                f.write(text)
            print('записан', os.path.relpath(OUT, ROOT), '(пустая сводка)')
        return

    head = [
        '-- ============================================================================',
        '-- СВОДНЫЙ ФАЙЛ ОЖИДАЮЩИХ МИГРАЦИЙ (собран скриптом scripts/build_pending_migrations.py, руками не править)',
        '-- Владелец подтвердил применение по %03d включительно — всё, что новее, ниже.' % base,
        '-- Состав (%d файлов): %d миграций из раздела «Ждёт владельца» COORDINATION.md (пункты «применить миграцию …») + %d «страховочных» миграций' % (len(parts), len(pend), len(cat)),
        '-- каталога цен (*catalog*: только insert … on conflict do update — безопасны всегда; агенты не всегда вписывают их в «Ждёт владельца»,',
        '-- а предмет без строки каталога купить нельзя: «неизвестный предмет»).',
        '-- КАК ПРИМЕНЯТЬ: Supabase → SQL Editor → вставить ВЕСЬ этот файл → Run. Порядок — по номерам (так и требуют пункты «ПОСЛЕ NNN»).',
        '-- Каждая миграция помечена агентом как «повтор безопасен», поэтому уже применённые проходят без вреда; при ошибке на каком-то месте',
        '-- пришлите её текст и номер файла — после исправления файл можно запускать снова целиком.',
        '-- ВНИМАНИЕ: миграции без пометки «ПОСЛЕ» всё равно идут строго по номерам; эти файлы дополняют уже применённые 001–056.',
        '-- Список файлов:',
    ] + ['--   %s   [%s]%s' % (n, 'ждёт владельца' if n in pend else 'страховка: каталог цен', '   [предупреждений линтера: %d]' % len(w) if w else '') for n, _s, w in parts]
    if dup:
        head.append('-- Одинаковые номера у разных файлов: %s — это разные миграции, порядок внутри номера по имени.' % ', '.join(dup))
    head.append('-- ============================================================================')
    body = []
    for n, sql, warns in parts:
        body.append('\n-- ----------------------------------------------------------------------------\n-- ФАЙЛ: migrations/%s.sql   [%s]' % (n, 'ждёт владельца' if n in pend else 'страховка: каталог цен'))
        if warns:
            body.append('-- ВНИМАНИЕ линтера повторного запуска (эвристика, проверьте глазами):')
            for line, msg in warns:
                body.append('--   %s%s' % ('строка %d: ' % line if line else '', msg))
        body.append('-- ----------------------------------------------------------------------------')
        body.append(sql)
    text = '\n'.join(head) + '\n' + '\n'.join(body) + '\n'

    print('В сводке: %d файлов = %d ожидающих + %d страховочных (каталог цен)' % (len(parts), len(pend), len(cat)))
    skipped = sorted(applied - pend)
    if skipped:
        print('Пропущены как «уже применена владельцем» (вычеркнуть в «Ждёт владельца»): %s' % ', '.join(skipped))
    for n, w in report:
        print('  %s%s%s' % (n, '' if n in pend else '  (каталог)', '  ⚠ %d' % len(w) if w else ''))
        for line, msg in w:
            print('      %s%s' % ('строка %d: ' % line if line else '', msg))
    if dup:
        print('Одинаковые номера:', ', '.join(dup))
    if not check:
        with open(OUT, 'w', encoding='utf-8') as f:
            f.write(text)
        print('записан', os.path.relpath(OUT, ROOT), '(%d КБ)' % (len(text.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()
