<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { elapsedSec, formatElapsed, onWorkoutsPage, readActive, type ActiveInfo } from '../lib/activeWorkoutBadge'

// Плашка «Идёт тренировка · 0:42:10» (BACKLOG 69.2, срез 4): ведёт обратно в «Тренировки». Живёт на всех страницах, кроме самих «Тренировок».
const read = (): ActiveInfo | null => { try { return readActive(localStorage) } catch { return null } }
const info = ref<ActiveInfo | null>(read())
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
const refresh = () => { info.value = read(); now.value = Date.now() }
onMounted(() => {
  timer = setInterval(refresh, 1000) // дёшево: один getItem в секунду; заодно подхватывает старт/конец в другой вкладке
  window.addEventListener('storage', refresh)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer); window.removeEventListener('storage', refresh) })
const visible = computed(() => info.value !== null && !onWorkoutsPage(location.pathname))
const time = computed(() => (info.value ? formatElapsed(elapsedSec(info.value, now.value)) : ''))
const title = computed(() => `${t('hdr_active_workout')} · ${time.value}`)
</script>

<template>
  <a v-if="visible" href="/workouts/" class="gh-aw" data-test="active-workout-badge" :title="title" :aria-label="title">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></svg>
    <span class="gh-aw-t">{{ time }}</span>
  </a>
</template>
