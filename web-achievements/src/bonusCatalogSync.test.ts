import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readdirSync, readFileSync } from 'node:fs'
import { coinBonusesDue } from './lib/coinBonuses'
import { REWARDS } from './lib/rewards'

// Серверный каталог бонусных монет (`achievement_bonus_catalog`, миграция 062 и последующие) должен совпадать с монетными наградами реестра `REWARDS`:
// сумму знает сервер, и если значка в каталоге нет, `claim_achievement_bonuses()` монет за него не выдаст (а клиент подумает, что всё в порядке).
// Тест читает insert-строки всех миграций, начиная с 062, и сверяет с реестром. Падение значит: изменён размер или набор монетных ступеней без миграции.
// Тест печатает готовые SQL-строки для НОВОЙ миграции (образец — 062).
const dir = '../migrations'
const files: string[] = readdirSync(dir).filter((f: string) => /^\d{3}_.*\.sql$/.test(f) && Number(f.slice(0, 3)) >= 62).sort()
const catalog = new Map<string, number>()
for (const f of files) {
  const sql: string = readFileSync(`${dir}/${f}`, 'utf-8')
  for (const m of sql.matchAll(/insert into achievement_bonus_catalog[^;]*?values([^;]*);/gis)) {
    for (const r of m[1].matchAll(/\('([a-z_0-9]+)',\s*(\d+(?:\.\d+)?)\)/g)) catalog.set(r[1], Number(r[2]))
  }
}
const due = coinBonusesDue(Object.keys(REWARDS))
const sqlRow = (b: { key: string; coins: number }) => `  ('${b.key}', ${b.coins})`

describe('серверный каталог бонусных монет = клиентский реестр', () => {
  it('каждая монетная награда реестра есть в каталоге с той же суммой', () => {
    const wrong = due.filter((b) => catalog.get(b.key) !== b.coins)
    expect(
      wrong.map(sqlRow),
      'Нет в каталоге или другая сумма — добавьте новой миграцией:\ninsert into achievement_bonus_catalog (key, coins) values\n' + wrong.map(sqlRow).join(',\n') + '\non conflict (key) do update set coins = excluded.coins;',
    ).toEqual([])
  })
  it('в каталоге нет значков без монетной награды в реестре', () => {
    const keys = new Set(due.map((b) => b.key))
    expect([...catalog.keys()].filter((k) => !keys.has(k))).toEqual([])
  })
  it('каталог не пуст (регулярка читает миграцию)', () => {
    expect(catalog.size).toBeGreaterThanOrEqual(16)
    expect(catalog.size).toBe(due.length)
  })
})
