// Регистрация service worker'а (BACKLOG 🎨 п.2 «PWA / Установка», 66.3 «Оболочка PWA»). Раньше /sw.js регистрировал только config.js,
// который грузят легаси-страницы; на Vue-страницах он не подключён, поэтому новый пользователь, открывший /login/, service worker не
// получал, и браузер не считал сайт устанавливаемым (нет значка установки в адресной строке). Регистрация безопасна: sw.js кэширует
// страницы пилотов и их файлы (список — sw-assets.js, генерирует scripts/gen_sw_assets.py) и не трогает остальное, в т. ч. Supabase и запись.
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((e: unknown) => console.warn('sw register failed', e))
    requestPersistentStorage()
  }
  // после load — регистрация не мешает первой отрисовке; если страница уже загружена, регистрируем сразу
  if (typeof document !== 'undefined' && document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

// Просим браузер не вычищать хранилище сайта при нехватке места: иначе кэши оболочки и офлайн-очередь записей (IndexedDB) могут исчезнуть.
// Тихо и без диалога (Chrome решает по вовлечённости/установке); старый браузер без storage.persist — молча пропускаем.
function requestPersistentStorage(): void {
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (storage && typeof storage.persist === 'function') void storage.persist().catch(() => {})
  } catch {
    /* не критично: офлайн-режим работает и без постоянного хранилища */
  }
}
