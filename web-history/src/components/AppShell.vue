<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { getLang, setLang, t, type DictKey } from '../lib/i18n'
import { getTheme, setTheme, THEME_KEYS, type ThemeKey } from '../lib/theme'
import { logout } from '../lib/supabase'

// Порт шапки + выезжающего меню из renderNav() (config.js) на Vue. Пилотная страница
// сейчас единственная на новом стеке, поэтому остальные пункты меню ведут на старые
// (ванильные) страницы по абсолютным путям — тот же домен, та же сессия входа.
// "Install app", "Как пользоваться" и "О проекте" пока не перенесены — это отдельные
// модалки/логика (beforeinstallprompt, приветственный тур), сделаю в одной из следующих
// итераций переезда, если пилот приживётся.
const props = defineProps<{ userEmail: string | null }>()

interface NavPage {
  href: string
  key: string
  labelKey: DictKey
  icon: string
}
const pages: NavPage[] = [
  { href: '/dashboard.html', key: 'dashboard', labelKey: 'nav_dashboard', icon: 'home' },
  { href: '/goals.html', key: 'goals', labelKey: 'nav_goals', icon: 'goals' },
  { href: '/skills.html', key: 'skills', labelKey: 'nav_skills', icon: 'skills' },
  { href: '/workouts.html', key: 'workouts', labelKey: 'nav_workouts', icon: 'workouts' },
  { href: '/challenges.html', key: 'challenges', labelKey: 'nav_challenges', icon: 'challenges' },
  { href: '/english.html', key: 'english', labelKey: 'nav_english', icon: 'english' },
  { href: '/calendar.html', key: 'calendar', labelKey: 'nav_calendar', icon: 'calendar' },
  { href: '/milestones.html', key: 'milestones', labelKey: 'nav_milestones', icon: 'milestones' },
  { href: '/shop.html', key: 'shop', labelKey: 'nav_shop', icon: 'shop' },
  { href: '/community.html', key: 'community', labelKey: 'nav_community', icon: 'community' },
  { href: '/history-vue/', key: 'history', labelKey: 'nav_history', icon: 'history' },
]
const active = 'history'
function plainLabel(key: DictKey): string {
  return t(key).replace(/^[^\p{L}\p{N}]+/u, '')
}

const sidebarOpen = ref(false)
const quickNavOpen = ref(false)
function openSidebar() {
  sidebarOpen.value = true
}
function closeSidebar() {
  sidebarOpen.value = false
}

const themeVal = ref<ThemeKey>(getTheme())
function onThemeChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as ThemeKey
  themeVal.value = v
  setTheme(v)
}
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
  if (target.closest('.no-edge-swipe')) {
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

onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd)
})
onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
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
      style="border-color: var(--border); color: var(--text)"
      :aria-label="t('nav_open_menu')"
      @click="openSidebar"
    >
      ☰
    </button>
    <a href="/dashboard.html" class="flex h-10 w-10 items-center justify-center rounded-lg" :title="plainLabel('nav_dashboard')">
      <img src="/favicon.svg" alt="" class="h-7 w-7" />
    </a>
    <button
      type="button"
      class="shrink-0 rounded-lg px-2 py-1 text-sm"
      style="color: var(--text-dim)"
      :aria-label="t('nav_more')"
      @click="quickNavOpen = !quickNavOpen"
    >
      &gt;&gt;&gt;
    </button>
    <div v-if="quickNavOpen" class="no-edge-swipe flex items-center gap-1 overflow-x-auto">
      <a
        v-for="p in pages.filter((p) => p.key !== 'dashboard')"
        :key="p.key"
        :href="p.href"
        class="shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs"
        :style="{
          borderColor: 'var(--border)',
          background: p.key === active ? 'var(--accent)' : 'var(--bg)',
          color: p.key === active ? 'var(--accent-text)' : 'var(--text)',
        }"
      >
        {{ plainLabel(p.labelKey) }}
      </a>
    </div>
    <div class="ml-auto flex items-center gap-1.5" id="topbar-right"></div>
  </div>

  <div
    v-if="sidebarOpen"
    class="fixed inset-0 z-[29] bg-black/50"
    @click="closeSidebar"
  ></div>
  <nav
    class="fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto border-r p-4 transition-transform duration-200"
    :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    style="background: var(--bg-card); border-color: var(--border)"
  >
    <div class="mb-2 rounded-lg border px-2.5 py-1 text-center text-[0.72em]" style="border-color: var(--border); color: var(--text-dim)">
      {{ t('pilot_badge') }}
    </div>

    <a
      v-for="p in pages"
      :key="p.key"
      :href="p.href"
      class="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      :style="{ background: p.key === active ? 'var(--accent)' : 'transparent', color: p.key === active ? 'var(--accent-text)' : 'var(--text)' }"
      @click="closeSidebar"
    >
      <span>{{ plainLabel(p.labelKey) }}</span>
    </a>

    <a
      v-if="props.userEmail"
      href="/account.html"
      class="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      style="color: var(--text)"
      @click="closeSidebar"
    >
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
      <option v-for="(labelKey, key) in THEME_KEYS" :key="key" :value="key">{{ t(labelKey as DictKey) }}</option>
    </select>

    <button
      v-if="props.userEmail"
      type="button"
      class="mt-2 truncate rounded-lg border px-3 py-2 text-left text-sm"
      style="border-color: var(--border); color: var(--text-dim)"
      @click="logout"
    >
      {{ t('logout') }} ({{ props.userEmail }})
    </button>
  </nav>
</template>
