<script setup lang="ts">
import SplashFlameLive from './splash/SplashFlameLive.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getLang, setLang, t, type DictKey } from '../lib/i18n'
import { FAVORITE_THEMES_EVENT, UNLOCKED_THEMES_EVENT, getTheme, setTheme, THEME_KEYS, visibleThemes, type ThemeKey } from '../lib/theme'
import { logout } from '../lib/supabase'
import ConfirmLogoutModal from './ConfirmLogoutModal.vue'
import ConfirmDialogHost from './ConfirmDialogHost.vue'
import { loadVersionInfo } from '../lib/version'
import { handleInstallClick, isStandaloneApp } from '../lib/install'
import InstallModal from './InstallModal.vue'
import WelcomeTourModal from './WelcomeTourModal.vue'
import AboutModal from './AboutModal.vue'
import Icon from './Icon.vue'
import ChangelogModal from './ChangelogModal.vue'

// Порт шапки + выезжающего меню из renderNav() (config.js) на Vue. Копия компонента из
// web-history/ (см. ROADMAP.md — пока намеренно дублируется для каждой страницы пилота,
// а не выносится в общий пакет). Пункты меню ведут на остальные страницы по абсолютным
// путям — тот же домен, та же сессия входа; на новом стеке уже мигрированные страницы
// ссылаются на свои *-vue/ адреса, остальные — на старые ванильные .html.
// "Install app", "Как пользоваться" и "О проекте" пока не перенесены — это отдельные
// модалки/логика (beforeinstallprompt, приветственный тур), сделаю в одной из следующих
// итераций переезда, если пилот приживётся.
const props = defineProps<{ userEmail: string | null }>()

// «Установить приложение» / «Как пользоваться» / «О создателе» — модалки как в account/history/languages (BACKLOG 49.4, 49.7).
const showInSidebar = !isStandaloneApp()
const installModalOpen = ref(false)
const tourOpen = ref(false)
const aboutOpen = ref(false)
async function onInstallClick() {
  const shown = await handleInstallClick()
  if (!shown) installModalOpen.value = true
}
function openInstall() {
  closeSidebar()
  onInstallClick()
}
function openTour() {
  closeSidebar()
  tourOpen.value = true
}
function openAbout() {
  closeSidebar()
  aboutOpen.value = true
}
// Тур «Как пользоваться» после онбординга (BACKLOG 49.4): онбординг ставит флаг tour_pending — показываем один раз на первой же странице.
try {
  if (localStorage.getItem('tour_pending')) {
    localStorage.removeItem('tour_pending')
    tourOpen.value = true
  }
} catch {
  /* localStorage недоступен — тур можно открыть из меню */
}

interface NavPage {
  href: string
  key: string
  labelKey: DictKey
  icon: string
}
const pages: NavPage[] = [
  { href: '/dashboard/', key: 'dashboard', labelKey: 'nav_dashboard', icon: 'home' },
  { href: '/goals/', key: 'goals', labelKey: 'nav_goals', icon: 'goals' },
  { href: '/skills/', key: 'skills', labelKey: 'nav_skills', icon: 'skills' },
  { href: '/workouts/', key: 'workouts', labelKey: 'nav_workouts', icon: 'workouts' },
  { href: '/challenges/', key: 'challenges', labelKey: 'nav_challenges', icon: 'challenges' },
  { href: '/languages/', key: 'english', labelKey: 'nav_english', icon: 'english' },
  { href: '/calendar/', key: 'calendar', labelKey: 'nav_calendar', icon: 'calendar' },
  { href: '/milestones/', key: 'milestones', labelKey: 'nav_milestones', icon: 'milestones' },
  { href: '/shop/', key: 'shop', labelKey: 'nav_shop', icon: 'shop' },
  { href: '/achievements/', key: 'achievements', labelKey: 'nav_achievements', icon: 'medal' },
  { href: '/customization/', key: 'customization', labelKey: 'nav_customization', icon: 'paintbrush' },
  { href: '/community/', key: 'community', labelKey: 'nav_community', icon: 'community' },
]
const active = 'challenges'
// «Избранное» — левое сердечко со списком быстрых ссылок — ТОЛЬКО на главной (BACKLOG 45.1); на остальных страницах — только правое сердечко «добавить страницу в избранное» из шапки
const isHome = String(active) === 'dashboard'
// Ссылка на классическую (legacy) версию ЭТОЙ страницы — одна, неприметная, внизу меню.
// Страница переезжает в /legacy/ (фаза 2) — обновить значение здесь (HANDOFF, шаг 6);
// scripts/check_nav_links.py проверяет, что адрес существует.
const classicHref = '/legacy/challenges.html'
function plainLabel(key: DictKey): string {
  return t(key).replace(/^[^\p{L}\p{N}]+/u, '')
}

