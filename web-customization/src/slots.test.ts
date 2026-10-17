import { beforeEach, describe, expect, it } from 'vitest'
import appSource from './App.vue?raw'
import { CATEGORY_ORDER, ITEMS } from './lib/customization'
import { t } from './lib/i18n'
import { GROUP_ORDER, SECTION_GROUP, groupOfSection } from './lib/pageTabs'
import { SLOTS, freeTotal, slotOf } from './lib/slots'
import { FREE_SECTIONS, FREE_SECTION_IDS, FREE_SECTIONS_TOTAL } from './lib/useVisibility'

// BACKLOG 64.1, срез 1: реестр слотов «Кастомизации» — единый источник разделов. Стражи: ничего не теряется, ни одна таблица не расходится с реестром.
beforeEach(() => localStorage.clear())

describe('реестр слотов', () => {
  it('id уникальны, группы существуют, у «бесплатных» есть число, у «каталога» — категория', () => {
    expect(new Set(SLOTS.map((s) => s.id)).size).toBe(SLOTS.length)
    for (const s of SLOTS) {
      expect(GROUP_ORDER, s.id).toContain(s.group)
      if (s.kind === 'free') expect(s.total, s.id).toBeGreaterThan(0)
      if (s.kind === 'catalog') expect(s.category, s.id).toBeTruthy()
      if (s.kind !== 'free') expect(s.total, s.id).toBeUndefined()
      if (s.kind !== 'catalog') expect(s.category, s.id).toBeUndefined()
    }
  })
  it('КАЖДАЯ категория каталога имеет ровно один слот kind=catalog (новая категория без слота не теряется)', () => {
    for (const c of CATEGORY_ORDER) expect(SLOTS.filter((s) => s.kind === 'catalog' && s.category === c), c).toHaveLength(1)
    for (const s of SLOTS.filter((x) => x.kind === 'catalog')) expect(ITEMS.some((i) => i.category === s.category), s.id).toBe(true)
  })
  it('заголовок каждого слота есть в EN и RU', () => {
    const titles: Record<string, string[]> = {}
    for (const lang of ['en', 'ru']) {
      localStorage.setItem('site_lang', lang)
      for (const s of SLOTS) (titles[s.id] ??= []).push(t(s.titleKey))
    }
    for (const s of SLOTS) {
      const [en, ru] = titles[s.id]
      expect(en, s.id + ' en').toBeTruthy()
      expect(ru, s.id + ' ru').toBeTruthy()
      expect(en, s.id + ': EN и RU не должны совпадать (иначе перевод потерян)').not.toBe(ru)
    }
  })
  it('страница рисует именно эти разделы: каждый статический раздел (themes + бесплатные) есть в реестре и наоборот', () => {
    const staticIds = [...appSource.matchAll(/<SectionGroup[^>]*?\sid="([a-z_-]+)"/g)].map((m) => m[1])
    for (const id of staticIds) expect(slotOf(id), id).toBeTruthy()
    for (const s of SLOTS.filter((x) => x.kind !== 'catalog')) expect(staticIds, s.id).toContain(s.id) // разделы каталога рисуются циклом по категориям
    expect(appSource).toContain('v-for="c in shownCategories"')
  })
  it('числа «бесплатных» не вписаны в шаблон: страница берёт их из реестра', () => {
    expect(appSource).not.toMatch(/:total="\d+" :owned="\d+"/)
    for (const id of FREE_SECTION_IDS) expect(appSource).toContain(`freeTotal('${id}')`)
  })
})

describe('производные таблицы совпадают с реестром', () => {
  it('SECTION_GROUP == группы слотов; неизвестный раздел — «Прочее»', () => {
    for (const s of SLOTS) expect(SECTION_GROUP[s.id]).toBe(s.group)
    expect(Object.keys(SECTION_GROUP).sort()).toEqual(SLOTS.map((s) => s.id).sort())
    expect(groupOfSection('brand_new')).toBe('other')
  })
  it('FREE_SECTIONS и freeTotal — из реестра: те же числа, что до переноса (4, 4, 2, 7, 5)', () => {
    expect(FREE_SECTIONS).toEqual({ 'chart-markers': 4, splash: 4, streakflame: 2, wateranim: 7, bodymodel: 5 })
    expect(FREE_SECTIONS_TOTAL).toBe(22)
    expect(freeTotal('splash')).toBe(4)
    expect(freeTotal('themes')).toBe(0)
    expect(freeTotal('нет такого')).toBe(0)
  })
})
