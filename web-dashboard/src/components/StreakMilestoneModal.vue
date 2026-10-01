<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'
import { isBigThreshold, messageIndex, unitKey } from '../lib/streakMilestones'
import type { Milestone } from '../lib/streakMilestones'

// Поздравление за серию (BACKLOG 13): разгорающийся огонёк проекта, крупное число, тёплый текст и подпись, ЗА ЧТО серия.
// Анимация (разгорание + кольца-вспышки) отключается при prefers-reduced-motion — остаётся статичная плашка.
const props = defineProps<{ milestone: Milestone }>()
const emit = defineEmits<{ close: []; disable: [] }>()

const label = computed(() => {
  const m = props.milestone
  if (m.kind === 'perfect_days') return t('dash_streak_perfect_days')
  if (m.kind === 'note_filled') return t('dash_streak_note_filled')
  return m.metricName ?? ''
})
const message = computed(() => {
  const m = props.milestone
  const prefix = isBigThreshold(m.threshold, m.unit) ? 'dash_celebrate_big_msg_' : 'dash_celebrate_msg_'
  return t((prefix + messageIndex(m.key, m.threshold)) as DictKey)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" @click.self="emit('close')">
    <div
      class="celebrate-card w-full max-w-xs rounded-2xl border p-6 text-center"
      style="background: var(--bg-card); border-color: var(--border); color: var(--text)"
      role="dialog"
      aria-modal="true"
      :aria-label="`${milestone.threshold} ${t(unitKey(milestone.threshold, milestone.unit))}`"
      data-test="streak-milestone"
    >
      <div class="celebrate-flame-wrap">
        <span class="celebrate-ring" aria-hidden="true"></span>
        <span class="celebrate-ring celebrate-ring-2" aria-hidden="true"></span>
        <svg class="streak-flame celebrate-flame" viewBox="0 0 32 32" width="96" height="96" aria-hidden="true">
          <g transform="translate(16 16) scale(1.04) translate(-16 -16) translate(3.3 0.7)">
            <path
              class="fl-outer"
              d="M16.5 0.5c1.2 5.3-3.2 6.8-3.5 11a3.2 3.2 0 0 0 6.4 0.2c2.1 1.1 3.1 4.3 3.1 7.5a9.5 10.5 0 1 1-19.5 0.3c-0.1-6.4 4.2-9.7 6.3-14 1.1-2.2 2.1-3.5 7.2-5z"
            />
            <path
              class="fl-inner"
              d="M16.3 11.2c.6 3.2-1.6 3.8-1.6 6a1.6 1.6 0 0 0 3.2 0c1.1 3.2-.5 7-3.7 7a5.3 5.3 0 0 1-5.3-5.4c0-3.7 3.2-5.3 5.3-9 .4-.7.9-1.3 2.1-2.6z"
            />
          </g>
        </svg>
      </div>

      <div class="celebrate-number mt-2 text-5xl font-extrabold" style="color: var(--accent)" data-test="milestone-number">{{ milestone.threshold }}</div>
      <div class="text-lg font-bold" data-test="milestone-unit">{{ t(unitKey(milestone.threshold, milestone.unit)) }}</div>
      <div v-if="label" class="dim mt-0.5 text-sm" data-test="milestone-label">{{ label }}</div>

      <p class="mt-3 text-sm" data-test="milestone-message">{{ message }}</p>

      <button type="button" class="mt-4 w-full rounded-lg px-4 py-2" style="background: var(--accent); color: var(--accent-text)" data-test="milestone-close" @click="emit('close')">
        {{ t('dash_celebrate_close') }}
      </button>
      <button
        type="button"
        class="mt-2 w-full border-0 bg-transparent px-2 py-1 text-xs underline"
        style="color: var(--text-dim); background: transparent"
        data-test="milestone-disable"
        @click="emit('disable')"
      >
        {{ t('dash_celebrate_disable') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.celebrate-card {
  animation: celebrate-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.celebrate-flame-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
}
.celebrate-flame {
  position: relative;
  transform-origin: 50% 90%;
  /* разгорание: из искры в полный огонь, потом обычное мерцание .streak-flame */
  animation:
    celebrate-ignite 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.1) both,
    flame-flicker 1.8s ease-in-out 0.9s infinite;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 70%, transparent));
}
.celebrate-ring {
  position: absolute;
  inset: 14px;
  border-radius: 9999px;
  border: 2px solid var(--accent);
  opacity: 0;
  animation: celebrate-ring 1.6s ease-out 0.5s 2 both;
}
.celebrate-ring-2 {
  animation-delay: 1.1s;
}
.celebrate-number {
  animation: celebrate-rise 0.6s ease-out 0.35s both;
}
@keyframes celebrate-pop {
  from { opacity: 0; transform: scale(0.85) translateY(12px); }
  to { opacity: 1; transform: none; }
}
@keyframes celebrate-ignite {
  0% { opacity: 0; transform: scale(0.15); }
  60% { opacity: 1; transform: scale(1.18); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes celebrate-ring {
  0% { opacity: 0.7; transform: scale(0.6); }
  100% { opacity: 0; transform: scale(1.35); }
}
@keyframes celebrate-rise {
  from { opacity: 0; transform: translateY(8px) scale(0.9); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .celebrate-card,
  .celebrate-flame,
  .celebrate-number {
    animation: none;
  }
  .celebrate-ring {
    display: none;
  }
}
</style>