const sidebarOpen = ref(false)
const quickNavOpen = ref(false)

// «Избранное» (BACKLOG 6.2): список по шеврону показывает только избранные страницы. Состояние лежит в localStorage
// `favorite_pages` (JSON-массив ключей страниц) и меняется сердечком в шапке (бандл /header-widgets/, событие favorites:changed);
// синхронизацию с профилем делает тот же бандл — здесь только чтение.
function readFavorites(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem('favorite_pages') || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
const favorites = ref<string[]>(readFavorites())
const syncFavorites = () => (favorites.value = readFavorites())
// Боковое меню (BACKLOG 6.2): основные страницы, затем разделитель и «История» в самом низу (перед «Аккаунтом»)
// «Кастомизация» — в самом низу меню, под разделителем, после «Истории» (решение владельца 2026-10-04: «в самый низ за черту»)
const BOTTOM_KEYS = ['customization']
const sidebarPages = pages.filter((p) => !BOTTOM_KEYS.includes(p.key))
const bottomPages = BOTTOM_KEYS.map((k) => pages.find((p) => p.key === k)).filter((p): p is NavPage => !!p)
const quickPages = computed(() => pages.filter((p) => p.key !== 'dashboard' && favorites.value.includes(p.key)))
onMounted(() => window.addEventListener('favorites:changed', syncFavorites))
onUnmounted(() => window.removeEventListener('favorites:changed', syncFavorites))
// BACKLOG «При активном всплывающем окне нельзя вызывать левую и правую шторки»: пока на странице есть окно (свои — `.modal-backdrop`, окно
// выхода — `.logout-backdrop`, окна глобальной шапки — `.gh-backdrop`), шторки не открываются ни свайпом, ни кнопкой. Закрытие уже открытой
// шторки это не затрагивает. Селектор общий с `web-header/src/lib/edgeSwipe.ts` (правая шторка) — менять в обоих местах.
const MODAL_SELECTOR = '.modal-backdrop, .gh-backdrop, .logout-backdrop'
function isModalOpen(): boolean {
  return document.querySelector(MODAL_SELECTOR) !== null
}
function openSidebar() {
  if (isModalOpen()) return
  sidebarOpen.value = true
}
function closeSidebar() {
  sidebarOpen.value = false
}

// Пока боковое меню открыто, страница под ним не прокручивается (BACKLOG 23:01). Блокировку делят левая шторка (здесь) и правая
// панель из бандла /header-widgets/: у каждой свой атрибут на <html>, прокрутка возвращается, когда сняты оба.
function applyScrollLock(side: 'left' | 'right', on: boolean) {
  const root = document.documentElement
  if (on) root.setAttribute('data-lock-' + side, '')
  else root.removeAttribute('data-lock-' + side)
  root.style.overflow = root.hasAttribute('data-lock-left') || root.hasAttribute('data-lock-right') ? 'hidden' : ''
}
watch(sidebarOpen, (open) => applyScrollLock('left', open))
onUnmounted(() => applyScrollLock('left', false))

const changelogOpen = ref(false)
const logoutConfirmOpen = ref(false) // «Точно выйти?» (BACKLOG 18)
const version = ref('')
onMounted(async () => {
  try {
    version.value = (await loadVersionInfo()).version
  } catch {
    /* сайдбар остаётся без номера версии — не критично */
  }
})

const themeVal = ref<ThemeKey>(getTheme())
function onThemeChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as ThemeKey
  themeVal.value = v
  setTheme(v)
}
// Список тем — только любимые (отмечаются в «Кастомизации», максимум 4); активная тема остаётся в списке всегда.
const favTick = ref(0)
const themeOptions = computed(() => {
  void favTick.value
  return visibleThemes(themeVal.value)
})
const syncFavThemes = () => favTick.value++
onMounted(() => {
  window.addEventListener(FAVORITE_THEMES_EVENT, syncFavThemes)
  window.addEventListener(UNLOCKED_THEMES_EVENT, syncFavThemes)
})
onUnmounted(() => {
  window.removeEventListener(FAVORITE_THEMES_EVENT, syncFavThemes)
  window.removeEventListener(UNLOCKED_THEMES_EVENT, syncFavThemes)
})
const lang = getLang()

