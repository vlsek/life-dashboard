<script setup lang="ts">
import MetricIcon from './MetricIcon.vue'
import type { Metric } from '../lib/types'

// Порт блока `m.type === "multiselect"` из renderDay(): подпись + кнопки-«пилюли» вариантов,
// каждый клик сразу переключает вариант и сохраняется.
const props = defineProps<{ metric: Metric; selected: string[]; remaining?: boolean }>()
const emit = defineEmits<{ toggle: [string] }>()

const opts = () => (Array.isArray(props.metric.options) ? props.metric.options : [])
</script>

<template>
  <div class="wrap" :class="{ 'metric-remaining': remaining }" :data-metric-id="metric.id">
    <div class="dim label"><MetricIcon :icon="metric.icon" /> {{ metric.name }}:</div>
    <button
      v-for="opt in opts()"
      :key="opt.key"
      type="button"
      class="pill"
      :class="{ selected: selected.includes(opt.key) }"
      @click="emit('toggle', opt.key)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.wrap { margin-bottom: 14px; }
.label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
button.pill {
  margin: 0 6px 6px 0;
  border-radius: 20px;
  padding: 6px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-dim);
}
button.pill.selected {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}
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
