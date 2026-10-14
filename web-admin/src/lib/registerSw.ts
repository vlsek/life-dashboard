// Регистрация service worker'а (BACKLOG 🎨 п.2 «PWA / Установка»). Раньше /sw.js регистрировал только config.js, который
// грузят легаси-страницы; на Vue-страницах он не подключён, поэтому новый пользователь, открывший /login/, service worker не
// получал, и браузер не считал сайт устанавливаемым (нет значка установки в адресной строке). Регистрация безопасна:
// sw.js кэширует только свой список ASSETS (легаси) и не трогает остальные запросы, в т. ч. Supabase.
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((e: unknown) => console.warn('sw register failed', e))
  }
  // после load — регистрация не мешает первой отрисовке; если страница уже загружена, регистрируем сразу
  if (typeof document !== 'undefined' && document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
