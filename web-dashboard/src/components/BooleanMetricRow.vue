<script setup lang="ts">
import { ref, watch } from 'vue'
import MetricIcon from './MetricIcon.vue'
import MetricStreakBadge from './MetricStreakBadge.vue'
import { t } from '../lib/i18n'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import type { Metric } from '../lib/types'

// Порт блока `m.type === "boolean"` из renderDay(): чекбокс + подпись, сохраняется сразу. Если у метрики включено «спрашивать заметку»
// (миграция 058, BACKLOG 867 «Учёба») и она отмечена, под ней появляется необязательное поле «что делал(а)» — сохраняется по Enter или уходу из поля.
const props = defineProps<{ metric: Metric; checked: boolean; remaining?: boolean; streak?: MetricStreakInfo | null; note?: string }>()
const emit = defineEmits<{ toggle: [boolean]; note: [string] }>()

const draft = ref(props.note ?? '')
watch(() => props.note, (n) => (draft.value = n ?? ''))
</script>

<template>
  <div :class="{ 'metric-remaining': remaining }" :data-metric-id="metric.id">
    <label class="row">
      <input type="checkbox" :checked="checked" @change="emit('toggle', ($event.target as HTMLInputElement).checked)" />
      <span><MetricIcon :icon="metric.icon" /> {{ metric.name }}<MetricStreakBadge v-if="streak" :info="streak" /></span>
    </label>
    <input
      v-if="metric.ask_note && checked"
      v-model="draft"
      type="text"
      class="note-field w-full"
      maxlength="500"
      :placeholder="t('dash_note_placeholder')"
      :aria-label="t('dash_note_placeholder')"
      data-test="metric-note"
      @change="emit('note', draft)"
      @keydown.enter="($event.target as HTMLInputElement).blur()"
    />
  </div>
</template>

<style scoped>
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; cursor: pointer; }
.note-field { margin: -4px 0 10px; font-size: 0.9em; }
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
