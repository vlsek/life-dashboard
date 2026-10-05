<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'
import type { PerfectDayPopup } from '../lib/usePerfectDay'

// Окно-поздравление «Идеальный день!» (BACKLOG раздел 36): поздравление, число идеальных дней, а ниже — либо полученное сейчас
// достижение, либо полоса «до следующего достижения осталось N». Анимация (рисование галочки и вспышки) гасится выключателем
// «выключить все анимации» и prefers-reduced-motion — остаётся статичное окно.
const props = defineProps<{ popup: PerfectDayPopup }>()
const emit = defineEmits<{ close: []; disable: [] }>()

const achName = (target: number) => t(('dash_perfect_ach_' + target) as DictKey)
const gainedName = computed(() => (props.popup.gained === null ? '' : achName(props.popup.gained)))
const nextName = computed(() => (props.popup.next ? achName(props.popup.next.target) : ''))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" data-test="perfect-day-backdrop" @click.self="emit('close')">
    <div
      class="perfect-card w-full max-w-xs rounded-2xl border p-6 text-center"
      style="background: var(--bg-card); border-color: var(--border); color: var(--text)"
      role="dialog"
      aria-modal="true"
      :aria-label="t('dash_perfect_title')"
      data-test="perfect-day"
    >
      <div class="perfect-badge" aria-hidden="true">
        <span class="perfect-ring"></span>
        <svg viewBox="0 0 64 64" width="88" height="88">
          <circle cx="32" cy="32" r="28" fill="none" stroke="var(--accent)" stroke-width="4" />
          <path class="perfect-check" d="M19 33l9 9 17-19" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <h2 class="mt-2 text-2xl font-extrabold" style="color: var(--accent)" data-test="perfect-title">{{ t('dash_perfect_title') }}</h2>
      <p class="mt-1 text-sm">{{ t('dash_perfect_lead') }}</p>
      <p class="dim mt-1 text-sm" data-test="perfect-count">{{ t('dash_perfect_count').replace('{n}', String(popup.count)) }}</p>

      <div v-if="popup.gained !== null" class="mt-4 rounded-xl border p-3" style="border-color: var(--accent)" data-test="perfect-gained">
        <div class="dim text-xs">{{ t('dash_perfect_gained') }}</div>
        <div class="mt-0.5 text-lg font-bold" data-test="perfect-gained-name">{{ gainedName }}</div>
      </div>

      <div v-if="popup.next" class="mt-4 text-left" data-test="perfect-next">
        <div class="text-sm" data-test="perfect-next-text">{{ t('dash_perfect_next').replace('{name}', nextName).replace('{n}', String(popup.next.remaining)) }}</div>
        <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full" style="background: var(--bg)" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="popup.next.pct" data-test="perfect-bar">
          <div class="h-full rounded-full" :style="{ width: popup.next.pct + '%', background: 'var(--accent)' }" data-test="perfect-fill"></div>
        </div>
        <div class="dim mt-1 text-xs" data-test="perfect-progress">{{ t('dash_perfect_progress').replace('{have}', String(popup.count)).replace('{target}', String(popup.next.target)) }}</div>
      </div>
      <p v-else-if="popup.gained === null" class="mt-4 text-sm" data-test="perfect-all">{{ t('dash_perfect_all') }}</p>

      <a href="/achievements/" class="mt-3 inline-block text-xs" style="color: var(--accent)" data-test="perfect-link">{{ t('dash_perfect_link') }}</a>

      <button type="button" class="mt-3 w-full rounded-lg px-4 py-2" style="background: var(--accent); color: var(--accent-text)" data-test="perfect-close" @click="emit('close')">
        {{ t('dash_celebrate_close') }}
      </button>
      <button type="button" class="mt-2 w-full border-0 bg-transparent px-2 py-1 text-xs underline" style="color: var(--text-dim); background: transparent" data-test="perfect-disable" @click="emit('disable')">
        {{ t('dash_celebrate_disable') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.perfect-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
}
.perfect-ring {
  position: absolute;
  inset: 4px;
  border-radius: 9999px;
  border: 2px solid var(--accent);
  opacity: 0;
}
@media (prefers-reduced-motion: no-preference) {
  .perfect-card {
    animation: perfect-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
  }
  .perfect-check {
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    animation: perfect-draw 0.55s 0.25s ease-out forwards;
  }
  .perfect-ring {
    animation: perfect-burst 1.1s 0.5s ease-out;
  }
}
/* общий выключатель анимаций (<html data-motion="off">, lib/motion.ts): без движения галочка просто нарисована */
html[data-motion='off'] .perfect-card,
html[data-motion='off'] .perfect-check,
html[data-motion='off'] .perfect-ring {
  animation: none !important;
}
html[data-motion='off'] .perfect-check {
  stroke-dasharray: none;
  stroke-dashoffset: 0;
}
html[data-motion='off'] .perfect-ring {
  display: none;
}
@keyframes perfect-pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes perfect-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes perfect-burst {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>
