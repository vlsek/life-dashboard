<script setup lang="ts">
// «Выпитое записалось» (BACKLOG 11): стакан быстро наполняется водой, поверх рисуется галочка. Запускается родителем
// через смену `tick` (после подтверждённой записи в БД). Сама гаснет через ~1.4 с. При prefers-reduced-motion —
// без движения: сразу полный стакан с галочкой и просто исчезает.
import { ref, watch } from 'vue'

const props = defineProps<{ tick: number }>()
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.tick,
  (v, old) => {
    if (v === old || v <= 0) return
    visible.value = false // перезапуск анимации при быстрых повторных нажатиях
    requestAnimationFrame(() => {
      visible.value = true
      clearTimeout(timer)
      timer = setTimeout(() => (visible.value = false), 1400)
    })
  },
)

const GLASS = 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z'
</script>

<template>
  <Transition name="water-saved">
    <div v-if="visible" class="water-saved pointer-events-none" data-test="water-saved" role="status" aria-live="polite">
      <svg width="72" height="90" viewBox="0 0 24 30" aria-hidden="true">
        <defs><clipPath id="water-saved-clip"><path :d="GLASS" /></clipPath></defs>
        <g clip-path="url(#water-saved-clip)">
          <rect class="water-saved-fill" x="0" y="0" width="24" height="30" style="fill: var(--accent); fill-opacity: 0.85" />
        </g>
        <path :d="GLASS" fill="none" style="stroke: var(--accent)" stroke-width="1.2" stroke-linejoin="round" />
        <path class="water-saved-check" d="M7.6 16.2l3.2 3.4 5.8-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  </Transition>
</template>

<style scoped>
.water-saved {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
.water-saved svg {
  filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.25));
  background: var(--bg-card);
  border-radius: 16px;
  padding: 10px 14px;
  box-sizing: content-box;
}
.water-saved-fill {
  transform-origin: 50% 100%;
  animation: water-saved-rise 0.7s ease-out forwards;
}
.water-saved-check {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: water-saved-draw 0.4s ease-out 0.55s forwards;
}
.water-saved-enter-active,
.water-saved-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.water-saved-enter-from,
.water-saved-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
@keyframes water-saved-rise {
  from { transform: translateY(100%); }
  to { transform: translateY(12%); }
}
@keyframes water-saved-draw {
  to { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .water-saved-fill { animation: none; transform: translateY(12%); }
  .water-saved-check { animation: none; stroke-dashoffset: 0; }
  .water-saved-enter-active, .water-saved-leave-active { transition: opacity 0.2s ease; }
  .water-saved-enter-from, .water-saved-leave-to { transform: none; }
}
</style>
