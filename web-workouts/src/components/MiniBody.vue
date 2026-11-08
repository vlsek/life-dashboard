<script setup lang="ts">
import { computed } from 'vue'
import { bodyGeometry, type BodyModel } from '../lib/bodyModel'

// Мини-силуэт для главной (BACKLOG 69.17, срез 4, макет v2): спереди и сзади, подсвечены переданные группы мышц.
// Только показ: те же контуры и модель тела, что на «Карте мышц», без подходов, подписей и нажатий.
const props = withDefaults(defineProps<{ highlight: string[]; model?: BodyModel }>(), { model: 'male' })
const geo = computed(() => bodyGeometry(props.model))
const lit = computed(() => new Set(props.highlight))
const fill = (muscle: string) => (lit.value.has(muscle) ? 'var(--accent)' : 'var(--border)')
const BACK_SHIFT = 110 // вид сзади правее вида спереди
</script>

<template>
  <svg viewBox="0 0 210 190" width="72" height="65" role="img" :aria-label="highlight.join(', ')" data-testid="mini-body" focusable="false">
    <g data-view="front">
      <path :d="geo.outline" fill="none" stroke="var(--text-dim)" stroke-width="1.2" />
      <circle :cx="geo.head.cx" :cy="geo.head.cy" :r="geo.head.r" fill="none" stroke="var(--text-dim)" stroke-width="1.2" />
      <path v-for="(s, i) in geo.front" :key="'f' + i" :d="String(s.attrs.d)" :fill="fill(s.muscle)" :data-muscle="s.muscle" :data-lit="lit.has(s.muscle) ? '1' : '0'" fill-opacity="0.9" />
    </g>
    <g data-view="back" :transform="`translate(${BACK_SHIFT} 0)`">
      <path :d="geo.outline" fill="none" stroke="var(--text-dim)" stroke-width="1.2" />
      <circle :cx="geo.head.cx" :cy="geo.head.cy" :r="geo.head.r" fill="none" stroke="var(--text-dim)" stroke-width="1.2" />
      <path v-for="(s, i) in geo.back" :key="'b' + i" :d="String(s.attrs.d)" :fill="fill(s.muscle)" :data-muscle="s.muscle" :data-lit="lit.has(s.muscle) ? '1' : '0'" fill-opacity="0.9" />
    </g>
  </svg>
</template>
