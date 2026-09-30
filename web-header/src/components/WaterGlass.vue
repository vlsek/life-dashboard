<script setup lang="ts">
import { computed } from 'vue'
import { glassLevel, waterPct } from '../lib/water'

// Значок стакана в шапке (копия SVG из WaterSection.vue Дашборда). Без метрики воды не рисуется вообще (родитель).
const props = defineProps<{ todayMl: number; normMl: number; title: string }>()
const emit = defineEmits<{ click: [] }>()

const GLASS = 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z'
const pct = computed(() => waterPct(props.todayMl, props.normMl))
const full = computed(() => pct.value >= 1)
const level = computed(() => glassLevel(pct.value))
</script>

<template>
  <button type="button" class="gh-badge" data-test="water-badge" :title="title" :aria-label="title" @click="emit('click')">
    <svg width="24" height="30" viewBox="0 0 24 30" style="display: block" aria-hidden="true">
      <defs>
        <linearGradient id="gh-water-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--water-top)" />
          <stop offset="1" style="stop-color: var(--water-bottom)" />
        </linearGradient>
        <clipPath id="gh-water-clip"><path :d="GLASS" /></clipPath>
      </defs>
      <g clip-path="url(#gh-water-clip)">
        <rect x="0" y="0" width="24" height="30" style="fill: var(--text-dim, #999); fill-opacity: 0.07" />
        <path v-if="pct > 0" :d="`M0 ${level.levelY.toFixed(1)} q3 ${-level.waveAmp} 6 0 t6 0 t6 0 t6 0 V30 H0 Z`" fill="url(#gh-water-grad)" />
      </g>
      <path :d="GLASS" fill="none" :style="full ? 'stroke:var(--water-line)' : 'stroke:var(--text-dim, #999)'" stroke-width="1.6" stroke-linejoin="round" />
      <ellipse cx="12" cy="5.3" rx="7.4" ry="1.25" fill="none" :style="full ? 'stroke:var(--water-line)' : 'stroke:var(--text-dim, #999)'" stroke-width="1.4" />
      <path d="M7.6 8.5l0.9 12.5" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1.2" stroke-linecap="round" />
    </svg>
  </button>
</template>
