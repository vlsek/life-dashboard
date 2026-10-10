<script setup lang="ts">
import { daySegments, DAY_GLOW_FILTER } from '../lib/dayGauge'
// Мини-картинка «как это выглядит» для предметов «Спидометр прогресса дня» (BACKLOG 53.2 срез 2): кольцо на примере дня, заполненного на 62 %.
// Только превью, настоящие кольца рисуют шапка и Дашборд.
defineProps<{ variant: 'dashed' | 'glow' }>()
const segs = daySegments(28, 28, 22, 0.62, 0)
const C = 2 * Math.PI * 22
</script>

<template>
  <svg v-if="variant === 'dashed'" viewBox="0 0 56 56" width="56" height="56" fill="none" stroke-linecap="round" aria-hidden="true" style="transform: rotate(-90deg)">
    <g v-for="(s, i) in segs" :key="i">
      <path :d="s.d" stroke="var(--border)" stroke-width="4" />
      <path v-if="s.base" :d="s.d" stroke="var(--accent)" stroke-width="4" />
    </g>
  </svg>
  <svg v-else viewBox="0 0 56 56" width="56" height="56" fill="none" stroke-linecap="round" aria-hidden="true" style="transform: rotate(-90deg)">
    <circle cx="28" cy="28" r="22" stroke="var(--border)" stroke-width="4" />
    <circle cx="28" cy="28" r="22" stroke="var(--accent)" stroke-width="4" :stroke-dasharray="`${C * 0.62} ${C}`" :style="{ filter: DAY_GLOW_FILTER }" />
  </svg>
</template>
