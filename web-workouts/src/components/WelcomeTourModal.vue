<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { t, type DictKey } from '../lib/i18n'

// Порт showWelcomeTour() из config.js: те же 7 шагов, тот же текст, клавиши ←/→/Esc,
// свайп влево/вправо. Здесь — как контролируемая Vue-модалка вместо ручной сборки DOM.
const emit = defineEmits<{ close: [] }>()

const TOUR_STEPS = [
  { icon: '👋', key: 'tour_1' },
  { icon: '🏠', key: 'tour_2' },
  { icon: '🎯', key: 'tour_3' },
  { icon: '🥋', key: 'tour_4' },
  { icon: '🏆', key: 'tour_5' },
  { icon: '🗓️', key: 'tour_6' },
  { icon: '🧭', key: 'tour_7' },
] as const

const step = ref(0)
function isLast(): boolean {
  return step.value === TOUR_STEPS.length - 1
}
function goBack() {
  if (step.value > 0) step.value--
}
function goNext() {
  if (!isLast()) step.value++
  else emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') goNext()
  else if (e.key === 'ArrowLeft') goBack()
  else if (e.key === 'Escape') emit('close')
}

let touchX: number | null = null
let touchY: number | null = null
function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0].clientX
  touchY = e.touches[0].clientY
}
function onTouchEnd(e: TouchEvent) {
  if (touchX === null || touchY === null) return
  const dx = e.changedTouches[0].clientX - touchX
  const dy = e.changedTouches[0].clientY - touchY
  touchX = touchY = null
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (dx < 0) goNext()
  else goBack()
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="emit('close')"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <div class="w-full max-w-md rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <div class="mt-1 text-center text-[2.2em]">{{ TOUR_STEPS[step].icon }}</div>
      <h3 class="my-2 text-center text-lg font-bold">{{ t((TOUR_STEPS[step].key + '_title') as DictKey) }}</h3>
      <p class="whitespace-pre-line text-center text-sm leading-relaxed">{{ t((TOUR_STEPS[step].key + '_text') as DictKey) }}</p>

      <div class="mb-1 mt-3.5 flex justify-center gap-1.5">
        <span
          v-for="(s, i) in TOUR_STEPS"
          :key="s.key"
          class="h-2 w-2 rounded-full"
          :style="{ background: i === step ? 'var(--accent)' : 'var(--border)' }"
        ></span>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          v-if="!isLast()"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-sm"
          style="border-color: var(--border); color: var(--text)"
          @click="emit('close')"
        >
          {{ t('tour_skip') }}
        </button>
        <button
          v-if="step > 0"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-sm"
          style="border-color: var(--border); color: var(--text)"
          @click="goBack"
        >
          {{ t('tour_back') }}
        </button>
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" @click="goNext">
          {{ isLast() ? t('tour_done') : t('tour_next') }}
        </button>
      </div>
    </div>
  </div>
</template>
