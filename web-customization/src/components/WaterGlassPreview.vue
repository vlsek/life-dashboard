<script setup lang="ts">
import { GLASS_SHAPES, glassLevelY, type WaterGlassStyle } from '../lib/waterGlass'
// Мини-картинка предмета «Вид стакана воды» (BACKLOG 57.2б): форма наполнена на 40 %. Только превью — настоящий стакан рисуют шапка и Дашборд (GlassSvg).
const props = defineProps<{ styleKey: WaterGlassStyle }>()
const shape = GLASS_SHAPES[props.styleKey]
const levelY = glassLevelY(props.styleKey, 0.4)
const gid = `cust-glass-${props.styleKey}`
</script>

<template>
  <svg viewBox="0 0 24 30" width="48" height="60" aria-hidden="true" :data-glass="styleKey">
    <defs>
      <linearGradient :id="`${gid}-g`" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4f0" /><stop offset="1" stop-color="#2f80d0" /></linearGradient>
      <clipPath :id="`${gid}-c`"><path :d="shape.body" /></clipPath>
    </defs>
    <g :clip-path="`url(#${gid}-c)`">
      <rect x="0" y="0" width="24" height="30" fill="currentColor" fill-opacity="0.07" />
      <path :d="`M0 ${levelY.toFixed(1)} q3 -1 6 0 t6 0 t6 0 t6 0 V30 H0 Z`" :fill="`url(#${gid}-g)`" />
    </g>
    <path :d="shape.body" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.6" stroke-linejoin="round" />
    <path v-for="(l, i) in shape.lines" :key="i" :d="l" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
    <path :d="shape.shine" stroke="#fff" stroke-opacity="0.35" stroke-width="1.2" stroke-linecap="round" fill="none" />
  </svg>
</template>
