import { describe, expect, it } from 'vitest'
import {
  ICON_CATEGORIES,
  ICON_KEYWORDS,
  METRIC_ICON_CHOICES,
  POPULAR_ICONS,
  iconLabel,
  iconSearchMatches,
  iconsForPicker,
  type IconName,
} from './icons'

describe('категории и подборка (BACKLOG 1.3)', () => {
  it('каждая иконка пикера входит РОВНО в одну категорию, лишних нет', () => {
    const all = ICON_CATEGORIES.flatMap((c) => c.icons)
    expect(new Set(all).size).toBe(all.length) // без дублей
    expect([...all].sort()).toEqual([...METRIC_ICON_CHOICES].sort())
  })
  it('популярные — подмножество архива, без дублей, компактная подборка', () => {
    expect(new Set(POPULAR_ICONS).size).toBe(POPULAR_ICONS.length)
    for (const n of POPULAR_ICONS) expect(METRIC_ICON_CHOICES).toContain(n)
    expect(POPULAR_ICONS.length).toBeGreaterThanOrEqual(12)
    expect(POPULAR_ICONS.length).toBeLessThanOrEqual(24)
    expect(POPULAR_ICONS.length).toBeLessThan(METRIC_ICON_CHOICES.length / 2) // редкие реально скрыты
  })
  it('у категорий есть названия на обоих языках и ключи уникальны', () => {
    expect(new Set(ICON_CATEGORIES.map((c) => c.key)).size).toBe(ICON_CATEGORIES.length)
    for (const c of ICON_CATEGORIES) {
      expect(c.ru.length).toBeGreaterThan(0)
      expect(c.en.length).toBeGreaterThan(0)
    }
  })
  it('у каждой иконки пикера есть ключевые слова на обоих языках (по ним ищем и подписываем)', () => {
    for (const n of METRIC_ICON_CHOICES) {
      const kw = ICON_KEYWORDS[n] || ''
      expect(/[а-яё]/i.test(kw), `${n}: нет русских слов`).toBe(true)
      expect(/[a-z]/i.test(kw), `${n}: нет английских слов`).toBe(true)
    }
  })
})

describe('iconSearchMatches', () => {
  it('пустой запрос подходит всему; регистр не важен', () => {
    expect(iconSearchMatches('run', '')).toBe(true)
    expect(iconSearchMatches('run', '   ')).toBe(true)
    expect(iconSearchMatches('run', 'RUN')).toBe(true)
  })
  it('ищет по имени и по русским/английским ключевым словам', () => {
    expect(iconSearchMatches('run', 'бег')).toBe(true)
    expect(iconSearchMatches('droplet', 'вода')).toBe(true)
    expect(iconSearchMatches('droplet', 'water')).toBe(true)
    expect(iconSearchMatches('droplet', 'бег')).toBe(false)
  })
  it('«ё» и «е» равнозначны', () => {
    const ioga = METRIC_ICON_CHOICES.find((n) => /ё/i.test(ICON_KEYWORDS[n] || ''))
    if (ioga) {
      const word = (ICON_KEYWORDS[ioga] || '').split(/\s+/).find((w) => /ё/i.test(w)) as string
      expect(iconSearchMatches(ioga, word.replace(/ё/gi, 'е'))).toBe(true)
      expect(iconSearchMatches(ioga, word)).toBe(true)
    }
    expect(METRIC_ICON_CHOICES.length).toBeGreaterThan(0)
  })
  it('несколько слов: каждое должно совпасть (порядок не важен)', () => {
    expect(iconSearchMatches('run', 'бег run')).toBe(true)
    expect(iconSearchMatches('run', 'run бег')).toBe(true)
    expect(iconSearchMatches('run', 'бег вода')).toBe(false)
  })
})

describe('iconsForPicker', () => {
  it('без запроса: вкладка «Популярные» — только подборка, «Все» — весь архив, категория — её иконки', () => {
    expect(iconsForPicker('', 'popular')).toEqual(POPULAR_ICONS)
    expect(iconsForPicker('', 'all')).toEqual(METRIC_ICON_CHOICES)
    expect(iconsForPicker('', 'food')).toEqual(ICON_CATEGORIES.find((c) => c.key === 'food')!.icons)
  })
  it('неизвестная вкладка → подборка (безопасное значение по умолчанию)', () => {
    expect(iconsForPicker('', 'нет-такой')).toEqual(POPULAR_ICONS)
  })
  it('с запросом ищет по ВСЕМУ архиву независимо от вкладки — находит и редкие иконки', () => {
    const rare = METRIC_ICON_CHOICES.find((n) => !POPULAR_ICONS.includes(n)) as IconName
    expect(POPULAR_ICONS).not.toContain(rare)
    expect(iconsForPicker(rare, 'popular')).toContain(rare)
    expect(iconsForPicker('пицца', 'sport')).toContain('pizza')
  })
  it('запрос без совпадений → пусто', () => {
    expect(iconsForPicker('qwertyuiop', 'all')).toEqual([])
  })
})

describe('iconLabel', () => {
  it('русская подпись — кириллицей, английская — латиницей', () => {
    expect(/[а-яё]/i.test(iconLabel('run', 'ru'))).toBe(true)
    expect(/^[a-z]/i.test(iconLabel('run', 'en'))).toBe(true)
  })
  it('для всех иконок пикера подпись непустая на обоих языках', () => {
    for (const n of METRIC_ICON_CHOICES) {
      expect(iconLabel(n, 'ru').length).toBeGreaterThan(0)
      expect(iconLabel(n, 'en').length).toBeGreaterThan(0)
    }
  })
  it('нет ключевых слов → само имя иконки', () => {
    expect(iconLabel('definitely_not_an_icon' as IconName, 'ru')).toBe('definitely_not_an_icon')
  })
})
