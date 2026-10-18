// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в tourTexts.test.ts)
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 935/49.5, заход 3 (часть): сообщество, достижения, «Кастомизация нужна миграция» (п. 22, 32, 33, 35, 38, 39, 44 из docs/TEXT_SHORTENING.md).
// Страж: пара RU+EN, лимит длины, «ты» без «вы»-форм, пользователю не показываем «миграцию/Supabase/SQL» (блок B), копии в legacy i18n.js равны.
const read = (f: string): string => readFileSync(`../${f}`, 'utf-8')
const F = { comm: 'web-community/src/lib/i18n.ts', ach: 'web-achievements/src/lib/i18n.ts', cust: 'web-customization/src/lib/i18n.ts', root: 'i18n.js' }
const SRC = { comm: read(F.comm), ach: read(F.ach), cust: read(F.cust), root: read(F.root) }

function values(src: string, key: string): string[] {
  const re = new RegExp(`^\\s+${key}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"),\\s*$`, 'gm')
  const out: string[] = []
  for (const m of src.matchAll(re)) out.push((m[1] ?? m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"'))
  return out
}
const KEYS: { key: string; in: 'comm' | 'ach' | 'cust'; max: number }[] = [
  { key: 'comm_privacy_1', in: 'comm', max: 120 },
  { key: 'comm_feed_pick_hint', in: 'comm', max: 95 },
  { key: 'comm_category_intro', in: 'comm', max: 105 },
  { key: 'comm_feed_hint', in: 'comm', max: 100 },
  { key: 'ach_local_note', in: 'ach', max: 60 },
  { key: 'ach_intro', in: 'ach', max: 110 },
  { key: 'cust_need_migration', in: 'cust', max: 50 },
]

describe('сокращение текстов, заход 3: сообщество, достижения, кастомизация', () => {
  for (const k of KEYS) {
    it(`${k.key}: пара EN+RU, RU ≤ ${k.max}, на «ты»`, () => {
      const v = values(SRC[k.in], k.key)
      expect(v).toHaveLength(2)
      expect(v[0].length).toBeGreaterThan(15)
      expect(v[1].length, `RU ${v[1].length}`).toBeLessThanOrEqual(k.max)
      expect(v[1]).not.toMatch(/(^|[^а-яё])(вы|вам|вас|ваш[а-яё]*|нажмите|выберите|примените|попробуйте)([^а-яё]|$)/i)
    })
  }
  it('блок B: пользователю не показываем «миграцию», Supabase и SQL (RU и EN)', () => {
    for (const k of ['ach_local_note', 'cust_need_migration']) {
      const src = k.startsWith('ach') ? SRC.ach : SRC.cust
      for (const v of values(src, k)) expect(v, k).not.toMatch(/миграц|migration|supabase|sql/i)
    }
  })
  it('подсказка про миграцию ушла разработчику в консоль', () => {
    expect(read('web-customization/src/lib/useCustomization.ts')).toMatch(/console\.error\([^)]*миграци[^)]*048/)
    expect(read('web-achievements/src/lib/useAchievements.ts')).toMatch(/console\.warn\([^)]*миграци[^)]*039/)
  })
  it('comm_privacy_1: «streak» заменён на «серия», кавычки типографские (находка E)', () => {
    const [en, ru] = values(SRC.comm, 'comm_privacy_1')
    expect(ru).toContain('серия')
    expect(ru).not.toMatch(/streak|"/)
    expect(en).not.toContain('"')
  })
  it('legacy i18n.js: комм. тексты — копии словаря сообщества', () => {
    for (const k of ['comm_privacy_1', 'comm_category_intro']) expect(values(SRC.root, k), k).toEqual(values(SRC.comm, k))
  })
})
