import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в newGoalCopy.test.ts).
import { readdirSync } from 'node:fs'

// Номера миграций в `migrations/` не должны повторяться. Два агента, взявшие один свободный номер, получают два файла `109_*.sql`: git склеивает их БЕЗ конфликта,
// а владелец применяет их в порядке имён и не видит разницы. Так случалось (104, 106, 109 брали по двое). Единственный исторический дубль — 061 (допущен до этого правила).
// Свободный номер берите ПОСЛЕ `git fetch` (`ls migrations | tail`), перед пушем проверьте ещё раз.
const LEGACY_DUPLICATES = new Set(['061'])
const files: string[] = (readdirSync('../migrations') as string[]).filter((f: string) => f.endsWith('.sql'))
const numbered = files.filter((f) => /^\d/.test(f))

describe('номера миграций', () => {
  it('файлов с номерами больше сотни (иначе страж ничего не проверяет)', () => {
    expect(numbered.length).toBeGreaterThan(100)
  })
  it('имя — три цифры, подчёркивание, латиница в нижнем регистре: `109_catalog_x.sql`', () => {
    const bad = numbered.filter((f) => !/^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    expect(bad).toEqual([])
  })
  it('номера не повторяются (кроме исторического 061)', () => {
    const by = new Map<string, string[]>()
    for (const f of numbered) by.set(f.slice(0, 3), [...(by.get(f.slice(0, 3)) ?? []), f])
    const dups = [...by.entries()].filter(([n, list]) => list.length > 1 && !LEGACY_DUPLICATES.has(n)).map(([n, list]) => `${n}: ${list.join(' + ')}`)
    expect(dups, 'два файла с одним номером — переименуйте свой в следующий свободный').toEqual([])
  })
  it('исторический дубль 061 всё ещё ровно два файла (если исчез — уберите его из списка исключений)', () => {
    expect(numbered.filter((f) => f.startsWith('061_'))).toHaveLength(2)
  })
})
