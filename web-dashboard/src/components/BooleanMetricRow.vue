<script setup lang="ts">
import MetricIcon from './MetricIcon.vue'
import type { Metric } from '../lib/types'

// Порт блока `m.type === "boolean"` из renderDay(): чекбокс + подпись, сохраняется сразу.
defineProps<{ metric: Metric; checked: boolean; remaining?: boolean }>()
const emit = defineEmits<{ toggle: [boolean] }>()
</script>

<template>
  <label class="row" :class="{ 'metric-remaining': remaining }" :data-metric-id="metric.id">
    <input type="checkbox" :checked="checked" @change="emit('toggle', ($event.target as HTMLInputElement).checked)" />
    <span><MetricIcon :icon="metric.icon" /> {{ metric.name }}</span>
  </label>
</template>

<style scoped>
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; cursor: pointer; }
.metric-remaining { position: relative; padding-left: 10px; }
.metric-remaining::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 3px;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.55;
}
</style>
