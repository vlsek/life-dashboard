import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  update: vi.fn(),
}))
vi.mock('./supabase', () => ({
  sb: { auth: { signInWithPassword: auth.signIn, updateUser: auth.update } },
}))

import { submitPasswordChange, validatePasswordChange } from './passwordChange'

const base = { email: 'a@b.c', hasPassword: true, oldPassword: 'old-pass', newPassword: 'new-pass', confirmPassword: 'new-pass' }

beforeEach(() => {
  auth.signIn.mockReset().mockResolvedValue({ error: null })
  auth.update.mockReset().mockResolvedValue({ error: null })
})

describe('validatePasswordChange', () => {
  it('нужен старый пароль, если у аккаунта есть пароль', () => {
    expect(validatePasswordChange({ ...base, oldPassword: '' })).toBe('old_required')
  })
  it('короткий новый пароль, несовпадение повтора, новый = старому', () => {
    expect(validatePasswordChange({ ...base, newPassword: '123', confirmPassword: '123' })).toBe('too_short')
    expect(validatePasswordChange({ ...base, confirmPassword: 'other-pass' })).toBe('mismatch')
    expect(validatePasswordChange({ ...base, newPassword: 'old-pass', confirmPassword: 'old-pass' })).toBe('same_as_old')
  })
  it('аккаунту без пароля (только Google) старый не нужен', () => {
    expect(validatePasswordChange({ ...base, hasPassword: false, oldPassword: '' })).toBeNull()
  })
  it('всё верно → null', () => {
    expect(validatePasswordChange(base)).toBeNull()
  })
})

describe('submitPasswordChange', () => {
  it('сначала проверяет старый пароль входом, потом меняет; сети не трогает при ошибке валидации', async () => {
    expect(await submitPasswordChange({ ...base, confirmPassword: 'x' })).toEqual({ ok: false, reason: 'mismatch' })
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(auth.update).not.toHaveBeenCalled()

    expect(await submitPasswordChange(base)).toEqual({ ok: true })
    expect(auth.signIn).toHaveBeenCalledWith({ email: 'a@b.c', password: 'old-pass' })
    expect(auth.update).toHaveBeenCalledWith({ password: 'new-pass' })
    expect(auth.signIn.mock.invocationCallOrder[0]).toBeLessThan(auth.update.mock.invocationCallOrder[0])
  })

  it('неверный старый пароль (400 / invalid_credentials) → wrong_old, пароль не меняется', async () => {
    auth.signIn.mockResolvedValue({ error: { status: 400, message: 'Invalid login credentials' } })
    expect(await submitPasswordChange(base)).toEqual({ ok: false, reason: 'wrong_old' })
    auth.signIn.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'x' } })
    expect(await submitPasswordChange(base)).toEqual({ ok: false, reason: 'wrong_old' })
    expect(auth.update).not.toHaveBeenCalled()
  })

  it('прочие ошибки входа (сеть, лимит) — обычная ошибка с текстом, а не «неверный пароль»', async () => {
    auth.signIn.mockResolvedValue({ error: { status: 429, message: 'rate limit' } })
    expect(await submitPasswordChange(base)).toEqual({ ok: false, reason: 'error', message: 'rate limit' })
    expect(auth.update).not.toHaveBeenCalled()
  })

  it('ошибка updateUser возвращается как error', async () => {
    auth.update.mockResolvedValue({ error: { message: 'weak password' } })
    expect(await submitPasswordChange(base)).toEqual({ ok: false, reason: 'error', message: 'weak password' })
  })

  it('без пароля (Google): вход не делается, сразу задаём первый пароль', async () => {
    expect(await submitPasswordChange({ ...base, hasPassword: false, oldPassword: '' })).toEqual({ ok: true })
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(auth.update).toHaveBeenCalledWith({ password: 'new-pass' })
  })
})
