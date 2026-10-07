import { errorKind, friendlyError } from './friendlyError'

// Ошибки входа/смены почты и пароля (BACKLOG 942). Сообщения Supabase Auth — обычные человеческие предложения («New password should be
// different from the old password»), их оставляем: они объясняют, ЧТО исправить. А сетевые сбои, «нет доступа» и прочие технические
// случаи (адрес сервера, имена таблиц, коды) заменяем понятным текстом через friendlyError; подробности уходят в консоль.
export function authErrorText(err: { message?: string } | null | undefined): string {
  const kind = errorKind(err)
  if (kind === 'generic' && err?.message && !/https?:\/\/|supabase|\bpostgres|\brelation\b|\bschema\b|TypeError|^\s*\{/i.test(err.message)) return err.message
  return friendlyError(err, 'save')
}
