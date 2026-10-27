#!/usr/bin/env python3
"""Проба «какие миграции уже применены?» — один read-only SELECT для Supabase SQL Editor.

Для каждой миграции `migrations/NNN_*.sql` скрипт выписывает созданные ею объекты (функции, таблицы, колонки, индексы, триггеры, политики,
представления, строки каталога цен) и собирает ОДИН запрос по системным каталогам Postgres, который для каждой миграции показывает:
  ✅ применена (все объекты на месте) · ⚠️ частично (чего не хватает) · ❌ не применена · ℹ️ нет проверяемых объектов.
Только чтение: ничего не создаёт и не меняет. Результат — файл docs/sql-checks/migration_probe.sql.

Разбор SQL — регулярки (не полноценный парсер), поэтому:
  • объекты, которых нет в схеме ПОСЛЕ ВСЕХ миграций (позже удалены/переименованы), нужно отсеять: --prune "<команда>" прогоняет кандидатов через настоящий
    PostgreSQL с полностью мигрированной схемой и выкидывает отсутствующие (список сохраняется в docs/sql-checks/migration_probe_ignore.txt, и
    перегенерация БЕЗ PostgreSQL даёт тот же файл). Команда — шаблон с {file}, печатающий строки «миграция|вид|объект|t/f»,
    например:  --prune "su postgres -c 'psql -d bt_full -tA -F\\"|\\" -f {file}'";
  • без файла отсева и без --prune файл содержит всех кандидатов (возможны ложные «не хватает» для устаревших объектов).
Запуск: python3 scripts/build_migration_probe.py [--prune "<команда>"]   (--check — только отчёт, файлы не пишутся)
"""
import importlib.util, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'sql-checks', 'migration_probe.sql')
IGNORE = os.path.join(ROOT, 'docs', 'sql-checks', 'migration_probe_ignore.txt')  # объекты, отсеянные --prune: «миграция|вид|объект»

_spec = importlib.util.spec_from_file_location('bpm', os.path.join(ROOT, 'scripts', 'build_pending_migrations.py'))
_bpm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bpm)
strip_sql = _bpm.strip_sql  # без комментариев и без тел функций ($$…$$)


def q(s):
    return "'" + s.replace("'", "''") + "'"


def ident(s):
    return s.strip().strip('"').lower()


def objects_of(sql):
    code = strip_sql(sql)
    low = code.lower()
    found = []  # (kind, object)

    def add(kind, obj):
        if (kind, obj) not in found:
            found.append((kind, obj))

    for m in re.finditer(r'create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?("?\w+"?)\s*\(', low):
        add('function', ident(m.group(1)))
    for m in re.finditer(r'create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?("?\w+"?)', low):
        add('table', ident(m.group(1)))
    for m in re.finditer(r'create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?("?\w+"?)', low):
        add('view', ident(m.group(1)))
    for m in re.finditer(r'create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?("?\w+"?)', low):
        add('index', ident(m.group(1)))
    for m in re.finditer(r'create\s+(?:or\s+replace\s+)?trigger\s+("?\w+"?)', low):
        add('trigger', ident(m.group(1)))
    for m in re.finditer(r'create\s+policy\s+("[^"]+"|\w+)\s+on\s+(?:\w+\.)?("?\w+"?)', code, re.I):
        add('policy', ident(m.group(1)) + ' on ' + ident(m.group(2)))
    for m in re.finditer(r'alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?("?\w+"?)\s+([^;]*)', low):
        table = ident(m.group(1))
        for c in re.finditer(r'add\s+column\s+(?:if\s+not\s+exists\s+)?("?\w+"?)', m.group(2)):
            add('column', table + '.' + ident(c.group(1)))
    if 'customization_catalog' in low:
        for m in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,\s*'[a-z_]+'\s*,\s*'(?:points|achievement|coins|free)'", low):
            add('catalog', m.group(1))
    return found


def probe_expr(kind, obj):
    if kind == 'function':
        return "exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = %s)" % q(obj)
    if kind in ('table', 'view'):
        return 'to_regclass(%s) is not null' % q('public.' + obj)
    if kind == 'index':
        return "exists(select 1 from pg_indexes where indexname = %s)" % q(obj)
    if kind == 'trigger':
        return "exists(select 1 from pg_trigger where tgname = %s and not tgisinternal)" % q(obj)
    if kind == 'policy':
        pol, tab = obj.split(' on ')
        return "exists(select 1 from pg_policies where policyname = %s and tablename = %s)" % (q(pol), q(tab))
    if kind == 'column':
        tab, col = obj.split('.')
        return "exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = %s and column_name = %s)" % (q(tab), q(col))
    if kind == 'catalog':
        return ("case when to_regclass('public.customization_catalog') is null then false else "
                "(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from customization_catalog where item_key = %%L', %s), false, true, '')))[1]::text::int > 0 end" % q(obj))
    raise ValueError(kind)


def read_ignore():
    if not os.path.exists(IGNORE):
        return set()
    out = set()
    for line in open(IGNORE, encoding='utf-8'):
        line = line.rstrip('\n')
        if line and not line.startswith('#'):
            p = line.split('|', 2)
            if len(p) == 3:
                out.add(tuple(p))
    return out


def collect():
    rows = []  # (migration, kind, object)
    empty = []
    ignore = read_ignore()
    for f in sorted(os.listdir(os.path.join(ROOT, 'migrations'))):
        if not re.match(r'\d{3}_.*\.sql$', f):
            continue
        name = f[:-4]
        objs = objects_of(open(os.path.join(ROOT, 'migrations', f), encoding='utf-8').read())
        kept = [(k, o) for k, o in objs if (name, k, o) not in ignore]
        if not kept:
            empty.append(name)  # объектов нет вовсе или все отсеяны (исчезли позже)
        for kind, obj in kept:
            rows.append((name, kind, obj))
    return rows, empty


