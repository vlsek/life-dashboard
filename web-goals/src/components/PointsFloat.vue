<script setup lang="ts">
// «+N / −N с монетой» (BACKLOG 14, 11:11): при отметке выполненного подпись появляется у места клика, плавно уплывает вверх
// и растворяется; при снятии отметки — то же самое, но «−N». Монтируется один раз в App.vue; сама ничего не знает про
// метрики — слушает событие POINTS_FLOAT (lib/pointsFloat.ts → emitPointsFloat). prefers-reduced-motion — без полёта,
// только проявление/угасание на месте; `<html data-motion="off">` — не показывается совсем (см. motionMode()).
import { t } from '../lib/i18n'
import { usePointsFloat } from '../lib/usePointsFloat'
import CoinIcon from './CoinIcon.vue'

const { items } = usePointsFloat()
</script>

<template>
  <div class="points-float-layer" data-test="points-float-layer">
    <span
      v-for="it in items"
      :key="it.id"
      class="points-float"
      :class="[it.delta > 0 ? 'points-float--gain' : 'points-float--loss', it.mode === 'reduced' ? 'points-float--still' : '']"
      :style="{ left: it.x + 'px', top: it.y + 'px' }"
      data-test="points-float"
    >
      <span class="points-float-num" data-test="points-float-text">{{ it.text }}</span>
      <CoinIcon />
    </span>
    <!-- Скринридеру — короткое объявление; видимая подпись декоративна и живёт меньше двух секунд -->
    <span class="sr-only" role="status" aria-live="polite" data-test="points-float-sr">
      <template v-if="items.length">{{ t('dash_points_float_label') }} {{ items[items.length - 1].text }}</template>
    </span>
  </div>
</template>

<style scoped>
.points-float-layer {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none; /* не перехватывает клики, даже пока подпись летит над кнопками */
  overflow: hidden;
}
.points-float {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  color: var(--accent);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -100%);
  animation: points-float-rise 1.7s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  will-change: transform, opacity;
}
.points-float--loss {
  color: var(--danger);
}
.points-float--still {
  animation: points-float-fade 1.2s ease-out forwards;
}

/* Появляется с лёгким «хлопком», затем плавно плывёт вверх и растворяется */
@keyframes points-float-rise {
  0% { opacity: 0; transform: translate(-50%, -100%) scale(0.6); }
  14% { opacity: 1; transform: translate(-50%, calc(-100% - 8px)) scale(1.15); }
  30% { opacity: 1; transform: translate(-50%, calc(-100% - 20px)) scale(1); }
  100% { opacity: 0; transform: translate(-50%, calc(-100% - 78px)) scale(1); }
}
@keyframes points-float-fade {
  0% { opacity: 0; }
  20% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .points-float { animation: points-float-fade 1.2s ease-out forwards; }
}
</style>
