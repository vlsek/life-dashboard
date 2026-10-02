import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других тестах, читающих исходники)
import { readFileSync } from 'node:fs'
import EmojiText from '../components/EmojiText.vue'
import { hasEmoji, splitEmojiText, stripEmoji, UI_EMOJI_TO_SVG } from './emojiText'
import { ICON_PATHS } from './icons'

// BACKLOG 1.3 «Замена эмодзи на SVG» + повторы владельца 17:05 и 12:00: эмодзи в интерфейсе — единым набором SVG.
describe('emojiText: эмодзи → SVG', () => {
  it('«🔥 Активные» → иконка flame + текст, пробел после иконки убран', () => {
    expect(splitEmojiText('🔥 Активные')).toEqual([
      { kind: 'icon', name: 'flame', char: '🔥' },
      { kind: 'text', value: 'Активные' },
    ])
  })
  it('эмодзи с селектором вариации (⚙️) склеивается и тоже заменяется', () => {
    const segs = splitEmojiText('⚙️ Настройки')
    expect(segs[0]).toMatchObject({ kind: 'icon', name: 'gear' })
    expect(segs[1]).toEqual({ kind: 'text', value: 'Настройки' })
  })
  it('несколько эмодзи в строке и текст без эмодзи', () => {
    expect(splitEmojiText('✅ Готово ➕ Добавить').filter((s) => s.kind === 'icon')).toHaveLength(2)
    expect(splitEmojiText('Просто текст')).toEqual([{ kind: 'text', value: 'Просто текст' }])
  })
  it('неизвестное эмодзи остаётся текстом — ничего не пропадает', () => {
    expect(splitEmojiText('🦄 Единорог')).toEqual([{ kind: 'text', value: '🦄 Единорог' }])
  })
  it('каждое сопоставление ведёт на существующую иконку (нет «мёртвых» ссылок)', () => {
    for (const [emoji, name] of Object.entries(UI_EMOJI_TO_SVG)) expect((ICON_PATHS as Record<string, string>)[name], emoji + ' → ' + name).toBeTruthy()
  })
  it('EmojiText рисует svg и текст', () => {
    const w = mount(EmojiText, { props: { text: '📌 Планы' } })
    expect(w.find('svg').exists()).toBe(true)
    expect(w.text()).toBe('Планы')
    w.unmount()
  })
})

describe('stripEmoji: для title / placeholder / option', () => {
  it('убирает эмодзи и лишний пробел', () => {
    expect(stripEmoji('🔥 Активные')).toBe('Активные')
    expect(stripEmoji('➕ Своё')).toBe('Своё')
    expect(stripEmoji('⚙️ Настройки')).toBe('Настройки')
  })
  it('типографику (✓ → …) не трогает, обычный текст не меняет', () => {
    expect(stripEmoji('Готово ✓')).toBe('Готово ✓')
    expect(stripEmoji('Назад → вперёд')).toBe('Назад → вперёд')
    expect(stripEmoji('Обычный текст')).toBe('Обычный текст')
  })
  it('hasEmoji отличает пиктограммы от типографики', () => {
    expect(hasEmoji('🎉 Ура')).toBe(true)
    expect(hasEmoji('Готово ✓ → …')).toBe(false)
  })
})

// Защита от возврата проблемы: новая строка i18n с эмодзи, для которого нет SVG, уронит тест (nav_/theme_ идут через plainLabel/иконки меню).
describe('i18n: ни одной строки с эмодзи без SVG-аналога', () => {
  const src: string = readFileSync('src/lib/i18n.ts', 'utf-8')
  const rows = [...src.matchAll(/^\s+'?([\w.-]+)'?:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),?\s*$/gm)]
    .map((m) => [m[1], m[2] ?? m[3]] as [string, string])
    .filter(([k, v]) => !/^(nav_|theme_)/.test(k) && hasEmoji(v))
  it('разбор i18n.ts работает (тест не пустой)', () => {
    expect([...src.matchAll(/^\s+'?([\w.-]+)'?:\s*'/gm)].length).toBeGreaterThan(20)
  })
  it('в каждой такой строке все эмодзи имеют SVG', () => {
    const bad = rows.filter(([, v]) => splitEmojiText(v).some((s) => s.kind === 'text' && hasEmoji(s.value))).map(([k, v]) => k + ': ' + v)
    expect(bad).toEqual([])
  })
})

