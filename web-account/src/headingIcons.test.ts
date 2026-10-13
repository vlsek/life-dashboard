// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EmojiText from './components/EmojiText.vue'
import { splitEmojiText } from './lib/emojiText'

// BACKLOG 58.9: значок у КАЖДОГО заголовка страницы (h1) и КАЖДОГО заголовка раздела; отступ значок→текст один на все пилоты.
// Правило: строка i18n (RU и EN) начинается с эмодзи, у которого есть SVG (карта UI_EXTRA в lib/emojiText.ts), а выводится заголовок
// через <EmojiText> (отступ задаёт сам компонент). БЕЗ значка намеренно: заголовки модальных окон и форм, названия данных (категория
// вехи, упражнение, группа мышц, пользовательская категория цели). Дашборд включён: агент 3 убрал stripEmoji из заголовков блоков (58.9 срез 2).
const ROOT = '..'
const pilots: string[] = readdirSync(ROOT).filter((d: string) => d.startsWith('web-') && existsSync(`${ROOT}/${d}/src`))
const vueFiles = (pilot: string): string[] =>
  (readdirSync(`${ROOT}/${pilot}/src`, { recursive: true }) as string[]).filter((f) => f.endsWith('.vue')).map((f) => `${pilot}/src/${f}`)

const startsWithIcon = (text: string): boolean => splitEmojiText(text)[0]?.kind === 'icon'
function values(pilot: string, key: string): string[] {
  const i18n = readFileSync(`${ROOT}/${pilot}/src/lib/i18n.ts`, 'utf-8')
  return [...i18n.matchAll(new RegExp('\\b' + key + "\\s*:\\s*(['\"])(.*?)\\1", 'g'))].map((m) => m[2])
}
const keyOf = (s: string): string | null => s.match(/t\('([a-z0-9_]+)'/)?.[1] ?? null

describe('значок у заголовков страниц (h1)', () => {
  for (const pilot of pilots) {
    for (const f of vueFiles(pilot)) {
      const src = readFileSync(`${ROOT}/${f}`, 'utf-8')
      for (const m of src.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)) {
        it(`${f}: h1 через EmojiText, строка начинается со значка`, () => {
          const inner = m[1].replace(/\s+/g, ' ')
          expect(inner, 'h1 выводится через <EmojiText>').toContain('EmojiText')
          const key = keyOf(inner)
          if (key) {
            const vals = values(pilot, key)
            expect(vals.length, key + ' есть в i18n').toBeGreaterThan(0)
            for (const v of vals) expect(startsWithIcon(v), `${pilot}: ${key} = «${v}» начинается со значка`).toBe(true)
          }
        })
      }
    }
  }
})

