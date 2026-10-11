<script setup lang="ts">
import GlassSvg from './GlassSvg.vue'

// Значок стакана в шапке (копия SVG из WaterSection.vue Дашборда). Без метрики воды не рисуется вообще (родитель).
defineProps<{ todayMl: number; normMl: number; title: string; scale?: number; plain?: boolean }>()
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" :class="plain ? 'gh-plain' : 'gh-badge'" data-test="water-badge" :title="title" :aria-label="title" @click="emit('click')">
    <GlassSvg :today-ml="todayMl" :norm-ml="normMl" :width="24 * (scale ?? 1)" :height="30 * (scale ?? 1)" full-class="gh-glass-full" sheen-class="gh-glass-sheen" />
  </button>
</template>
