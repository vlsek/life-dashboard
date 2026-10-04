// Имя и аватарка из Google-аккаунта (BACKLOG 766 + 841, решение владельца 2026-10-04) и проверка имени профиля.
// КОПИЯ живёт в web-header/src/lib/googleProfile.ts (там — для уже зарегистрированных с пустым именем); менять ВМЕСТЕ,
// страж — web-onboarding/src/lib/googleProfile.test.ts. Чистые функции, без сети.

export const NAME_MAX = 40

// Имя как его хранить: пробелы по краям убираем, внутри схлопываем до одного, длину режем до NAME_MAX (по символам, не по байтам).
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return Array.from(raw.replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join('').trim()
}

export interface GoogleProfile {
  name: string | null
  avatar: string | null
}

type UserLike = { user_metadata?: Record<string, unknown> | null } | null | undefined

// Supabase Auth кладёт данные Google в user_metadata: full_name / name (иногда только given_name + family_name),
// avatar_url / picture. Аватар берём только по https (в профиле он потом показывается как <img src>).
export function googleProfile(user: UserLike): GoogleProfile {
  const m = (user?.user_metadata ?? {}) as Record<string, unknown>
  const parts = [m.given_name, m.family_name].filter((x): x is string => typeof x === 'string' && x.trim() !== '').join(' ')
  const name = cleanName(m.full_name) || cleanName(m.name) || cleanName(parts) || null
  const pic = [m.avatar_url, m.picture].find((x): x is string => typeof x === 'string' && /^https:\/\/\S+$/i.test(x.trim()))
  return { name, avatar: pic ? pic.trim() : null }
}