// Свайп открытия/закрытия — тот же порог и та же "центральная зона" для открытия,
// что и в config.js (setupSidebarSwipe), только состояние живёт в ref, а не в classList.
let startX = 0
let startY = 0
let tracking = false
let mode: 'open' | 'close' | null = null
const SWIPE_THRESHOLD = 70
const MAX_VERTICAL_DRIFT = 60
const CENTER_ZONE_MIN = 0.15
const CENTER_ZONE_MAX = 0.85

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (sidebarOpen.value) {
    mode = 'close'
    startX = touch.clientX
    startY = touch.clientY
    tracking = true
    return
  }
  const target = e.target as HTMLElement
  if (target.closest('.no-edge-swipe') || isModalOpen()) {
    tracking = false
    return
  }
  const w = window.innerWidth
  if (touch.clientX < w * CENTER_ZONE_MIN || touch.clientX > w * CENTER_ZONE_MAX) {
    tracking = false
    return
  }
  mode = 'open'
  startX = touch.clientX
  startY = touch.clientY
  tracking = true
}
function onTouchMove(e: TouchEvent) {
  if (!tracking) return
  const touch = e.touches[0]
  const dx = touch.clientX - startX
  const dy = Math.abs(touch.clientY - startY)
  if (dy > MAX_VERTICAL_DRIFT) {
    tracking = false
    return
  }
  if (mode === 'open' && dx > SWIPE_THRESHOLD) {
    sidebarOpen.value = true
    tracking = false
  } else if (mode === 'close' && dx < -SWIPE_THRESHOLD) {
    sidebarOpen.value = false
    tracking = false
  }
}
function onTouchEnd() {
  tracking = false
}

// Esc закрывает быстрые ссылки в верхней панели (доступность: кнопка-раскрывашка с aria-expanded).
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') quickNavOpen.value = false
}

onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="sticky top-0 z-20 flex items-center gap-2 border-b px-4 py-2.5"
    style="background: var(--bg-card); border-color: var(--border)"
  >
    <button
      type="button"
      class="rounded-lg border px-3 py-1.5 text-lg leading-none"
      style="background: transparent; border-color: var(--border); color: var(--text)"
      :aria-label="t('nav_open_menu')"
      @click="openSidebar"
    >
      <Icon name="menu" />
    </button>
    <a href="/dashboard/" class="flex h-10 w-10 items-center justify-center rounded-lg" :title="plainLabel('nav_dashboard')">
      <SplashFlameLive :size="30" :sparks="false" data-test="brand-flame" />
    </a>
    <template v-if="isHome">
    <button
      type="button"
      class="qn-toggle"
      :class="{ 'qn-open': quickNavOpen }"
      :aria-label="t('nav_favorites')"
      :title="t('nav_favorites')"
      :aria-expanded="quickNavOpen"
      aria-controls="quick-nav"
      data-testid="quicknav-toggle"
      @click="quickNavOpen = !quickNavOpen"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true" data-test="qn-heart">
        <path d="M12 20.4l-1.3-1.2C6 14.9 3 12.2 3 8.9 3 6.3 5 4.3 7.6 4.3c1.5 0 2.9.7 3.8 1.8l.6.8.6-.8c.9-1.1 2.3-1.8 3.8-1.8C19 4.3 21 6.3 21 8.9c0 3.3-3 6-7.7 10.3L12 20.4z" />
      </svg>
    </button>
    <Transition name="qn">
      <div v-if="quickNavOpen" id="quick-nav" class="qn-list no-edge-swipe" data-testid="quicknav-list">
        <a
          v-for="p in quickPages"
          :key="p.key"
          :href="p.href"
          class="qn-chip"
          :class="{ 'qn-chip-active': p.key === active }"
        >
          <Icon :name="p.icon" />
          {{ plainLabel(p.labelKey) }}
        </a>
        <span v-if="!quickPages.length" class="qn-empty" data-testid="quicknav-empty">{{ t('nav_favorites_empty') }}</span>
      </div>
    </Transition>
    </template>
    <div class="ml-auto flex items-center gap-1.5" id="topbar-right"></div>
  </div>

  <div
    v-if="sidebarOpen"
    class="fixed inset-0 z-[29] bg-black/50"
    style="touch-action: none"
    data-testid="sidebar-overlay"
    @click="closeSidebar"
    @touchmove.prevent
  ></div>
  <nav
    class="fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto border-r p-4 [&>*]:shrink-0 transition-transform duration-200"
    :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    style="background: var(--bg-card); border-color: var(--border)"
  >
    <!-- сюда бандл /header-widgets/ рисует блок профиля (аватар, имя) и, по настройке, кольца дня/недели (BACKLOG 6.2) -->
    <div id="sidebar-top"></div>

    <a
      v-for="p in sidebarPages"
      :key="p.key"
      :href="p.href"
      class="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      :style="{ background: p.key === active ? 'var(--accent)' : 'transparent', color: p.key === active ? 'var(--accent-text)' : 'var(--text)' }"
      @click="closeSidebar"
    >
      <Icon :name="p.icon" />
      <span>{{ plainLabel(p.labelKey) }}</span>
    </a>

    <div class="my-1 border-t" style="border-color: var(--border)"></div>

    <a
      v-for="p in bottomPages"
      :key="p.key"
      :href="p.href"
      class="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      :style="{ background: p.key === active ? 'var(--accent)' : 'transparent', color: p.key === active ? 'var(--accent-text)' : 'var(--text)' }"
      @click="closeSidebar"
    >
      <Icon :name="p.icon" />
      <span>{{ plainLabel(p.labelKey) }}</span>
    </a>

    <a
      v-if="props.userEmail"
      href="/account/"
      class="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      style="color: var(--text)"
      @click="closeSidebar"
    >
      <Icon name="user" />
      {{ t('nav_account_title') }}
    </a>

    <div class="my-2 border-t" style="border-color: var(--border)"></div>

    <div class="flex gap-1 px-1">
      <button
        v-for="l in ['en', 'ru'] as const"
        :key="l"
        type="button"
        class="flex-1 rounded-lg border py-1.5 text-sm"
        :style="{
          borderColor: 'var(--border)',
          background: lang === l ? 'var(--accent)' : 'transparent',
          color: lang === l ? 'var(--accent-text)' : 'var(--text)',
        }"
        @click="setLang(l)"
      >
        {{ l.toUpperCase() }}
      </button>
    </div>

    <select
      class="mx-1 mt-2 rounded-lg border px-2 py-1.5 text-sm"
      style="background: var(--bg); color: var(--text); border-color: var(--border)"
      :value="themeVal"
      @change="onThemeChange"
    >
      <option v-for="key in themeOptions" :key="key" :value="key">{{ t(THEME_KEYS[key] as DictKey) }}</option>
    </select>

    <button
      v-if="showInSidebar"
      type="button"
      class="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm"
      style="background: transparent; color: var(--text-dim)"
      data-test="nav-install"
      @click="openInstall"
    >
      <Icon name="download" />
      {{ t('nav_install_app') }}
    </button>
    <button
      type="button"
      class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm"
      style="background: transparent; color: var(--text-dim)"
      data-test="nav-tour"
      @click="openTour"
    >
      <Icon name="help" />
      {{ t('nav_tour') }}
    </button>
    <button
      type="button"
      class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm"
      style="background: transparent; color: var(--text-dim)"
      data-test="nav-about"
      @click="openAbout"
    >
      <Icon name="info" />
      {{ t('nav_about') }}
    </button>

    <button
      v-if="props.userEmail"
      type="button"
      class="mt-2 truncate rounded-lg border px-3 py-2 text-left text-sm"
      style="background: transparent; border-color: var(--border); color: var(--text-dim)"
      data-test="logout-btn"
      @click="logoutConfirmOpen = true"
    >
      {{ t('logout') }} ({{ props.userEmail }})
    </button>

    <button
      type="button"
      class="mt-2 rounded-lg px-3 py-1.5 text-center text-xs"
      style="background: transparent; color: var(--text-dim); opacity: 0.7"
      data-test="version-btn"
      @click="changelogOpen = true"
    >
      v{{ version }}
    </button>

    <a
      v-if="classicHref"
      :href="classicHref"
      class="mt-auto pt-3 text-center text-[0.7em]"
      style="color: var(--text-dim); opacity: 0.55"
      data-test="legacy-link"
    >
      legacy-{{ active }}
    </a>
  </nav>

  <ChangelogModal v-if="changelogOpen" @close="changelogOpen = false" />
  <InstallModal v-if="installModalOpen" @close="installModalOpen = false" />
  <WelcomeTourModal v-if="tourOpen" @close="tourOpen = false" />
  <AboutModal v-if="aboutOpen" @close="aboutOpen = false" />
  <ConfirmLogoutModal v-if="logoutConfirmOpen" @confirm="logout" @cancel="logoutConfirmOpen = false" />
  <ConfirmDialogHost />
