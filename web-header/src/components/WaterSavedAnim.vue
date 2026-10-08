<script setup lang="ts">
// «Выпитое записалось» (BACKLOG 11; BACKLOG 44.21 — современная анимация, ответ владельца 2026-10-07: старая «как из 2000-х»): в стакане поднимается
// живая вода (бегущая волна, пузырьки), в углу всплывает бейдж с галочкой. Запускается родителем через смену `tick` (после подтверждённой
// записи в БД), сама гаснет через ~1.4 с. Три варианта (lib/waterAnim.ts, выбор — «Настройки» шапки): wave — спокойный, по умолчанию; drops —
// капли падают в стакан; ripple — быстрый подъём и круги по воде. При prefers-reduced-motion и «Отключить анимации» — сразу итог без движения.
import { ref, watch } from 'vue'
import { getWaterAnim, type WaterAnim } from '../lib/waterAnim'

const props = defineProps<{ tick: number }>()
const visible = ref(false)
const variant = ref<WaterAnim>(getWaterAnim())
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.tick,
  (v, old) => {
    if (v === old || v <= 0) return
    visible.value = false // перезапуск анимации при быстрых повторных нажатиях
    variant.value = getWaterAnim() // выбор из «Настроек» действует сразу, без перезагрузки
    requestAnimationFrame(() => {
      visible.value = true
      clearTimeout(timer)
      timer = setTimeout(() => (visible.value = false), 1400)
    })
  },
)

// свои id маски/градиента у каждого экземпляра: анимация есть и в окне воды, и в правой панели
let uid = 0
const sid = `water-saved-${++uid}-${Math.random().toString(36).slice(2, 7)}`
const GLASS = 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z'
const WAVE = 'q3 -1.6 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0'
const WAVE_BACK = 'q3 1.4 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0'
</script>

<template>
  <Transition name="water-saved">
    <div v-if="visible" class="water-saved pointer-events-none" :data-variant="variant" data-test="water-saved" role="status" aria-live="polite">
      <svg width="72" height="90" viewBox="0 0 24 30" aria-hidden="true">
        <defs>
          <clipPath :id="`${sid}-clip`"><path :d="GLASS" /></clipPath>
          <linearGradient :id="`${sid}-grad`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style="stop-color: var(--water-top)" />
            <stop offset="1" style="stop-color: var(--water-bottom)" />
          </linearGradient>
        </defs>
        <g :clip-path="`url(#${sid}-clip)`">
          <rect x="0" y="0" width="24" height="30" style="fill: var(--water-bottom); fill-opacity: 0.08" />
          <g class="water-saved-fill">
            <path class="ws-wave-back" :d="`M-12 11.2 ${WAVE_BACK} V34 H-12 Z`" :fill="`url(#${sid}-grad)`" />
            <path class="ws-wave" :d="`M-12 10.5 ${WAVE} V34 H-12 Z`" :fill="`url(#${sid}-grad)`" />
            <circle class="ws-bubble ws-b-1" cx="9" cy="23.5" r="0.7" fill="#fff" fill-opacity="0.6" />
            <circle class="ws-bubble ws-b-2" cx="13.4" cy="24.5" r="0.5" fill="#fff" fill-opacity="0.6" />
            <circle class="ws-bubble ws-b-3" cx="15.8" cy="23" r="0.8" fill="#fff" fill-opacity="0.6" />
          </g>
        </g>
        <ellipse class="ws-ripple" cx="12" cy="10.8" rx="5.5" ry="1.1" fill="none" style="stroke: var(--water-line)" stroke-width="0.5" />
        <ellipse class="ws-ripple ws-ripple-2" cx="12" cy="10.8" rx="5.5" ry="1.1" fill="none" style="stroke: var(--water-line)" stroke-width="0.4" />
        <path class="ws-drop ws-d-1" d="M9.4 -2.2q-1.1 1.7 0 2.7q1.1 -1 0 -2.7z" style="fill: var(--water-top)" />
        <path class="ws-drop ws-d-2" d="M12.6 -3.4q-1.3 2 0 3.2q1.3 -1.2 0 -3.2z" style="fill: var(--water-top)" />
        <path class="ws-drop ws-d-3" d="M15.4 -1.8q-1 1.5 0 2.4q1 -0.9 0 -2.4z" style="fill: var(--water-top)" />
        <path :d="GLASS" fill="none" style="stroke: var(--water-line)" stroke-width="1.2" stroke-linejoin="round" />
        <ellipse cx="12" cy="5.3" rx="7.4" ry="1.2" fill="none" style="stroke: var(--water-line)" stroke-width="0.9" />
        <path d="M7.6 9l0.8 11" stroke="#ffffff" stroke-opacity="0.28" stroke-width="1" stroke-linecap="round" />
        <g class="water-saved-badge">
          <circle cx="19.8" cy="5.4" r="3.5" style="fill: var(--water-bottom)" stroke="#fff" stroke-width="0.7" />
          <path class="water-saved-check" d="M18 5.5l1.3 1.4 2.3-2.8" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </svg>
    </div>
  </Transition>
</template>
