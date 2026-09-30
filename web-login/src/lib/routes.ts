// Куда ведут переходы со страницы входа. Собраны в одном месте, чтобы при финальном
// переключении сайта на новый стек (см. ROADMAP.md, B-cutover) поменять пути в одном файле.
// Дашборд пока остаётся ванильным (дневные метрики ещё переносятся), поэтому ведёт на .html.
export const ROUTES = {
  login: '/login/',
  onboarding: '/onboarding/',
  // Возврат из Google остаётся на старом адресе: он заведомо есть в Redirect URLs Supabase, а корневая
  // заглушка login.html пересылает на /login/ с сохранением ?code= и хэша (этап B: перейти на /login/
  // после проверки списка разрешённых адресов).
  oauthReturn: '/login.html',
  dashboard: '/dashboard/',
  portfolio: 'https://portfolio.orneryhero.workers.dev/',
} as const

// Портировано из redirectAfterAuth() в login.js: онбординг пройден — на дашборд,
// иначе — на онбординг.
export function postAuthTarget(profile: { onboarded?: boolean | null } | null | undefined): string {
  return profile?.onboarded ? ROUTES.dashboard : ROUTES.onboarding
}
