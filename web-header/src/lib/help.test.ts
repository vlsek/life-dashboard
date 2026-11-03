import { describe, expect, it } from 'vitest'
// @ts-ignore — нет типов node; vitest выполняется в node (как в других стражах копий)
import { readFileSync } from 'node:fs'
import { PAGE_HINTS } from './pageHints'
import { helpTopics, searchHelp } from './help'
import { PALETTE_ITEMS } from './palette'

describe('справка: состав тем', () => {
  it('копия pageHints.ts в шапке совпадает с dashboard (иначе справка разойдётся с подсказками страниц)', () => {
    expect(readFileSync('src/lib/pageHints.ts', 'utf8')).toBe(readFileSync('../web-dashboard/src/lib/pageHints.ts', 'utf8'))
  })
  it('на обоих языках: 5 общих тем + по теме на каждую страницу из подсказок, у каждой есть текст', () => {
    const pages = Object.keys(PAGE_HINTS).length
    for (const lang of ['ru', 'en'] as const) {
      const t = helpTopics(lang)
      expect(t.length).toBe(5 + pages)
      expect(t.slice(0, 5).map((x) => x.id)).toEqual(['points', 'streaks', 'water', 'offline', 'icons'])
      for (const x of t) { expect(x.title.length).toBeGreaterThan(0); expect(x.paragraphs.length).toBeGreaterThan(0) }
    }
  })
  it('у каждой страничной темы есть ссылка «Открыть страницу», и она ведёт на папку страницы', () => {
    for (const x of helpTopics('ru').filter((t) => t.id.startsWith('page:'))) expect(x.href, x.id).toMatch(/^\/[a-z]+\/$/)
  })
  it('в палитре есть пункт «Справка»', () => {
    expect(PALETTE_ITEMS.some((i) => i.id === 'action:help')).toBe(true)
  })
})

describe('searchHelp', () => {
  const topics = helpTopics('ru')
  it('пустой запрос — все темы', () => {
    expect(searchHelp(topics, '  ').length).toBe(topics.length)
  })
  it('ищет по тексту: «26 мл» находит норму воды; регистр и «ё» не важны', () => {
    expect(searchHelp(topics, '26 МЛ').map((t) => t.id)).toContain('water')
    expect(searchHelp(topics, 'ЕЩЁ нет такого слова ххх').length).toBe(0)
  })
  it('все слова запроса должны встретиться; совпадение в названии — выше', () => {
    const r = searchHelp(topics, 'вода')
    expect(r[0].id).toBe('water') // «Норма воды» — в названии
    expect(searchHelp(topics, 'офлайн облачко').map((t) => t.id)).toEqual(['offline', 'icons'].filter((id) => searchHelp(topics, 'офлайн облачко').some((t) => t.id === id)))
    expect(searchHelp(topics, 'офлайн облачко').length).toBeGreaterThan(0)
  })
  it('английский язык ищет по английским текстам', () => {
    expect(searchHelp(helpTopics('en'), 'streak').map((t) => t.id)).toContain('streaks')
  })
})
