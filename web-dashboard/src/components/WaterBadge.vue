<script setup lang="ts">
import { computed } from 'vue'
import { waterPct, glassLevel } from '../lib/water'
import { getLang } from '../lib/i18n'

// Портировано из renderWaterBadge() в dashboard.js — тот же SVG-стакан (округлый контур,
// заливка волной по проценту от нормы), но как реактивный компонент вместо ручного innerHTML.
const props = defineProps<{ currentMl: number; normMl: number }>()
const emit = defineEmits<{ click: [] }>()

const pct = computed(() => waterPct(props.currentMl, props.normMl))
const full = computed(() => pct.value >= 1)
const level = computed(() => glassLevel(pct.value))
const unitLabel = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
const GLASS_OUTLINE = 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z'
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold"
    style="background: transparent; color: var(--text); border-color: var(--border)"
    :title="`💧 ${currentMl} / ${normMl} ${unitLabel}`"
    @click="emit('click')"
  >
    <svg class="water-glass" :class="{ 'water-glass-full': full }" width="20" height="25" viewBox="0 0 24 30" aria-hidden="true" data-test="water-glass">
      <defs>
        <linearGradient :id="'water-grad'" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--water-top)" />
          <stop offset="1" style="stop-color: var(--water-bottom)" />
        </linearGradient>
        <clipPath :id="'water-glass-clip'"><path :d="GLASS_OUTLINE" /></clipPath>
      </defs>
      <g clip-path="url(#water-glass-clip)">
        <rect x="0" y="0" width="24" height="30" style="fill: var(--text-dim); fill-opacity: 0.07" />
        <path
          v-if="pct > 0"
          :d="`M0 ${level.levelY.toFixed(1)} q3 ${-level.waveAmp} 6 0 t6 0 t6 0 t6 0 V30 H0 Z`"
          fill="url(#water-grad)"
        />
        <!-- 100% (BACKLOG 2.1): по воде проходит мягкий блик; анимация — в style.css (.glass-sheen) -->
        <path v-if="full" class="glass-sheen" d="M-5 30L-1 0H3L-1 30Z" data-test="glass-sheen" />
      </g>
      <path :d="GLASS_OUTLINE" fill="none" :style="full ? 'stroke: var(--water-gold)' : 'stroke: var(--text-dim)'" stroke-width="1.6" stroke-linejoin="round" data-test="glass-outline" />
      <ellipse cx="12" cy="5.3" rx="7.4" ry="1.25" fill="none" :style="full ? 'stroke: var(--water-gold)' : 'stroke: var(--text-dim)'" stroke-width="1.4" />
      <path d="M7.6 8.5l0.9 12.5" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1.2" stroke-linecap="round" />
    </svg>
    {{ currentMl }} / {{ normMl }} {{ unitLabel }}
  </button>
</template>
