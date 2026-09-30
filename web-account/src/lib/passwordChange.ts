import { sb } from './supabase'

// Смена пароля со старым паролем. Supabase updateUser({password}) старый пароль не спрашивает, поэтому
// проверяем его сами: повторный вход signInWithPassword(email, старый) — если не вошли, старый пароль неверный.
// Аккаунт, созданный только через Google, пароля не имеет (нет identity 'email') — ему старый пароль не нужен,
// он просто задаёт первый.
export type PasswordChangeFailure = 'old_required' | 'too_short' | 'mismatch' | 'same_as_old' | 'wrong_old' | 'error'
export type PasswordChangeResult = { ok: true } | { ok: false; reason: PasswordChangeFailure; message?: string }

export interface PasswordChangeInput {
  email: string | null
  hasPassword: boolean
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

// Чистая проверка полей формы (без сети). null = всё в порядке.
export function validatePasswordChange(i: PasswordChangeInput): PasswordChangeFailure | null {
  if (i.hasPassword && !i.oldPassword) return 'old_required'
  if (!i.newPassword || i.newPassword.length < 6) return 'too_short'
  if (i.newPassword !== i.confirmPassword) return 'mismatch'
  if (i.hasPassword && i.newPassword === i.oldPassword) return 'same_as_old'
  return null
}

export async function submitPasswordChange(i: PasswordChangeInput): Promise<PasswordChangeResult> {
  const invalid = validatePasswordChange(i)
  if (invalid) return { ok: false, reason: invalid }

  if (i.hasPassword) {
    if (!i.email) return { ok: false, reason: 'error', message: 'no email' }
    const { error: signInError } = await sb.auth.signInWithPassword({ email: i.email, password: i.oldPassword })
    if (signInError) {
      // неверные данные Supabase отдаёт как 400 / invalid_credentials; всё остальное (сеть, лимиты) — обычная ошибка
      const wrong = signInError.status === 400 || (signInError as { code?: string }).code === 'invalid_credentials'
      return wrong ? { ok: false, reason: 'wrong_old' } : { ok: false, reason: 'error', message: signInError.message }
    }
  }

  const { error } = await sb.auth.updateUser({ password: i.newPassword })
  if (error) return { ok: false, reason: 'error', message: error.message }
  return { ok: true }
}
