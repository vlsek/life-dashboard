import { createApp } from 'vue'
import css from './header.css?inline'
import App from './App.vue'

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

function mount(target: HTMLElement) {
  if (document.getElementById('global-header-widgets')) return
  applyMotion()
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  const host = document.createElement('div')
  host.id = 'global-header-widgets'
  host.style.display = 'contents'
  target.prepend(host)
  createApp(App, { panelOnly: PANEL_ONLY.test(location.pathname) }).mount(host)
}

function start() {
  if (SKIP.test(location.pathname)) return
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