</template>

<style>
/* Быстрые ссылки в верхней панели (BACKLOG 16, «14:55»): круглая кнопка с шевроном вместо «>>>»,
   ссылки-«пилюли» с плавным появлением и затуханием по правому краю. Анимации гасятся
   системной настройкой «уменьшить движение» и общим выключателем <html data-motion="off">. */
.qn-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  /* БЕЗ внутренних отступов: глобальный отступ кнопок .375rem .9rem (слой base) оставлял на сердечко ~1 px, оно сжималось, и кнопка выглядела пустым кругом (BACKLOG раздел 42, 8:54) */
  padding: 0;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}
/* сердечко — фиксированного размера, не сжимается flex-контейнером */
.qn-toggle svg {
  flex: none;
  display: block;
}
.qn-toggle:hover {
  color: var(--text);
  border-color: var(--text-dim);
}
.qn-toggle:focus-visible,
.qn-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.qn-toggle svg path {
  transition: fill 0.2s ease;
}
.qn-toggle.qn-open {
  color: var(--accent);
  border-color: var(--accent);
}
/* сердечко: контур — список избранного закрыт, залито цветом темы — открыт (раньше был шеврон, который при открытии поворачивался) */
.qn-toggle.qn-open svg path {
  fill: currentColor;
}
.qn-list {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 18px 2px 2px;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
  mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
}
.qn-list::-webkit-scrollbar {
  display: none;
}
.qn-chip {
  flex-shrink: 0;
  white-space: nowrap;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 5px 12px;
  font-size: 0.78rem;
  text-decoration: none;
  transition: border-color 0.15s ease;
}
.qn-chip:hover {
  border-color: var(--text-dim);
}
.qn-chip.qn-chip-active {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}
.qn-enter-active,
.qn-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.qn-enter-from,
.qn-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
@media (prefers-reduced-motion: reduce) {
  .qn-toggle,
  .qn-toggle svg,
  .qn-chip,
  .qn-enter-active,
  .qn-leave-active {
    transition: none;
  }
}
html[data-motion='off'] .qn-toggle,
html[data-motion='off'] .qn-toggle svg,
html[data-motion='off'] .qn-chip,
html[data-motion='off'] .qn-enter-active,
html[data-motion='off'] .qn-leave-active {
  transition: none;
}
/* Пустое «Избранное» в списке по шеврону (BACKLOG 6.2) */
.qn-empty {
  font-size: 0.8rem;
  color: var(--text-dim);
  white-space: nowrap;
}
</style>
