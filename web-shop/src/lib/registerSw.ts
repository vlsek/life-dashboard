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
  watchForNewVersion()
  void checkMinSupported()
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

// ───── BACKLOG 66.11: «Доступна новая версия» и минимально поддерживаемая версия оболочки ─────
// Страницы пилотов отдаются service worker'ом из кэша (66.3), поэтому новая версия сайта появляется со ВТОРОЙ загрузки. Чтобы человек
// не гадал, при смене версии (новый service worker взял страницу под контроль) внизу экрана появляется плашка с кнопкой «Обновить».
// Код — на ванильном DOM (одинаковая копия в каждом пилоте, без Vue и словарей пилота); цвета — из переменных темы.

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000 // при возврате на вкладку проверять новую версию не чаще раза в 30 минут

const BANNER_TEXTS = {
  ru: { fresh: 'Доступна новая версия', update: 'Обновить', later: 'Позже', unsupported: 'Эта версия приложения устарела. Обнови приложение, чтобы продолжить.' },
  en: { fresh: 'A new version is available', update: 'Update', later: 'Later', unsupported: 'This app version is out of date. Please update the app to continue.' },
}

function bannerLang(): 'ru' | 'en' {
  try {
    return (localStorage.getItem('site_lang') || 'en') === 'ru' ? 'ru' : 'en'
  } catch {
    return 'en'
  }
}

// kind: 'fresh' — можно отложить; 'unsupported' — оболочка ниже min_supported, закрыть нельзя.
export function showUpdateBanner(kind: 'fresh' | 'unsupported', onUpdate: () => void = () => window.location.reload()): void {
  if (typeof document === 'undefined') return
  const existing = document.getElementById('ld-update-banner')
  if (existing) {
    if (kind === 'fresh' || existing.getAttribute('data-kind') === 'unsupported') return // не дублируем; «устарела» важнее «новая версия»
    existing.remove()
  }
  const tx = BANNER_TEXTS[bannerLang()]
  const box = document.createElement('div')
  box.id = 'ld-update-banner'
  box.setAttribute('data-kind', kind)
  box.setAttribute('role', kind === 'unsupported' ? 'alertdialog' : 'status')
  box.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom, 0px));z-index:2147482000;display:flex;align-items:center;gap:10px;' +
    'flex-wrap:wrap;justify-content:space-between;padding:10px 12px;border-radius:12px;border:1px solid var(--border,#ccc);' +
    'background:var(--bg-card,#fff);color:var(--text,#111);box-shadow:0 6px 24px rgba(0,0,0,.25);font:14px/1.35 system-ui,sans-serif;max-width:480px;margin:0 auto'
  const text = document.createElement('span')
  text.setAttribute('data-test', 'update-banner-text')
  text.textContent = kind === 'unsupported' ? tx.unsupported : tx.fresh
  text.style.cssText = 'flex:1 1 180px'
  const actions = document.createElement('span')
  actions.style.cssText = 'display:flex;gap:8px'
  const mk = (label: string, test: string, primary: boolean) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.setAttribute('data-test', test)
    b.style.cssText =
      'min-height:36px;padding:0 14px;border-radius:10px;cursor:pointer;font:inherit;' +
      (primary ? 'border:0;background:var(--accent,#d97a1f);color:var(--on-accent,#fff);font-weight:600' : 'border:1px solid var(--border,#ccc);background:transparent;color:inherit')
    return b
  }
  const update = mk(tx.update, 'update-banner-update', true)
  update.addEventListener('click', () => onUpdate())
  actions.appendChild(update)
  if (kind === 'fresh') {
    const later = mk(tx.later, 'update-banner-later', false)
    later.addEventListener('click', () => box.remove())
    actions.appendChild(later)
  }
  box.append(text, actions)
  document.body.appendChild(box)
}

// Новый service worker (sw.js делает skipWaiting + clients.claim) взял эту страницу под контроль → она старее кэша. Но самый первый
// service worker тоже «берёт под контроль» — тогда у страницы контроллера до этого не было, и показывать плашку нельзя.
function watchForNewVersion(): void {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
  if (!sw || typeof sw.addEventListener !== 'function') return
  const hadController = !!sw.controller
  sw.addEventListener('controllerchange', () => {
    if (hadController) showUpdateBanner('fresh')
  })
  // долгоживущая вкладка/установленное приложение: при возврате к ней спрашиваем у браузера, нет ли новой версии
  let lastCheck = Date.now()
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) return
      lastCheck = Date.now()
      sw.getRegistration?.()?.then((r) => r?.update()).catch(() => {})
    })
  }
}

// «x.yy» → число для сравнения (6.31 → 6.31; 6.5 → 6.5 — формат X.YY, но на всякий случай сравниваем по частям, а не как дробь)
export function compareVersions(a: string, b: string): number {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

// Оболочка-приложение (Capacitor, BACKLOG 66.6) до загрузки страницы выставляет window.LD_APP_VERSION = 'x.yy'. Если она ниже
// min_supported из /version.json (старый APK с несовместимой схемой) — блокирующая плашка. На сайте переменной нет: проверка молчит.
export async function checkMinSupported(): Promise<void> {
  try {
    const current = (window as unknown as { LD_APP_VERSION?: unknown }).LD_APP_VERSION
    if (typeof current !== 'string' || !current) return
    const res = await fetch('/version.json')
    if (!res.ok) return
    const data = (await res.json()) as { min_supported?: unknown }
    if (typeof data.min_supported === 'string' && compareVersions(current, data.min_supported) < 0) showUpdateBanner('unsupported')
  } catch {
    /* нет сети — не страшно: проверим при следующем запуске */
  }
}

