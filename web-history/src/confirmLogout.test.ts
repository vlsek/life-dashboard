import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts пилота Дашборда).
import { readFileSync } from 'node:fs'
import ConfirmLogoutModal from './components/ConfirmLogoutModal.vue'

const shell: string = readFileSync('src/components/AppShell.vue', 'utf-8')

describe('ConfirmLogoutModal (history)', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('спрашивает «Точно выйти?», две кнопки: «Отмена» и «Выйти»', () => {
    const w = mount(ConfirmLogoutModal)
    expect(w.text()).toContain('Точно выйти?')
    expect(w.find('[data-test="logout-cancel"]').text()).toBe('Отмена')
    expect(w.find('[data-test="logout-confirm-btn"]').text()).toBe('Выйти')
  })

  it('«Выйти» шлёт confirm, «Отмена» — cancel, фон и Esc отменяют, клик внутри окна — нет', async () => {
    const w = mount(ConfirmLogoutModal, { attachTo: document.body })
    await w.find('[data-test="logout-confirm"]').trigger('click')
    expect(w.emitted('cancel')).toBeUndefined()
    await w.find('[data-test="logout-cancel"]').trigger('click')
    await w.find('.logout-backdrop').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('cancel')).toHaveLength(3)
    expect(w.emitted('confirm')).toBeUndefined()
    await w.find('[data-test="logout-confirm-btn"]').trigger('click')
    expect(w.emitted('confirm')).toHaveLength(1)
    w.unmount()
  })

  it('фокус сразу на «Отмене»', () => {
    const w = mount(ConfirmLogoutModal, { attachTo: document.body })
    expect(document.activeElement).toBe(w.find('[data-test="logout-cancel"]').element)
    w.unmount()
  })

  it('EN: английские тексты', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ConfirmLogoutModal)
    expect(w.text()).toContain('Log out?')
    expect(w.find('[data-test="logout-cancel"]').text()).toBe('Cancel')
  })
})

describe('AppShell (history): «Выйти» больше не выходит сразу', () => {
  it('клик открывает окно подтверждения, logout — только по его confirm', () => {
    expect(shell).toContain('@click="logoutConfirmOpen = true"')
    expect(shell).not.toContain('@click="logout"')
    expect(shell).toContain('<ConfirmLogoutModal v-if="logoutConfirmOpen" @confirm="logout" @cancel="logoutConfirmOpen = false" />')
  })
})
