import type { AdminUser } from './types'

// Дата регистрации как в admin.js (fmtRu): ДД.ММ.ГГГГ из первых десяти символов ISO; пусто — пустая строка (как раньше, без «—»).
export function fmtDate(iso: string | null | undefined): string {
  const day = (iso ?? '').slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

// Себя в таблице выделяем и удалить не даём (admin.js: u.user_id === user.id).
export function isSelf(u: AdminUser, myId: string): boolean {
  return u.user_id === myId
}

// Имя в первой колонке: display_name, иначе «—»; в подтверждении удаления — display_name, иначе e-mail (как в admin.js: u.display_name ?? u.email).
export function nameCell(u: AdminUser): string {
  return u.display_name || '—'
}
export function confirmName(u: AdminUser): string {
  return u.display_name ?? u.email
}
