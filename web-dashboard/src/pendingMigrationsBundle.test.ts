import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { execFileSync } from 'node:child_process'
// @ts-ignore
import { readFileSync } from 'node:fs'

// Сводный файл ожидающих миграций для владельца (scripts/build_pending_migrations.py → docs/pending_migrations_bundle.sql).
// Страж: каждая миграция, названная в «Ждёт владельца» («применить миграцию …»), ОБЯЗАНА быть в сводке; иначе владелец пропустит её.
// Красный тест = добавили миграцию в «Ждёт владельца», а сводку не пересобрали: `python3 scripts/build_pending_migrations.py` (при конфликте файла — тоже пересобрать).
const ROOT = '..'
const run = (): string => execFileSync('python3', ['scripts/build_pending_migrations.py', '--check'], { cwd: ROOT, encoding: 'utf-8' }) as string

describe('сводный файл ожидающих миграций', () => {
  const report: string = run()
  const bundle: string = readFileSync(`${ROOT}/docs/pending_migrations_bundle.sql`, 'utf-8')
  const names: string[] = report.split('\n').map((l: string) => /^ {2}(\d{3}_[\w-]+)/.exec(l)?.[1] ?? '').filter(Boolean)

  it('скрипт отрабатывает: все названные в «Ждёт владельца» файлы существуют, список не пуст', () => {
    expect(names.length).toBeGreaterThanOrEqual(10)
    expect(report).toContain('В сводке:')
  })

  it('каждая миграция из списка есть в сводном файле, и порядок — по номерам', () => {
    const inBundle = [...bundle.matchAll(/^-- ФАЙЛ: migrations\/(\S+)\.sql/gm)].map((m) => m[1])
    for (const n of names) expect(inBundle, `${n} нет в docs/pending_migrations_bundle.sql — перегенерируйте: python3 scripts/build_pending_migrations.py`).toContain(n)
    const sorted = [...inBundle].sort((a, b) => Number(a.slice(0, 3)) - Number(b.slice(0, 3)) || (a < b ? -1 : 1))
    expect(inBundle).toEqual(sorted)
  })

  it('в сводке нет psql-метакоманд и явных begin/commit (SQL Editor их не поймёт)', () => {
    const code = bundle.replace(/--[^\n]*/g, '')
    expect(code).not.toMatch(/^\s*\\\w/m)
    expect(code).not.toMatch(/^\s*(begin|commit)\s*;/im)
  })
})
