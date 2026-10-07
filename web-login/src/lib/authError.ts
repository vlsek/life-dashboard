import { errorKind } from './friendlyError'
import { t } from './i18n'

// Ошибки входа и регистрации (BACKLOG 942, срез 4). Сообщения Supabase Auth — обычные человеческие предложения («Password should be at least
// 6 characters», «Invalid login credentials»), их оставляем: они объясняют, ЧТО исправить. Сетевые сбои, «нет доступа» и прочие технические
// случаи (адрес сервера, имена таблиц, TypeError, JSON) заменяем понятным текстом; подробности уходят в консоль. Код «(код 400)» не показываем.
const TECHNICAL = /https?:\/\/|supabase|\bpostgres|\brelation\b|\bschema\b|TypeError|^\s*\{/i

export function authErrorText(err: unknown): string {
  const e = (err && typeof err === 'object' ? err : { message: err }) as { message?: unknown }
  const kind = errorKind(err)
  const msg = typeof e.message === 'string' ? e.message.trim() : ''
  if (kind === 'generic' && msg && !TECHNICAL.test(msg)) return msg
  console.error('[login]', err)
  if (kind === 'generic') return t('login_error_generic')
  return t(('err_' + kind) as 'err_network')
}