def rows_sql(rows):
    vals = ',\n  '.join('(%s, %s, %s, %s)' % (q(m), q(k), q(o), probe_expr(k, o)) for m, k, o in rows)
    return 'select migration, kind, object, present from (values\n  %s\n) as p(migration, kind, object, present)' % vals


def prune(rows, cmd):
    with tempfile.NamedTemporaryFile('w', suffix='.sql', delete=False, encoding='utf-8') as tf:
        tf.write(rows_sql(rows) + ';\n')
        path = tf.name
    os.chmod(path, 0o644)
    out = subprocess.run(cmd.format(file=path), shell=True, capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit('команда --prune упала:\n' + out.stderr[:800])
    present = {}
    for line in out.stdout.splitlines():
        parts = line.split('|')
        if len(parts) >= 4:
            present[(parts[0], parts[1], parts[2])] = parts[3].strip() == 't'
    keep, dropped = [], []
    for r in rows:
        (keep if present.get(r, False) else dropped).append(r)
    return keep, dropped


def build(rows, empty, dropped):
    vals = ',\n  '.join('(%s, %s, %s, %s)' % (q(m), q(k), q(o), probe_expr(k, o)) for m, k, o in rows)
    nones = ',\n  '.join("(%s, 'нет', 'нет проверяемых объектов', null::boolean)" % q(n) for n in empty)
    allvals = vals + (',\n  ' + nones if nones else '')
    head = [
        '-- ============================================================================',
        '-- ПРОБА «КАКИЕ МИГРАЦИИ УЖЕ ПРИМЕНЕНЫ» (собрана scripts/build_migration_probe.py, руками не править). ТОЛЬКО ЧТЕНИЕ.',
        '-- Supabase → SQL Editor → вставить ВЕСЬ файл → Run. Результат — таблица: по строке на миграцию:',
        '--   ✅ применена (все её объекты на месте) · ⚠️ частично (в колонке «не_хватает» — чего нет) · ❌ не применена · ℹ️ нет проверяемых объектов.',
        '-- Для каждой миграции проверяются созданные ею функции, таблицы, колонки, индексы, триггеры, политики, представления и строки каталога цен.',
        '-- Это эвристика по тексту миграций, а не доказательство: миграция, которая только ИЗМЕНЯЕТ данные или тело функции, помечается «ℹ️»,',
        '-- а переименованный позже объект мог быть отсеян. Не уверены — пришлите результат целиком.',
        '-- Проверено: полностью мигрированная схема → ни одной ❌/⚠️; схема только с 001–056 → не хватает ровно у 057+.',
        '-- Всего миграций в пробе: %d (из них без проверяемых объектов: %d); объектов: %d.' % (len({r[0] for r in rows}) + len(empty), len(empty), len(rows)),
    ]
    if dropped:
        head.append('-- Отсеяно как исчезнувшие/переименованные позже (на полностью мигрированной схеме их нет): %d.' % len(dropped))
    head.append('-- ============================================================================')
    sql = (
        'with probe(migration, kind, object, present) as (values\n  ' + allvals + '\n),\n'
        'summary as (\n'
        '  select migration,\n'
        '         count(*) filter (where present is not null) as total,\n'
        '         count(*) filter (where present) as ok,\n'
        "         string_agg(kind || ' ' || object, ', ' order by kind, object) filter (where present is false) as missing\n"
        '  from probe group by migration\n'
        ')\n'
        'select migration as "миграция",\n'
        "       case when total = 0 then 'ℹ️ нет проверяемых объектов'\n"
        "            when missing is null then '✅ применена'\n"
        "            when ok = 0 then '❌ НЕ применена'\n"
        "            else '⚠️ частично' end as \"статус\",\n"
        "       ok || '/' || total as \"объектов\",\n"
        '       missing as "не_хватает"\n'
        'from summary order by migration;\n'
    )
    return '\n'.join(head) + '\n' + sql


def main():
    args = sys.argv[1:]
    rows, empty = collect()
    dropped = sorted(read_ignore())  # отсев прошлого --prune (без PostgreSQL берём из файла)
    if '--prune' in args:
        rows, dropped = prune(rows, args[args.index('--prune') + 1])
        if '--check' not in args:  # сохраняем отсев, чтобы перегенерация без PostgreSQL давала тот же файл
            with open(IGNORE, 'w', encoding='utf-8') as f:
                f.write('# Объекты, исключённые из пробы: на схеме после ВСЕХ миграций их нет (удалены/переименованы позже). Формат: миграция|вид|объект.\n')
                f.write('# Файл пишется командой build_migration_probe.py --prune …; руками не править.\n')
                for m, k, o in dropped:
                    f.write('%s|%s|%s\n' % (m, k, o))
        have = {r[0] for r in rows}
        allnames = {r[0] for r in rows} | set(empty) | {d[0] for d in dropped}
        empty = sorted(set(empty) | (allnames - have))
    print('миграций: %d; объектов к проверке: %d; без проверяемых объектов: %d; отсеяно: %d' % (len({r[0] for r in rows}) + len(empty), len(rows), len(empty), len(dropped)))
    if dropped:
        by = {}
        for m, k, o in dropped:
            by.setdefault(m, []).append('%s %s' % (k, o))
        for m in sorted(by):
            print('  отсеяно %s: %s' % (m, ', '.join(by[m])[:140]))
    if '--check' not in args:
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        text = build(rows, sorted(empty), dropped)
        with open(OUT, 'w', encoding='utf-8') as f:
            f.write(text)
        print('записан', os.path.relpath(OUT, ROOT), '(%d КБ)' % (len(text.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()