describe('значок у заголовков разделов', () => {
  // (файл, ключ) — заголовки разделов на странице; каждая строка i18n должна начинаться со значка, вывод — через EmojiText
  const SECTION_KEYS: Record<string, string[]> = {
    'web-achievements': ['ach_title', 'ach_secret_title', 'ach_recent_title', 'ach_next_title'],
    'web-customization': ['cust_title', 'cust_sec_themes', 'cust_sec_markers', 'cust_sec_splash', 'cust_sec_streakflame', 'cust_sec_wateranim', 'cust_sec_bodymodel'],
    'web-shop': ['shop_section_affordable', 'shop_section_saving', 'shop_idea_title'],
    'web-goals': ['goals_sec_settings', 'goals_sec_upcoming'],
    'web-skills': ['skills_active_h3', 'skills_books_to_read_h3'],
    'web-workouts': ['workouts_muscles_title', 'workouts_prog_title'],
    'web-header': ['hdr_panel_title'],
    'web-account': ['acc_avatar_h3'],
  }
  for (const [pilot, keys] of Object.entries(SECTION_KEYS)) {
    for (const key of keys) {
      it(`${pilot}: ${key} (RU и EN) начинается со значка`, () => {
        const vals = values(pilot, key)
        expect(vals.length, key + ' есть в i18n (RU и EN)').toBeGreaterThanOrEqual(2)
        for (const v of vals) expect(startsWithIcon(v), `«${v}»`).toBe(true)
      })
    }
  }

  it('категории «Кастомизации» (cust_cat_*, кроме подсказки) — со значком', () => {
    const i18n = readFileSync(`${ROOT}/web-customization/src/lib/i18n.ts`, 'utf-8')
    const rows = [...i18n.matchAll(/\b(cust_cat_[a-z_]+)\s*:\s*(['"])(.*?)\2/g)].filter((m) => m[1] !== 'cust_cat_hint')
    expect(rows.length).toBeGreaterThanOrEqual(12) // 6 категорий × RU/EN
    for (const m of rows) expect(startsWithIcon(m[3]), `${m[1]} = «${m[3]}»`).toBe(true)
  })

  it('заголовки разделов выводятся через EmojiText, а не голым t()', () => {
    const checks: [string, RegExp][] = [
      ['web-achievements/src/App.vue', /<EmojiText :text="t\('ach_title'\)"/],
      ['web-achievements/src/components/AchievementShowcase.vue', /<EmojiText :text="t\('ach_next_title'\)"/],
      ['web-customization/src/App.vue', /<EmojiText :text="t\('cust_title'\)"/],
      ['web-customization/src/components/SectionGroup.vue', /<EmojiText :text="title"/],
      ['web-milestones/src/App.vue', /<EmojiText :text="t\('nav_milestones'\)"/],
      ['web-shop/src/App.vue', /<EmojiText :text="t\('shop_section_affordable'\)"/],
      ['web-workouts/src/components/MuscleMap.vue', /<EmojiText :text="t\('workouts_muscles_title'\)"/],
      ['web-workouts/src/components/ProgressionTrees.vue', /<EmojiText :text="t\('workouts_prog_title'\)"/],
      ['web-header/src/components/RightPanel.vue', /<EmojiText :text="t\('hdr_panel_title'\)"/],
    ]
    for (const [f, re] of checks) expect(readFileSync(`${ROOT}/${f}`, 'utf-8'), f).toMatch(re)
  })

  it('Дашборд: заголовки блоков со значком (RU и EN) и без stripEmoji в :title у SectionHeading', () => {
    for (const key of ['dash_block_profile', 'dash_charts_h2', 'dash_daily_h2', 'dash_planned_h2']) {
      const vals = values('web-dashboard', key)
      expect(vals.length, key).toBeGreaterThanOrEqual(2)
      for (const v of vals) expect(startsWithIcon(v), `web-dashboard: ${key} = «${v}»`).toBe(true)
    }
    // «Виджеты»: значок задан в самом заголовке (строка dash_block_widgets без эмодзи общая с окнами порядка/раскладки блоков)
    const widgets = readFileSync(`${ROOT}/web-dashboard/src/components/WidgetsSection.vue`, 'utf-8')
    const wm = widgets.match(/<SectionHeading\b[^>]*?:title="'([^']+) ' \+ t\('dash_block_widgets'\)"/)
    expect(wm, 'у «Виджетов» заголовок вида \'📊 \' + t(...)').not.toBeNull()
    expect(startsWithIcon(wm![1] + ' x'), 'эмодзи «Виджетов» имеет SVG').toBe(true)
    for (const f of vueFiles('web-dashboard')) {
      const src = readFileSync(`${ROOT}/${f}`, 'utf-8')
      for (const m of src.matchAll(/<SectionHeading\b[^>]*?:title="([^"]+)"/g)) expect(m[1], f + ': значок заголовка блока не срезается').not.toContain('stripEmoji')
    }
  })
})

describe('отступ значок→текст один на все пилоты', () => {
  // БАГ (владелец «сделать везде пробелы от svg до заголовка», агент 6 видел значки вплотную): правило `.emoji-text-icon:last-child {margin-right: 0}`
  // считало значок «последним», потому что текст после него — текстовый узел, а не элемент; отступ 0.35em обнулялся у ВСЕХ значков с текстом.
  // Теперь нулевой отступ — только у значка в конце строки (класс --tail).
  const MARGIN = /\.emoji-text-icon\s*\{\s*margin-right:\s*0\.35em;\s*\}/
  const TAIL = /\.emoji-text-icon--tail\s*\{\s*margin-right:\s*0;\s*\}/

  it('во всех пилотах: отступ 0.35em, --tail без отступа, :last-child не используется (EmojiText.vue или, у шапки-виджета, глобальный header.css)', () => {
    let checked = 0
    for (const pilot of pilots) {
      const f = `${ROOT}/${pilot}/src/components/EmojiText.vue`
      if (!existsSync(f)) continue
      const vue = readFileSync(f, 'utf-8')
      expect(vue, pilot + ': класс --tail вешается на значок без текста после него').toContain("'emoji-text-icon--tail': i === segments.length - 1")
      const css = pilot === 'web-header' ? readFileSync(`${ROOT}/${pilot}/src/header.css`, 'utf-8') : vue
      expect(css, pilot + ': отступ значка').toMatch(MARGIN)
      expect(css, pilot + ': --tail без отступа').toMatch(TAIL)
      expect(css, pilot + ': :last-child обнулял отступ у значков с текстом').not.toMatch(/\.emoji-text-icon:last-child/)
      checked++
    }
    expect(checked).toBeGreaterThanOrEqual(15)
  })

  const tails = (text: string) => mount(EmojiText, { props: { text } }).findAll('.emoji-text-icon').map((w) => w.classes().includes('emoji-text-icon--tail'))
  it('значок с текстом после него — БЕЗ --tail (отступ есть); значок в конце или единственный — с --tail', () => {
    expect(tails('📌 Планы')).toEqual([false])
    expect(tails('Планы 📌')).toEqual([true])
    expect(tails('📌')).toEqual([true])
    expect(tails('📌 Планы 🎯 Цели')).toEqual([false, false])
    expect(tails('Цель 🎯')).toEqual([true])
    expect(tails('Просто текст')).toEqual([])
  })
})
