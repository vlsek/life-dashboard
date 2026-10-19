// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в tourTexts.test.ts)
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 935/49.5, находка A (заход 5): владелец одобрил «ты» везде. Страж: в русских словарях пилотов нет «вы»-форм и повелительных на «-ите/-йте/-ьте».
// Исключения: «Вы/вы» во фразах про ДВУХ людей («Теперь вы друзья»), существительные на «-ете/-ите» (в «сайте», «приоритете»).
// Словарь «Кастомизации» не проверяем: страницу переделывает агент 7 (64.1), там своя чистка.
const ROOT = '..'
const pilots: string[] = readdirSync(ROOT).filter((d: string) => d.startsWith('web-') && d !== 'web-customization')
const PLURAL_YOU_KEYS = new Set(['comm_friend_now_friends_toast', 'comm_friend_already_toast'])
const NOUN_WHITELIST = new Set(['сайте', 'приоритете'])
const FORMAL = /(?<![а-яёА-ЯЁ])(вы|вам|вас|ваш[а-яё]*|можете|хотите|видите|знаете|делаете|отмечаете|[а-яё]*(?:йте|ьте|ите))(?![а-яёА-ЯЁ])/gi

function ruLines(file: string): { key: string; text: string }[] {
  const L = readFileSync(file, 'utf-8').split('\n')
  const start = L.findIndex((l: string) => /^\s*ru\s*:\s*\{/.test(l))
  const out: { key: string; text: string }[] = []
  for (const l of L.slice(start < 0 ? 0 : start)) {
    const m = /^\s*['"]?([\w.]+)['"]?\s*:\s*(['"])(.*)\2,?\s*$/.exec(l)
    if (m) out.push({ key: m[1], text: m[3] })
  }
  return out
}

describe('«ты» везде: нет формальных форм в русских словарях', () => {
  it('нашли словари пилотов', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(15)
  })
  for (const p of pilots) {
    it(`${p}: нет «вы»-форм и повелительных на -ите/-йте/-ьте`, () => {
      const bad: string[] = []
      for (const { key, text } of ruLines(`${ROOT}/${p}/src/lib/i18n.ts`)) {
        if (PLURAL_YOU_KEYS.has(key)) continue
        for (const m of text.matchAll(FORMAL)) if (!NOUN_WHITELIST.has(m[1].toLowerCase())) bad.push(`${key}: «${m[1]}»`)
      }
      expect(bad).toEqual([])
    })
  }
  it('«вы» остаётся только там, где это двое: «Теперь вы друзья», «Вы уже друзья»', () => {
    const ru = ruLines(`${ROOT}/web-community/src/lib/i18n.ts`)
    for (const k of PLURAL_YOU_KEYS) expect(ru.find((x) => x.key === k)?.text).toMatch(/вы друзья|Вы уже друзья/)
    expect(ru.find((x) => x.key === 'comm_you')?.text).toBe('Ты')
  })
})
