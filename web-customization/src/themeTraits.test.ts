import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах).
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import ThemeCard from './components/ThemeCard.vue'
import { THEME_TRAITS } from './lib/themeTraits'
import { THEME_KEYS } from './lib/theme'

// BACKLOG 55.1: «что именно меняет большая тема». Список выводится генератором из CHAR (scripts/themes_data.py) — тут сверяем, что он
// полный: у каждой большой темы есть возможности, у каждой возможности — подпись RU+EN, а карточка их показывает.
const read = (p: string): string => readFileSync(p, 'utf-8')
const charKeys = (): string[] => {
  const src = read('../scripts/themes_data.py')
  const start = src.indexOf('\nCHAR = {')
  const end = src.indexOf('\nassert all(k in P for k in CHAR)')
  return [...src.slice(start, end).matchAll(/^    '(\w+)': dict\(/gm)].map((m) => m[1])
}

describe('описание большой темы (55.1)', () => {
  it('в themeTraits.ts ровно те темы, что в CHAR (генератор не отстал), и все они есть среди тем страницы', () => {
    const keys = charKeys()
    expect(keys.length).toBeGreaterThanOrEqual(3)
    expect(Object.keys(THEME_TRAITS).sort()).toEqual([...keys].sort())
    for (const k of keys) expect(Object.keys(THEME_KEYS), k).toContain(k)
  })
  it('у каждой большой темы есть описание, и первая строка — про свои цвета', () => {
    for (const [k, list] of Object.entries(THEME_TRAITS)) {
      expect(list.length, k).toBeGreaterThanOrEqual(2)
      expect(list[0], k).toBe('palette')
      expect(new Set(list).size, k).toBe(list.length)
    }
  })
  it('у каждой возможности есть подпись RU и EN в i18n.ts (по одной на язык), и заголовок списка тоже', () => {
    const i18n = read('src/lib/i18n.ts')
    const all = new Set(Object.values(THEME_TRAITS).flat())
    for (const x of [...all].map((v) => `theme_trait_${v}`).concat('cust_theme_traits_h')) {
      expect((i18n.match(new RegExp(`^\\s*${x}: '`, 'gm')) ?? []).length, x).toBe(2)
    }
  })
  it('карточка большой темы показывает список «что меняет», обычной темы — нет', () => {
    const big = mount(ThemeCard, { props: { themeKey: 'phosphor', active: false, favorite: false, canToggle: true } })
    expect(big.findAll('[data-trait]').map((l) => l.attributes('data-trait'))).toEqual(THEME_TRAITS.phosphor)
    expect(big.find('[data-testid="theme-traits"]').exists()).toBe(true)
    const plain = mount(ThemeCard, { props: { themeKey: 'dark', active: false, favorite: false, canToggle: true } })
    expect(plain.find('[data-testid="theme-traits"]').exists()).toBe(false)
  })
})

// BACKLOG 50.1/57.7: подписи «что меняет тема» должны говорить правду о плоских темах и о зернистости (раньше frost/velvet числились «с мягкими тенями»,
// а зернистость называлась «сеткой из точек»).
describe('честные подписи: плоские карточки и зернистость', () => {
  it('темы с --shadow-card: none (velvet, frost, alpine) — «плоские карточки», а не «мягкие тени»; nightfall — настоящие тени', () => {
    for (const k of ['velvet', 'frost', 'alpine']) {
      expect(THEME_TRAITS[k], k).toContain('flat_cards')
      expect(THEME_TRAITS[k], k).not.toContain('soft_shadows')
    }
    expect(THEME_TRAITS.nightfall).toContain('soft_shadows')
    expect(THEME_TRAITS.nightfall).not.toContain('flat_cards')
  })
  it('«shadow-active: none» — не неоновое свечение (velvet, frost, alpine); у moonlight оно настоящее', () => {
    for (const k of ['velvet', 'frost', 'alpine']) expect(THEME_TRAITS[k], k).not.toContain('neon_glow')
    expect(THEME_TRAITS.moonlight).toContain('neon_glow')
  })
  it('зернистость frost — «grain», а не «сетка из точек»; у moonlight настоящая сетка', () => {
    expect(THEME_TRAITS.frost).toContain('grain')
    expect(THEME_TRAITS.frost).not.toContain('dot_pattern')
    expect(THEME_TRAITS.moonlight).toContain('dot_pattern')
    expect(THEME_TRAITS.moonlight).not.toContain('grain')
  })
  it('alpine: цвета, плоские карточки, гладкая анимация — и всё', () => {
    expect(THEME_TRAITS.alpine).toEqual(['palette', 'flat_cards', 'smooth_anim'])
  })
})

describe('matcha (светлая «пушистая»)', () => {
  it('цвета, мягкие скругления, мягкие тени, гладкая анимация — и без «плоских карточек»', () => {
    expect(THEME_TRAITS.matcha).toEqual(['palette', 'corners_soft', 'soft_shadows', 'smooth_anim'])
  })
})
