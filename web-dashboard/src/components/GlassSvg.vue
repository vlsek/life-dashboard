<script setup lang="ts">
import { computed } from 'vue'
import { glassLevel, waterPct } from '../lib/water'
import { GLASS_SHAPES, glassLevelY } from '../lib/waterGlass'
import { waterGlassStyle } from '../lib/useWaterGlass'

// Рисунок стакана воды выбранного вида (BACKLOG 57.2): «стакан» по умолчанию или платная «кружка / бутылка / колба / бокал» из «Кастомизации».
// Один компонент на все места, где рисуется стакан (значок в шапке, плитка воды, бейдж). Копия есть в соседнем пилоте (менять вместе: классы блика передаёт родитель).
const props = defineProps<{ todayMl: number; normMl: number; width: number; height: number; fullClass: string; sheenClass: string; baseClass?: string }>()

let uid = 0
const gid = `dash-glass-${++uid}-${Math.random().toString(36).slice(2, 7)}`
const shape = computed(() => GLASS_SHAPES[waterGlassStyle.value])
const pct = computed(() => waterPct(props.todayMl, props.normMl))
const full = computed(() => pct.value >= 1)
const levelY = computed(() => glassLevelY(waterGlassStyle.value, pct.value))
const wave = computed(() => glassLevel(pct.value).waveAmp)
</script>

<template>
  <svg :class="[baseClass, { [fullClass]: full }]" :data-full="full ? '1' : '0'" :data-glass="waterGlassStyle" :width="width" :height="height" viewBox="0 0 24 30" style="display: block" aria-hidden="true" data-test="water-glass">
    <defs>
      <linearGradient :id="`${gid}-grad`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color: var(--water-top)" />
        <stop offset="1" style="stop-color: var(--water-bottom)" />
      </linearGradient>
      <clipPath :id="`${gid}-clip`"><path :d="shape.body" /></clipPath>
    </defs>
    <g :clip-path="`url(#${gid}-clip)`">
      <rect x="0" y="0" width="24" height="30" style="fill: var(--text-dim, #999); fill-opacity: 0.07" />
      <path v-if="pct > 0" :d="`M0 ${levelY.toFixed(1)} q3 ${-wave} 6 0 t6 0 t6 0 t6 0 V30 H0 Z`" :fill="`url(#${gid}-grad)`" />
      <!-- 100% (BACKLOG 2.1): по воде проходит мягкий блик; анимация — в CSS страницы -->
      <path v-if="full" :class="sheenClass" d="M-5 30L-1 0H3L-1 30Z" data-test="glass-sheen" />
    </g>
    <path :d="shape.body" fill="none" :style="full ? 'stroke:var(--water-gold)' : 'stroke:var(--text-dim, #999)'" stroke-width="1.6" stroke-linejoin="round" data-test="glass-outline" />
    <path v-for="(l, i) in shape.lines" :key="i" data-test="glass-line" :d="l" fill="none" :style="full ? 'stroke:var(--water-gold)' : 'stroke:var(--text-dim, #999)'" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
    <path :d="shape.shine" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1.2" stroke-linecap="round" fill="none" />
  </svg>
</template>
