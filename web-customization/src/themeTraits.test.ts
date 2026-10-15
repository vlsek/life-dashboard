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

describe('cyberday (светлый киберпанк): жёсткие тени и моноширинные метки', () => {
  it('цвета, моноширинный шрифт у заголовков/меток/кнопок, жёсткие тени, сетка точек, резкая анимация — без «мягких теней» и «неонового свечения»', () => {
    expect(THEME_TRAITS.cyberday).toEqual(['palette', 'mono_labels', 'hard_shadows', 'dot_pattern', 'snappy_anim'])
    expect(THEME_TRAITS.cyberday).not.toContain('soft_shadows')
    expect(THEME_TRAITS.cyberday).not.toContain('neon_glow')
  })
  it('у остальных тем «жёстких теней» нет, а у nightfall тени по-прежнему мягкие', () => {
    for (const k of Object.keys(THEME_TRAITS)) if (k !== 'cyberday') expect(THEME_TRAITS[k], k).not.toContain('hard_shadows')
  })
})

describe('vintage (редакционная «чернильная бумага»)', () => {
  it('цвета, острые углы, пунктир, заголовки с засечками, контурные кнопки, плоские карточки, гладкая анимация; НЕ «моноширинные»', () => {
    expect(THEME_TRAITS.vintage).toEqual(['palette', 'corners_sharp', 'dashed_borders', 'serif_headings', 'outlined_buttons', 'flat_cards', 'smooth_anim'])
    expect(THEME_TRAITS.vintage).not.toContain('mono_headings')
  })
  it('«с засечками» и «контурные кнопки» — только у vintage; у emerald шрифт по-прежнему моноширинный', () => {
    for (const k of Object.keys(THEME_TRAITS)) if (k !== 'vintage') {
      expect(THEME_TRAITS[k], k).not.toContain('serif_headings')
      expect(THEME_TRAITS[k], k).not.toContain('outlined_buttons')
    }
    expect(THEME_TRAITS.emerald).toContain('mono_headings')
  })
})

describe('glass (бизнес-стекло)', () => {
  it('цвета, мягкие скругления, мягкие тени, световые пятна на фоне, стеклянные панели, гладкая анимация', () => {
    expect(THEME_TRAITS.glass).toEqual(['palette', 'corners_soft', 'soft_shadows', 'aurora_bg', 'glass_panels', 'smooth_anim'])
  })
  it('«стеклянные панели» — только у glass, «световые пятна» — у glass, meadow (солнечное пятно) и autumn (листовые пятна); у moonlight сетка из точек, а не «пятна»; у frost зернистость', () => {
    for (const k of Object.keys(THEME_TRAITS)) {
      if (k !== 'glass') expect(THEME_TRAITS[k], k).not.toContain('glass_panels')
      if (k !== 'glass' && k !== 'meadow' && k !== 'autumn') expect(THEME_TRAITS[k], k).not.toContain('aurora_bg')
    }
    expect(THEME_TRAITS.moonlight).toContain('dot_pattern')
    expect(THEME_TRAITS.frost).toContain('grain')
  })
})

describe('autumn (Осенняя, 55.3)', () => {
  it('палитра, мягкие углы и тени, листовые пятна, гладкие анимации — как у «Летнего луга», без тяжёлых слоёв', () => {
    expect(THEME_TRAITS.autumn).toEqual(['palette', 'corners_soft', 'soft_shadows', 'aurora_bg', 'smooth_anim'])
  })
})

describe('meadow (Летний луг)', () => {
  it('цвета, мягкие скругления, мягкие тени, солнечное пятно на фоне, гладкая анимация', () => {
    expect(THEME_TRAITS.meadow).toEqual(['palette', 'corners_soft', 'soft_shadows', 'aurora_bg', 'smooth_anim'])
  })
})
