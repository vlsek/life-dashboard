<script setup lang="ts">
// «+N / −N с монетой» для страниц, кроме Дашборда (BACKLOG 469, агент 2): копия слоя Дашборда на классах `gh-*` из header.css
// (Tailwind в шапке нет). Слушает событие `dashboard:points-float` (lib/pointsFloat.ts → emitPointsFloat). Монтируется только
// когда НЕ panelOnly. prefers-reduced-motion — без полёта; `<html data-motion="off">` — не показывается совсем (motionMode()).
import { t } from '../lib/i18n'
import { usePointsFloat } from '../lib/usePointsFloat'
import CoinIcon from './CoinIcon.vue'

const { items } = usePointsFloat()
</script>

<template>
  <div class="gh-pf-layer" data-test="points-float-layer">
    <span
      v-for="it in items"
      :key="it.id"
      class="gh-pf"
      :class="[it.delta > 0 ? 'gh-pf--gain' : 'gh-pf--loss', it.mode === 'reduced' ? 'gh-pf--still' : '']"
      :style="{ left: it.x + 'px', top: it.y + 'px' }"
      data-test="points-float"
    >
      <span data-test="points-float-text">{{ it.text }}</span>
      <CoinIcon />
    </span>
    <span class="gh-sr-only" role="status" aria-live="polite" data-test="points-float-sr">
      <template v-if="items.length">{{ t('dash_points_float_label') }} {{ items[items.length - 1].text }}</template>
    </span>
  </div>
</template>
