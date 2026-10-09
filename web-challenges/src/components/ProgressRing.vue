<script setup lang="ts">
import { computed } from 'vue'

// Кольцо прогресса (BACKLOG 44.6, срез 2): процент в центре, дуга цветом акцента. Стили внутри компонента.
const props = withDefaults(defineProps<{ percent: number; size?: number; label?: string }>(), { size: 52, label: '' })
const R = 20
const C = 2 * Math.PI * R
const pct = computed(() => Math.max(0, Math.min(100, Math.round(Number.isFinite(props.percent) ? props.percent : 0))))
const dash = computed(() => `${(C * pct.value) / 100} ${C}`)
</script>

<template>
  <svg class="ring" :width="size" :height="size" viewBox="0 0 48 48" role="img" :aria-label="`${label} ${pct}%`.trim()" data-testid="progress-ring" :data-percent="pct">
    <circle cx="24" cy="24" :r="R" fill="none" stroke="var(--border)" stroke-width="5" />
    <circle class="arc" cx="24" cy="24" :r="R" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" :stroke-dasharray="dash" transform="rotate(-90 24 24)" />
    <text x="24" y="24" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="600" fill="var(--text)">{{ pct }}%</text>
  </svg>
</template>

<style scoped>
.ring {
  flex: none;
}
.arc {
  transition: stroke-dasharray 0.4s ease;
}
@media (prefers-reduced-motion: reduce) {
  .arc {
    transition: none;
  }
}
</style>
