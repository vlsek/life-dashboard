// Имя профиля в «Сообществе» (BACKLOG 841: имя обязательно). Правила те же, что в онбординге (web-onboarding/src/lib/googleProfile.ts:
// cleanName / NAME_MAX): пробелы по краям убираем, внутри схлопываем, не больше 40 символов (по символам, эмодзи не ломаем).
export const NAME_MAX = 40

export function cleanProfileName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return Array.from(raw.replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join('').trim()
}

// У собственного профиля нет имени: пусто, только пробелы или профиль ещё не создан.
export function needsName(profile: { display_name: string | null } | null): boolean {
  return !!profile && !cleanProfileName(profile.display_name)
}
