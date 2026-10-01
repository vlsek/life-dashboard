import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'
import ConfirmLogoutModal from './components/ConfirmLogoutModal.vue'

const shell: string = readFileSync('src/components/AppShell.vue', 'utf-8')

describe('ConfirmLogoutModal', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('спрашивает «Точно выйти?» и показывает две кнопки: «Отмена» и «Выйти»', () => {
    const w = mount(ConfirmLogoutModal)
    expect(w.text()).toContain('Точно выйти?')
    expect(w.find('[data-test="logout-cancel"]').text()).toBe('Отмена')
    expect(w.find('[data-test="logout-confirm-btn"]').text()).toBe('Выйти')
    expect(w.find('[data-test="logout-confirm"]').attributes('role')).toBe('alertdialog')
  })

  it('«Выйти» шлёт confirm, «Отмена» — cancel; друг друга не вызывают', async () => {
    const w = mount(ConfirmLogoutModal)
    await w.find('[data-test="logout-cancel"]').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
    expect(w.emitted('confirm')).toBeUndefined()
    await w.find('[data-test="logout-confirm-btn"]').trigger('click')
    expect(w.emitted('confirm')).toHaveLength(1)
  })

  it('клик по затемнённому фону и Esc отменяют; клик внутри окна — нет', async () => {
    const w = mount(ConfirmLogoutModal, { attachTo: document.body })
    await w.find('[data-test="logout-confirm"]').trigger('click')
    expect(w.emitted('cancel')).toBeUndefined()
    await w.find('.modal-backdrop').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('cancel')).toHaveLength(2)
    w.unmount()
  })

  it('фокус сразу на «Отмене» — случайный Enter не выходит из аккаунта', () => {
    const w = mount(ConfirmLogoutModal, { attachTo: document.body })
    expect(document.activeElement).toBe(w.find('[data-test="logout-cancel"]').element)
    w.unmount()
  })

  it('после закрытия слушатель Esc снимается (нет лишних cancel от размонтированного окна)', () => {
    const w = mount(ConfirmLogoutModal, { attachTo: document.body })
    w.unmount()
    const spy = vi.fn()
    document.addEventListener('keydown', spy)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(spy).toHaveBeenCalledTimes(1)
    document.removeEventListener('keydown', spy)
    expect(w.emitted('cancel')).toBeUndefined()
  })

  it('EN: английские тексты', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ConfirmLogoutModal)
    expect(w.text()).toContain('Log out?')
    expect(w.find('[data-test="logout-cancel"]').text()).toBe('Cancel')
  })
})

describe('AppShell: кнопка выхода больше не выходит сразу', () => {
  it('клик открывает окно подтверждения, а logout вызывается только по его confirm', () => {
    expect(shell).toContain('@click="logoutConfirmOpen = true"')
    expect(shell).not.toMatch(/@click="logout"\s*\n\s*>\s*\n\s*\{\{ t\('logout'\) \}\}/)
    expect(shell).toContain('<ConfirmLogoutModal v-if="logoutConfirmOpen" @confirm="logout" @cancel="logoutConfirmOpen = false" />')
  })
})
