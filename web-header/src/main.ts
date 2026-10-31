import { createApp } from 'vue'
import css from './header.css?inline'
import App from './App.vue'
import SectionAchievements from './components/SectionAchievements.vue'
import { sb } from './lib/supabase'
import { startPresenceHeartbeat } from './lib/presence'
import { loadUnlockedKeys, sectionFor } from './lib/sectionAchievements'
import AchievementToast from './components/AchievementToast.vue'
import { clearUnseen, hasUnseen, markUnseen, watchDot } from './lib/achievementDot'
import { startAchievementWatcher, WATCH_SKIP, type WatchItem } from './lib/achievementWatcher'
import LogoutChooser from './components/LogoutChooser.vue'
import { captureCurrent } from '../../shared/accounts/accounts'
import { startIconPacks } from './lib/iconPacks'

// Точка входа глобального хедера (BACKLOG 2.3). Подключается на странице одним
// <script type="module" src="/header-widgets/header.js"></script>. Ждёт, пока страница (Vue AppShell) нарисует
// #topbar-right, и вставляет свой контейнер В НАЧАЛО этого блока. На Дашборде и служебных страницах не работает:
// Дашборд рисует стакан и кольца сам, вход/онбординг/админка без шапки.
const SKIP = /^\/(login|onboarding|admin|legacy)(\/|\.html|$)/
const PANEL_ONLY = /^\/dashboard(\/|\.html|$)/ // на Дашборде своя шапка — только правая панель

// Выключатель анимаций живёт в настройках Дашборда и хранится в localStorage; на других страницах <html data-motion>
// никто не ставит, поэтому применяем его здесь (на Дашборде он уже стоит — повтор безвреден).
function applyMotion() {
  try {
    if (localStorage.getItem('site_motion') === 'off') document.documentElement.setAttribute('data-motion', 'off')
  } catch {
    /* приватный режим */
  }
}

function ensureStyle() {
  if (document.getElementById('gh-header-style')) return
  const style = document.createElement('style')
  style.id = 'gh-header-style'
  style.textContent = css
  document.head.appendChild(style)
}

function mount(target: HTMLElement) {
  if (document.getElementById('global-header-widgets')) return
  applyMotion()
  ensureStyle()
  const host = document.createElement('div')
  host.id = 'global-header-widgets'
  host.style.display = 'contents'
  target.prepend(host)
  createApp(App, { panelOnly: PANEL_ONLY.test(location.pathname) }).mount(host)
}

// BACKLOG 49.6: блок «Какие достижения тут можно получить» внизу страницы раздела (сворачиваемый, без правок самих страниц).
async function mountSectionAchievements() {
  const section = sectionFor(location.pathname)
  if (!section || document.getElementById('gh-section-achievements')) return
  try {
    const { data } = await sb.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) return
    const unlocked = await loadUnlockedKeys(userId, section)
    if (document.getElementById('gh-section-achievements')) return
    ensureStyle()
    // Страницы задают `#app { height: 100% }`: контент выше экрана вылезает за этот блок, и наш блок (следующий после #app) ложится ПОВЕРХ него
    // (владелец: «блок достижений поверх надписей графика»). Класс снимает фиксированную высоту — блок идёт строго под контентом.
    document.documentElement.classList.add('gh-has-secach')
    const host = document.createElement('div')
    host.id = 'gh-section-achievements'
    document.body.appendChild(host)
    createApp(SectionAchievements, { section, unlocked }).mount(host)
  } catch {
    /* блок необязателен — страницу не ломаем */
  }
}

// BACKLOG 52.1 срез 2: поздравление о новом достижении на любой странице (фоновая проверка + карточка внизу). Несколько подряд склеиваются в один список.
let toastItems: WatchItem[] = []
let toastApp: ReturnType<typeof createApp> | null = null
function showAchievementToast(items: WatchItem[]) {
  ensureStyle()
  markUnseen() // красная точка у «Достижений» остаётся, когда карточку закрыли (52.1 срез 5)
  watchDot()
  const seen = new Set(toastItems.map((i) => i.key))
  toastItems = [...toastItems, ...items.filter((i) => !seen.has(i.key))]
  toastApp?.unmount()
  document.getElementById('gh-ach-toast')?.remove()
  ensureStyle()
  const host = document.createElement('div')
  host.id = 'gh-ach-toast'
  document.body.appendChild(host)
  toastApp = createApp(AchievementToast, {
    items: toastItems,
    onClose: () => {
      toastApp?.unmount()
      toastApp = null
      toastItems = []
      host.remove()
    },
  })
  toastApp.mount(host)
}

