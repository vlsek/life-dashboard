import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { execFileSync } from 'node:child_process'
// @ts-ignore
import { readFileSync, readdirSync } from 'node:fs'

// Проба «какие миграции уже применены» (scripts/build_migration_probe.py → docs/sql-checks/migration_probe.sql): владелец запускает её в SQL Editor.
// Главное свойство — ТОЛЬКО ЧТЕНИЕ: файл не имеет права что-то создавать/менять/удалять. Остальное — разумное покрытие и согласованность с генератором.
const ROOT = '..'
const probe: string = readFileSync(`${ROOT}/docs/sql-checks/migration_probe.sql`, 'utf-8')
// Без комментариев и без строковых литералов ('…' с удвоенными кавычками): внутри строк лежат имена объектов и «select count(*)» для query_to_xml.
const code = probe.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''")

describe('проба применённых миграций (read-only)', () => {
  it('это один запрос with … select, без записи: нет insert/update/delete/create/drop/alter/truncate/grant', () => {
    expect(code).toMatch(/^\s*with probe\(/)
    expect(code).not.toMatch(/\b(insert|update|delete|create|drop|alter|truncate|grant|revoke|execute|call|do)\b/i)
    expect((code.match(/;/g) ?? []).length).toBe(1) // один оператор
  })

  it('покрывает почти все миграции репозитория (кроме разовых seed-файлов) и объекты разных видов', () => {
    const files: string[] = (readdirSync(`${ROOT}/migrations`) as string[]).filter((f) => /^\d{3}_.*\.sql$/.test(f)).map((f) => f.replace(/\.sql$/, ''))
    const inProbe = new Set([...probe.matchAll(/^\s*\('(\d{3}_[^']+)', '/gm)].map((m) => m[1]))
    const missing = files.filter((f) => !inProbe.has(f))
    // новые миграции могут быть ещё не в пробе (это не ошибка: они идут через «Ждёт владельца»/сводку), но основная масса должна быть
    expect(inProbe.size).toBeGreaterThanOrEqual(100)
    expect(missing.length, `в пробе нет: ${missing.join(', ')} — перегенерируйте: python3 scripts/build_migration_probe.py`).toBeLessThanOrEqual(15)
    for (const kind of ['function', 'table', 'column', 'trigger', 'policy', 'catalog']) expect(probe, kind).toContain(`'${kind}'`)
  })

  it('генератор отрабатывает (--check) и список отсеянных объектов читается', () => {
    const out = execFileSync('python3', ['scripts/build_migration_probe.py', '--check'], { cwd: ROOT, encoding: 'utf-8' }) as string
    expect(out).toContain('миграций:')
    const ignore: string = readFileSync(`${ROOT}/docs/sql-checks/migration_probe_ignore.txt`, 'utf-8')
    for (const l of ignore.split('\n').filter((x: string) => x && !x.startsWith('#'))) expect(l.split('|').length, l).toBe(3)
  })

  it('на пользователя в ответе: русские статусы и понятные колонки', () => {
    for (const s of ['✅ применена', '❌ НЕ применена', '⚠️ частично', 'ℹ️ нет проверяемых объектов']) expect(probe).toContain(s)
    for (const c of ['"миграция"', '"статус"', '"объектов"', '"не_хватает"']) expect(probe).toContain(c)
  })
})
