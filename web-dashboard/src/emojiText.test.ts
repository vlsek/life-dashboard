import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ICON_PATHS } from './lib/icons'
import { UI_EMOJI_TO_SVG, splitEmojiText } from './lib/emojiText'
import EmojiText from './components/EmojiText.vue'
import SectionHeading from './components/SectionHeading.vue'
import { t } from './lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('splitEmojiText', () => {
  it('«📌 Планы» → иконка pin + текст «Планы» (пробел после иконки убран, его заменяет CSS-отступ)', () => {
    expect(splitEmojiText('📌 Планы')).toEqual([
      { kind: 'icon', name: 'pin', char: '📌' },
      { kind: 'text', value: 'Планы' },
    ])
  })

  it('эмодзи с селектором VS16 (⚙️, 🗓️) распознаются, хотя в карте они без него', () => {
    const [seg] = splitEmojiText('⚙️ Настройка')
    expect(seg).toEqual({ kind: 'icon', name: 'gear', char: '⚙️' })
    expect(splitEmojiText('🗓️ Итоги')[0]).toMatchObject({ kind: 'icon', name: 'calendar' })
  })

  it('неизвестные эмодзи остаются текстом; текст без эмодзи не меняется', () => {
    expect(splitEmojiText('🌑 Тёмная')).toEqual([{ kind: 'text', value: '🌑 Тёмная' }])
    expect(splitEmojiText('Просто текст')).toEqual([{ kind: 'text', value: 'Просто текст' }])
    expect(splitEmojiText('')).toEqual([])
  })

  it('несколько эмодзи в строке и эмодзи в середине', () => {
    expect(splitEmojiText('⭐ Баллы за день: 🎯 цель')).toEqual([
      { kind: 'icon', name: 'star', char: '⭐' },
      { kind: 'text', value: 'Баллы за день: ' },
      { kind: 'icon', name: 'goals', char: '🎯' },
      { kind: 'text', value: 'цель' },
    ])
  })

  it('весь список владельца покрыт: вес, календарь, цели, баллы, профиль, темы, торт, глаз', () => {
    for (const e of ['⚖', '📅', '🗓', '🎯', '⭐', '👤', '🎨', '🎂', '👀', '☀', '🌸']) expect(UI_EMOJI_TO_SVG[e], e).toBeTruthy()
  })

  it('каждая иконка из карты реально существует в ICON_PATHS (нет ссылок «в никуда»)', () => {
    for (const [e, name] of Object.entries(UI_EMOJI_TO_SVG)) expect((ICON_PATHS as Record<string, string>)[name], `${e} → ${name}`).toBeTruthy()
  })
})

describe('EmojiText', () => {
  it('рисует SVG вместо эмодзи, текст остаётся; самого эмодзи в разметке больше нет', () => {
    const w = mount(EmojiText, { props: { text: '📈 Графики прогресса' } })
    expect(w.find('svg.icon').exists()).toBe(true)
    expect(w.text()).toBe('Графики прогресса')
    expect(w.html()).not.toContain('📈')
  })

  it('неизвестное эмодзи показывается как текст', () => {
    expect(mount(EmojiText, { props: { text: '🌑 Тёмная' } }).text()).toBe('🌑 Тёмная')
  })
})

describe('заголовки секций и окон', () => {
  it('SectionHeading: заголовок «📅 Ежедневные метрики» выводится с SVG, без эмодзи в тексте', () => {
    const w = mount(SectionHeading, { props: { title: t('dash_daily_h2'), storageKey: 'test_emoji' } })
    expect(w.find('h2 svg.icon').exists()).toBe(true)
    expect(w.find('h2').text()).toContain('Ежедневные метрики')
    expect(w.find('h2').text()).not.toContain('📅')
  })

  it('все русские строки i18n, начинающиеся с эмодзи из карты, режутся на иконку + текст (ни одно не теряется)', () => {
    const keys = ['dash_streaks_h2', 'dash_charts_h2', 'dash_planned_h2', 'dash_metrics_manager_title', 'dash_layout_modal_title', 'changelog_title', 'dash_block_profile', 'dash_chart_period_modal_title']
    for (const k of keys) {
      const segs = splitEmojiText(t(k as never))
      expect(segs[0].kind, k).toBe('icon')
      expect(segs.some((s) => s.kind === 'text' && s.value.trim().length > 0), k).toBe(true)
    }
  })
})
