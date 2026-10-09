import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readdirSync, readFileSync } from 'node:fs'
import { ITEMS, priceOf } from './lib/customization'

// Серверный каталог цен (`customization_catalog`, миграция 060 и последующие) должен совпадать с реестром `ITEMS`: цену и источник знает сервер, и если
// предмета в каталоге нет, покупка откажет «неизвестный предмет». Тест читает insert-строки всех миграций, начиная с 060, и сверяет с реестром.
// Падение значит: добавлен/изменён предмет без миграции каталога. Тест печатает готовые SQL-строки для НОВОЙ миграции (образец — 060).
const dir = '../migrations'
const files: string[] = readdirSync(dir).filter((f: string) => /^\d{3}_.*\.sql$/.test(f) && Number(f.slice(0, 3)) >= 60).sort()
const catalog = new Map<string, { source: string; price: number | null; ach: string | null }>()
for (const f of files) {
  const sql: string = readFileSync(`${dir}/${f}`, 'utf-8')
  for (const m of sql.matchAll(/^\s*\('([a-z_0-9]+)', '([a-z_0-9]+)', '(points|achievement)', (null|\d+), (null|'[a-z_0-9]+')\)/gm)) {
    catalog.set(m[1], { source: m[3], price: m[4] === 'null' ? null : Number(m[4]), ach: m[5] === 'null' ? null : m[5].slice(1, -1) })
  }
}
const sqlRow = (i: (typeof ITEMS)[number]) => `  ('${i.key}', '${i.category}', '${i.source}', ${i.source === 'points' ? priceOf(i) : 'null'}, ${i.source === 'achievement' ? `'${(i as any).achievement}'` : 'null'})`

describe('серверный каталог = клиентский реестр', () => {
  it('каждый предмет реестра есть в каталоге с той же ценой, источником и достижением', () => {
    const missing = ITEMS.filter((i) => !catalog.has(i.key))
    expect(missing.map(sqlRow), 'Нет в каталоге — добавьте новой миграцией:\ninsert into customization_catalog (item_key, category, source, price, achievement_key) values\n' + missing.map(sqlRow).join(',\n') + '\non conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;').toEqual([])
    for (const i of ITEMS) {
      const c = catalog.get(i.key)!
      expect(c.source, i.key).toBe(i.source)
      expect(c.price, i.key).toBe(i.source === 'points' ? priceOf(i) : null)
      expect(c.ach, i.key).toBe(i.source === 'achievement' ? (i as any).achievement : null)
    }
  })
  it('в каталоге нет предметов, которых нет в реестре', () => {
    const keys = new Set(ITEMS.map((i) => i.key))
    expect([...catalog.keys()].filter((k) => !keys.has(k))).toEqual([])
  })
  it('каталог не пуст (регулярка читает миграцию)', () => {
    expect(catalog.size).toBeGreaterThanOrEqual(20)
  })
})