// BACKLOG 49.5 срез 2: дата регистрации (auth) → localStorage `account_created_at` для «меню новичка» в AppShell страниц (там нет доступа к сессии);
// событие сообщает уже открытой странице, что дата появилась (первый заход после входа). Ключ не синхронизируется: он про аккаунт, а не про устройство.
function publishAccountCreatedAt(createdAt: string | null | undefined) {
  if (!createdAt) return
  try {
    if (localStorage.getItem('account_created_at') === createdAt) return
    localStorage.setItem('account_created_at', createdAt)
  } catch {
    return
  }
  window.dispatchEvent(new Event('account-created-at'))
}

async function startWatcher() {
  if (WATCH_SKIP.test(location.pathname)) return
  try {
    const { data } = await sb.auth.getSession()
    if (!data.session) return
    publishAccountCreatedAt(data.session.user.created_at)
    startAchievementWatcher(showAchievementToast, { createdAt: data.session.user.created_at ?? null })
  } catch {
    /* без поздравления на странице — не страшно */
  }
}

// BACKLOG 48.2: «был в сети» — отметка раз в ~2 минуты, пока вкладка открыта (только вошедшим; на login/onboarding/admin шапки нет)
let presenceStarted = false
async function startPresence() {
  if (presenceStarted) return
  try {
    const { data } = await sb.auth.getSession()
    if (!data.session) return
    presenceStarted = true
    startPresenceHeartbeat()
  } catch {
    /* без отметки — не страшно */
  }
}

// BACKLOG 1081: окно «из какой выйти», когда на устройстве несколько записей. logout() пилотов вызывает его, если шапка есть на странице.
let chooserApp: ReturnType<typeof createApp> | null = null
function showLogoutChooser() {
  if (chooserApp) return
  ensureStyle()
  const host = document.createElement('div')
  host.id = 'gh-logout-chooser'
  document.body.appendChild(host)
  const close = () => {
    chooserApp?.unmount()
    chooserApp = null
    host.remove()
  }
  chooserApp = createApp(LogoutChooser, { onClose: close })
  chooserApp.mount(host)
}

// Склад записей: текущая сессия снимается при загрузке страницы и при каждом обновлении токена, чтобы у записи всегда были свежие токены
function trackAccounts() {
  captureCurrent()
  ;(window as unknown as { lifeLogoutChooser?: () => void }).lifeLogoutChooser = showLogoutChooser
  try {
    sb.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') captureCurrent()
    })
  } catch {
    /* без подписки токены снимаются при переключении и при загрузке страницы */
  }
}

function start() {
  if (SKIP.test(location.pathname)) return
  startIconPacks() // наборы иконок (44.18г срез 3): подмена «Контура» на выбранный набор на ЛЮБОЙ странице с шапкой, не дожидаясь самой шапки
  trackAccounts()
  // «Достижения» открыты — точка больше не нужна; на остальных страницах держим её, пока она не снята (52.1 срез 5)
  if (/^\/achievements(\/|\.html|$)/.test(location.pathname)) clearUnseen()
  else if (hasUnseen()) {
    ensureStyle()
    watchDot()
  }
  void mountSectionAchievements()
  void startWatcher()
  void startPresence()
  const found = document.getElementById('topbar-right')
  if (found) return mount(found)
  // AppShell рисуется после загрузки данных страницы — ждём появления, но не вечно (30 с)
  const obs = new MutationObserver(() => {
    const el = document.getElementById('topbar-right')
    if (el) {
      obs.disconnect()
      mount(el)
    }
  })
  obs.observe(document.body, { childList: true, subtree: true })
  setTimeout(() => obs.disconnect(), 30_000)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
else start()
