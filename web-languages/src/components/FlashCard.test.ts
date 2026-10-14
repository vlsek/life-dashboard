import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FlashCard from './FlashCard.vue'
import type { VocabWord } from '../lib/types'

const w = (id: string, word: string, translation: string | null = null, example: string | null = null): VocabWord => ({ id, user_id: 'u', word, translation, example, lang: 'en', learned: false, created_at: '' })
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('FlashCard («Повторение»)', () => {
  it('без слов карточки нет', () => {
    expect(mount(FlashCard, { props: { words: [] } }).find('[data-test="flashcard"]').exists()).toBe(false)
  })

  it('сначала только слово и подсказка; тап показывает перевод и пример, «Выучил» появляется только после него', async () => {
    const c = mount(FlashCard, { props: { words: [w('1', 'apple', 'яблоко', 'An apple a day')] } })
    expect(c.get('[data-test="fc-word"]').text()).toBe('apple')
    expect(c.find('[data-test="fc-translation"]').exists()).toBe(false)
    expect(c.find('[data-test="fc-know"]').exists()).toBe(false)
    await c.get('[data-test="fc-face"]').trigger('click')
    expect(c.get('[data-test="fc-translation"]').text()).toBe('яблоко')
    expect(c.get('[data-test="fc-example"]').text()).toBe('An apple a day')
    expect(c.find('[data-test="fc-know"]').exists()).toBe(true)
    await c.get('[data-test="fc-face"]').trigger('click')
    expect(c.find('[data-test="fc-translation"]').exists()).toBe(false) // повторный тап прячет перевод
  })

  it('без перевода — прочерк', async () => {
    const c = mount(FlashCard, { props: { words: [w('1', 'apple')] } })
    await c.get('[data-test="fc-face"]').trigger('click')
    expect(c.get('[data-test="fc-translation"]').text()).toBe('—')
  })

  it('«Дальше» идёт по кругу и закрывает перевод; подпись позиции обновляется', async () => {
    const c = mount(FlashCard, { props: { words: [w('1', 'one'), w('2', 'two')] } })
    expect(c.get('[data-test="fc-position"]').text()).toBe('1/2')
    await c.get('[data-test="fc-face"]').trigger('click')
    await c.get('[data-test="fc-next"]').trigger('click')
    expect(c.get('[data-test="fc-word"]').text()).toBe('two')
    expect(c.get('[data-test="fc-position"]').text()).toBe('2/2')
    expect(c.find('[data-test="fc-translation"]').exists()).toBe(false)
    await c.get('[data-test="fc-next"]').trigger('click')
    expect(c.get('[data-test="fc-word"]').text()).toBe('one')
  })

  it('«Выучил» отдаёт слово родителю; когда оно уходит из списка, на его месте встаёт следующее', async () => {
    const list = [w('1', 'one', 'раз'), w('2', 'two', 'два'), w('3', 'three', 'три')]
    const c = mount(FlashCard, { props: { words: list } })
    await c.get('[data-test="fc-next"]').trigger('click') // на «two»
    await c.get('[data-test="fc-face"]').trigger('click')
    await c.get('[data-test="fc-know"]').trigger('click')
    expect((c.emitted('learned')![0][0] as VocabWord).id).toBe('2')
    await c.setProps({ words: [list[0], list[2]] }) // родитель убрал выученное
    expect(c.get('[data-test="fc-word"]').text()).toBe('three')
    expect(c.find('[data-test="fc-translation"]').exists()).toBe(false)
  })

  it('выучено последнее слово списка — индекс подгоняется, карточка не пустая', async () => {
    const list = [w('1', 'one'), w('2', 'two')]
    const c = mount(FlashCard, { props: { words: list } })
    await c.get('[data-test="fc-next"]').trigger('click') // на «two» (последнее)
    await c.setProps({ words: [list[0]] })
    expect(c.get('[data-test="fc-word"]').text()).toBe('one')
  })
})
