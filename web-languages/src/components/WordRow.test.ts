import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WordRow from './WordRow.vue'

const w = { id: 'w1', user_id: 'u', word: 'serendipity', translation: 'счастливая случайность', example: 'Pure serendipity.', lang: 'en', learned: false, created_at: '2026-10-01T00:00:00Z' } as never

describe('WordRow', () => {
  it('shows word, translation and example; language chip only when asked', () => {
    const a = mount(WordRow, { props: { word: w, showLang: false } })
    expect(a.text()).toContain('serendipity')
    expect(a.text()).toContain('счастливая случайность')
    expect(a.find('[data-test="word-example"]').text()).toBe('Pure serendipity.')
    expect(a.text()).not.toContain('EN')
    expect(mount(WordRow, { props: { word: w, showLang: true } }).text()).toContain('EN')
  })
  it('no example line when there is none; dash when no translation', () => {
    const b = mount(WordRow, { props: { word: { ...(w as object), example: null, translation: null } as never, showLang: false } })
    expect(b.find('[data-test="word-example"]').exists()).toBe(false)
    expect(b.text()).toContain('—')
  })
  it('emits toggle, edit and remove with the right payload', async () => {
    const r = mount(WordRow, { props: { word: w, showLang: false } })
    await r.find('input[type=checkbox]').trigger('change')
    await r.find('[data-test="word-edit"]').trigger('click')
    await r.find('[data-test="word-delete"]').trigger('click')
    expect(r.emitted('toggle')![0]).toEqual([w])
    expect(r.emitted('edit')![0]).toEqual([w])
    expect(r.emitted('remove')![0]).toEqual(['w1'])
  })
  it('learned word is struck through', () => {
    const r = mount(WordRow, { props: { word: { ...(w as object), learned: true } as never, showLang: false } })
    expect(r.find('.line-through').exists()).toBe(true)
  })
})
