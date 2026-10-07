import { t } from './i18n'

// Единая «человеческая» ошибка для пользователя (BACKLOG раздел 35 🐞 «при удалении метрики плашка с техническим текстом и адресом Supabase… и в
// остальных местах»). Сообщения драйвера/Supabase (адрес проекта, имя таблицы, «TypeError: Failed to fetch», коды) пользователю НЕ показываем —
// только понятный текст по типу ошибки и по действию; подробности уходят в консоль. Копия файла из web-dashboard (бандлы пилотов независимы):
// копировать вместе с ключами err_* из i18n.ts.
export type ErrKind = 'network' | 'forbidden' | 'in_use' | 'validation' | 'generic'
export type ErrAction = 'save' | 'delete' | 'load' | 'upload'

type ErrLike = { message?: unknown; code?: unknown; status?: unknown; details?: unknown } | null | undefined

export function errorKind(err: unknown): ErrKind {
  const e = (err && typeof err === 'object' ? err : { message: err }) as ErrLike
  const msg = String(e?.message ?? '').toLowerCase()
  const code = String(e?.code ?? '')
  const status = Number(e?.status)
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out/.test(msg)) return 'network'
  if (code === '42501' || status === 401 || status === 403 || /row-level security|permission denied|jwt|not authorized|not allowed/.test(msg)) return 'forbidden'
  if (code === '23503' || /foreign key|still referenced|violates foreign/.test(msg)) return 'in_use'
  if (code === '23514' || code === '22P02' || code === '23502' || code === '22003' || /invalid input|check constraint|null value in column|out of range/.test(msg)) return 'validation'
  return 'generic'
}

// action — что пытались сделать: от него зависит общий текст для «прочих» ошибок («не получилось сохранить / удалить / загрузить / загрузить файл»).
export function friendlyError(err: unknown, action: ErrAction = 'save', log = true): string {
  if (log) console.error('[onboarding]', err)
  const kind = errorKind(err)
  if (kind !== 'generic') return t(('err_' + kind) as 'err_network')
  return t(('err_generic_' + action) as 'err_generic_save')
}
