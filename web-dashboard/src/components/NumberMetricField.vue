<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import RecordBadge from './RecordBadge.vue'
import type { RecordInfo } from '../lib/records'
import MetricStreakBadge from './MetricStreakBadge.vue'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import MetricIcon from './MetricIcon.vue'
import { t } from '../lib/i18n'
import type { Metric } from '../lib/types'

// Порт блока `m.type === "number"` из renderDay() в dashboard.js. Два режима ввода:
//  • "заменять" (по умолчанию): поле хранит значение дня, сохраняется при уходе с поля;
//  • "прибавлять" (input_mode === "add"): вводится дельта, она прибавляется к итогу; рядом —
//    «Итого сегодня» и карандаш для прямой правки итога (если опечатался при прибавлении).
const props = defineProps<{
  metric: Metric
  value: number | undefined
  remaining?: boolean
  flashed?: boolean
  streak?: MetricStreakInfo | null
  record?: RecordInfo | null // рекорд метрики за всё время (BACKLOG раздел 28)
}>()
const emit = defineEmits<{ set: [string]; add: [string]; fix: [string] }>()

const isAddMode = props.metric.input_mode === 'add'
const text = ref(isAddMode ? '' : props.value === undefined ? '' : String(props.value))

// Значение могло измениться снаружи (другой день, перезагрузка) — синхронизируем поле "заменять"
watch(
  () => props.value,
  (v) => {
    if (!isAddMode) text.value = v === undefined ? '' : String(v)
  },
)

function commit() {
  if (isAddMode) {
    const raw = text.value
    text.value = '' // очищаем сразу — поле готово к следующему прибавлению
    emit('add', raw)
  } else {
    emit('set', text.value)
  }
}

function fixTotal() {
  const raw = window.prompt(t('dash_metric_fix_total_prompt'), String(props.value ?? 0))
  if (raw !== null) emit('fix', raw)
}
</script>

<template>
  <div class="field" :class="{ 'metric-remaining': remaining }" :data-metric-id="metric.id">
    <div class="label-row">
      <span class="dim label"><MetricIcon :icon="metric.icon" /> {{ metric.name }}{{ metric.unit ? ` (${metric.unit})` : '' }}</span>
      <MetricStreakBadge v-if="streak" :info="streak" />
    </div>

    <div v-if="isAddMode" class="total-row">
      <span class="total">{{ t('dash_metric_current_total') }} {{ value ?? 0 }}</span>
      <button type="button" class="secondary fix-btn" :title="t('dash_metric_fix_total_title')" @click="fixTotal">
        <Icon name="edit" />
      </button>
    </div>
    <div v-else class="spacer"></div>

    <div v-if="isAddMode" class="input-row">
      <input v-model="text" type="number" step="any" :placeholder="t('dash_metric_add_placeholder')" :class="{ 'saved-flash': flashed }" @change="commit" @keydown.enter.prevent="commit" />
      <button type="button" class="add-btn" :title="t('dash_metric_add_btn_title')" @click="commit">+</button>
    </div>
    <input v-else v-model="text" type="number" step="any" placeholder="0" :class="{ 'saved-flash': flashed }" @change="commit" />
    <RecordBadge v-if="record" :record="record" :unit="metric.unit ? ' ' + metric.unit : ''" class="mt-0.5" />
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 4px; }
.label-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.label { font-size: 0.85em; }
.total-row { display: flex; align-items: center; gap: 4px; height: 22px; }
.total { font-size: 0.85em; font-weight: bold; white-space: nowrap; }
/* невидимый выравниватель высоты, чтобы поля в сетке были на одном уровне */
.spacer { height: 22px; }
.fix-btn { padding: 1px 6px; font-size: 0.75em; min-height: 0; line-height: 1.4; flex-shrink: 0; }
.input-row { display: flex; gap: 6px; }
.input-row input { flex: 1; min-width: 0; }
.add-btn { padding: 0 12px; min-height: 0; flex-shrink: 0; }
input[type='number'] {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.95em;
  transition: border-color 0.3s ease;
}
input.saved-flash { border-color: var(--success) !important; }
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
