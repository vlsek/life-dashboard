import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HelpModal from './HelpModal.vue'
import { helpOpen } from '../lib/hotkeys'

beforeEach(() => { localStorage.setItem('site_lang', 'ru'); helpOpen.value = false })

describe('HelpModal (79.10)', () => {
  it('закрыта, пока флаг не поднят', () => {
    expect(mount(HelpModal).find('[data-test="help-modal"]').exists()).toBe(false)
  })
  it('открывается с полным списком; поиск сужает; пустой результат — подсказка', async () => {
    helpOpen.value = true
    const w = mount(HelpModal)
    const all = w.findAll('section').length
    expect(all).toBeGreaterThan(10)
    await w.get('[data-test="help-search"]').setValue('норма')
    expect(w.findAll('section').length).toBeLessThan(all)
    expect(w.find('[data-test="help-topic-water"]').exists()).toBe(true)
    await w.get('[data-test="help-search"]').setValue('ъъъъ')
    expect(w.find('[data-test="help-empty"]').exists()).toBe(true)
  })
  it('у страничной темы есть ссылка на страницу', () => {
    helpOpen.value = true
    const w = mount(HelpModal)
    expect(w.get('[data-test="help-topic-page:goals"] a').attributes('href')).toBe('/goals/')
  })
  it('закрывается крестиком и по Esc', async () => {
    helpOpen.value = true
    const w = mount(HelpModal)
    await w.get('[data-test="help-close"]').trigger('click')
    expect(helpOpen.value).toBe(false)
    helpOpen.value = true
    await w.vm.$nextTick()
    await w.get('.gh-backdrop').trigger('keydown', { key: 'Escape' })
    expect(helpOpen.value).toBe(false)
  })
})
