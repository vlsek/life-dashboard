import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const auth = vi.hoisted(() => ({ signIn: vi.fn(), update: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  sb: { auth: { signInWithPassword: auth.signIn, updateUser: auth.update } },
}))

import PasswordModal from './PasswordModal.vue'
import { t } from '../lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  auth.signIn.mockReset().mockResolvedValue({ error: null })
  auth.update.mockReset().mockResolvedValue({ error: null })
})

async function fill(w: ReturnType<typeof mount>, values: string[]) {
  const inputs = w.findAll('input')
  for (let i = 0; i < values.length; i++) await inputs[i].setValue(values[i])
}

describe('PasswordModal', () => {
  it('с паролем: три поля (текущий, новый, повтор); без пароля — два и подсказка про Google', () => {
    const a = mount(PasswordModal, { props: { email: 'a@b.c', hasPassword: true } })
    expect(a.findAll('input')).toHaveLength(3)
    expect(a.find('[data-test="no-password-hint"]').exists()).toBe(false)
    const b = mount(PasswordModal, { props: { email: 'a@b.c', hasPassword: false } })
    expect(b.findAll('input')).toHaveLength(2)
    expect(b.find('[data-test="no-password-hint"]').exists()).toBe(true)
    a.unmount()
    b.unmount()
  })

  it('пустой текущий пароль → сообщение, сеть не трогаем', async () => {
    const w = mount(PasswordModal, { props: { email: 'a@b.c', hasPassword: true } })
    await fill(w, ['', 'new-pass', 'new-pass'])
    await w.find('[data-test="submit"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="password-msg"]').text()).toBe(t('acc_old_password_required'))
    expect(auth.signIn).not.toHaveBeenCalled()
    w.unmount()
  })

  it('неверный текущий пароль → «Текущий пароль неверный», окно остаётся, событие changed не приходит', async () => {
    auth.signIn.mockResolvedValue({ error: { status: 400, message: 'Invalid login credentials' } })
    const w = mount(PasswordModal, { props: { email: 'a@b.c', hasPassword: true } })
    await fill(w, ['wrong', 'new-pass', 'new-pass'])
    await w.find('[data-test="submit"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="password-msg"]').text()).toBe(t('acc_old_password_wrong'))
    expect(w.emitted('changed')).toBeUndefined()
    expect(auth.update).not.toHaveBeenCalled()
    w.unmount()
  })

  it('успех → событие changed', async () => {
    const w = mount(PasswordModal, { props: { email: 'a@b.c', hasPassword: true } })
    await fill(w, ['old-pass', 'new-pass', 'new-pass'])
    await w.find('[data-test="submit"]').trigger('click')
    await flushPromises()
    expect(w.emitted('changed')).toHaveLength(1)
    expect(auth.update).toHaveBeenCalledWith({ password: 'new-pass' })
    w.unmount()
  })

  it('«Отмена» закрывает без запросов', async () => {
    const w = mount(PasswordModal, { props: { email: 'a@b.c', hasPassword: true } })
    await w.findAll('button').find((b) => b.text() === t('cancel'))!.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    expect(auth.signIn).not.toHaveBeenCalled()
    w.unmount()
  })
})
