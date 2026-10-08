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

<style scoped>
.water-saved {
  /* fixed, а не absolute внутри окна: окно воды выше 85vh и прокручивается — абсолютный оверлей оставался наверху прокручиваемой области,
     и при нажатии «+200 / +1000» ниже по окну стакан с анимацией был за пределами видимого (BACKLOG раздел 30, 🐞). По центру экрана виден всегда. */
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70; /* выше затемнения окна (.modal-backdrop — 50) */
  pointer-events: none; /* не перехватывает нажатия, пока играет */
}
.water-saved svg {
  overflow: visible;
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.22));
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--water-line) 38%, transparent);
  border-radius: 22px;
  padding: 14px 18px;
  box-sizing: content-box;
}
/* БАЗОВЫЕ стили — это ИТОГОВОЕ состояние (вода на месте, бейдж виден): анимации только вводят его, поэтому при «Отключить анимации»
   (там animation: none !important) и prefers-reduced-motion человек видит готовую картинку. Пузырьки, капли и круги без анимации скрыты. */
.water-saved-fill {
  transform-origin: 50% 100%;
  animation: water-saved-rise 0.85s cubic-bezier(0.2, 0.9, 0.25, 1.04) both;
}
.ws-wave { animation: water-saved-drift 1.7s linear infinite; }
.ws-wave-back { opacity: 0.5; animation: water-saved-drift-back 2.3s linear infinite; }
.ws-bubble { opacity: 0; animation: water-saved-bubble 0.95s ease-out both; }
.ws-b-1 { animation-delay: 0.3s; }
.ws-b-2 { animation-delay: 0.45s; }
.ws-b-3 { animation-delay: 0.6s; }
.ws-ripple { opacity: 0; transform-box: fill-box; transform-origin: center; animation: water-saved-ripple 1s ease-out 0.55s both; }
.ws-ripple-2 { animation-delay: 0.75s; }
.ws-drop { opacity: 0; animation: water-saved-drop 0.5s ease-in both; }
.ws-d-1 { animation-delay: 0.05s; }
.ws-d-2 { animation-delay: 0.12s; }
.ws-d-3 { animation-delay: 0.19s; }
.water-saved-badge { transform-box: fill-box; transform-origin: center; animation: water-saved-pop 0.38s cubic-bezier(0.3, 1.6, 0.5, 1) 0.7s both; }
.water-saved-check {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: water-saved-draw 0.35s ease-out 0.85s forwards;
}
/* Варианты (выбор — lib/waterAnim.ts): wave — по умолчанию; в нём капель и второго круга нет */
.water-saved[data-variant='wave'] .ws-drop, .water-saved[data-variant='wave'] .ws-ripple-2 { display: none; }
/* drops: капли падают в стакан, вода поднимается следом */
.water-saved[data-variant='drops'] .ws-bubble, .water-saved[data-variant='drops'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='drops'] .water-saved-fill { animation-delay: 0.35s; animation-duration: 0.55s; }
.water-saved[data-variant='drops'] .ws-ripple { animation-delay: 0.75s; }
.water-saved[data-variant='drops'] .water-saved-badge { animation-delay: 0.85s; }
.water-saved[data-variant='drops'] .water-saved-check { animation-delay: 1s; }
/* ripple: быстрый подъём и два круга по воде */
.water-saved[data-variant='ripple'] .ws-bubble, .water-saved[data-variant='ripple'] .ws-drop { display: none; }
.water-saved[data-variant='ripple'] .water-saved-fill { animation-duration: 0.45s; }
.water-saved[data-variant='ripple'] .ws-ripple { animation-delay: 0.3s; }
.water-saved[data-variant='ripple'] .ws-ripple-2 { animation-delay: 0.5s; }
.water-saved[data-variant='ripple'] .water-saved-badge { animation-delay: 0.5s; }
.water-saved[data-variant='ripple'] .water-saved-check { animation-delay: 0.65s; }
.water-saved-enter-active,
.water-saved-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.water-saved-enter-from,
.water-saved-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
@keyframes water-saved-rise {
  from { transform: translateY(22px); }
  to { transform: translateY(0); }
}
@keyframes water-saved-drift {
  to { transform: translateX(-12px); }
}
@keyframes water-saved-drift-back {
  from { transform: translateX(-12px); }
  to { transform: translateX(0); }
}
@keyframes water-saved-bubble {
  0% { opacity: 0; transform: translateY(0); }
  25% { opacity: 0.7; }
  100% { opacity: 0; transform: translateY(-10px); }
}
@keyframes water-saved-ripple {
  0% { opacity: 0.75; transform: scale(0.35); }
  100% { opacity: 0; transform: scale(1.7); }
}
@keyframes water-saved-drop {
  0% { opacity: 0; transform: translateY(-2px); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(15px); }
}
@keyframes water-saved-pop {
  from { opacity: 0; transform: scale(0); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes water-saved-draw {
  to { stroke-dashoffset: 0; }
}
/* «Отключить все анимации» (html[data-motion='off']): показываем итог сразу — вода на месте, галочка нарисована */
html[data-motion='off'] .water-saved-fill { transform: none; }
html[data-motion='off'] .water-saved-check { stroke-dashoffset: 0; }
@media (prefers-reduced-motion: reduce) {
  .water-saved-fill, .ws-wave, .ws-wave-back, .water-saved-badge { animation: none; }
  .ws-bubble, .ws-drop, .ws-ripple { display: none; }
  .water-saved-check { animation: none; stroke-dashoffset: 0; }
  .water-saved-enter-active, .water-saved-leave-active { transition: opacity 0.2s ease; }
  .water-saved-enter-from, .water-saved-leave-to { transform: none; }
}
</style>
