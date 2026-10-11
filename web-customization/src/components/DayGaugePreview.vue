<script setup lang="ts">
import { daySegments, dayTicks, DAY_GLOW_FILTER, DAY_GRADIENT_STOPS } from '../lib/dayGauge'
// Мини-картинка «как это выглядит» для предметов «Спидометр прогресса дня» (BACKLOG 53.2 срез 2): кольцо на примере дня, заполненного на 62 %.
// Только превью, настоящие кольца рисуют шапка и Дашборд.
defineProps<{ variant: 'dashed' | 'glow' | 'ticks' | 'gradient' }>()
const segs = daySegments(28, 28, 22, 0.62, 0)
const C = 2 * Math.PI * 22
const ticks = dayTicks(28, 28, 22, 0.62, 4)
</script>

<template>
  <svg v-if="variant === 'dashed'" viewBox="0 0 56 56" width="56" height="56" fill="none" aria-hidden="true" style="transform: rotate(-90deg)">
    <g v-for="(s, i) in segs" :key="i">
      <path :d="s.d" stroke="var(--border)" stroke-width="4" />
      <path v-if="s.base" :d="s.d" stroke="var(--accent)" stroke-width="4" />
    </g>
  </svg>
  <svg v-else-if="variant === 'ticks'" viewBox="0 0 56 56" width="56" height="56" fill="none" stroke-linecap="round" aria-hidden="true" style="transform: rotate(-90deg)">
    <circle cx="28" cy="28" r="22" stroke="var(--border)" stroke-width="2" />
    <circle cx="28" cy="28" r="22" stroke="var(--accent)" stroke-width="3" :stroke-dasharray="`${C * 0.62} ${C}`" />
    <line v-for="(tk, i) in ticks" :key="i" :x1="tk.x1" :y1="tk.y1" :x2="tk.x2" :y2="tk.y2" :stroke="tk.lit ? 'var(--accent)' : 'var(--border)'" stroke-width="1.8" />
  </svg>
  <svg v-else-if="variant === 'gradient'" viewBox="0 0 56 56" width="56" height="56" fill="none" stroke-linecap="round" aria-hidden="true" style="transform: rotate(-90deg)">
    <defs><linearGradient id="day-grad-prev" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" :stop-color="DAY_GRADIENT_STOPS[0]" /><stop offset="100%" :stop-color="DAY_GRADIENT_STOPS[1]" /></linearGradient></defs>
    <circle cx="28" cy="28" r="22" stroke="var(--border)" stroke-width="4" />
    <circle cx="28" cy="28" r="22" stroke="url(#day-grad-prev)" stroke-width="4" :stroke-dasharray="`${C * 0.62} ${C}`" />
  </svg>
  <svg v-else viewBox="0 0 56 56" width="56" height="56" fill="none" stroke-linecap="round" aria-hidden="true" style="transform: rotate(-90deg)">
    <circle cx="28" cy="28" r="22" stroke="var(--border)" stroke-width="4" />
    <circle cx="28" cy="28" r="22" stroke="var(--accent)" stroke-width="4" :stroke-dasharray="`${C * 0.62} ${C}`" :style="{ filter: DAY_GLOW_FILTER }" />
  </svg>
</template>
