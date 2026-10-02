<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import CustomPeriodModal from './CustomPeriodModal.vue'
import { getLang, t } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { PRESETS, PRESET_LABEL_KEYS, canStepForward, classifyPeriod, containsDay, currentPeriod, formatRange, monthLabel, stepPeriod, viewBounds, type PresetKey } from '../lib/periodNav'
import type { PeriodState } from '../lib/chart'

// Выбор периода у графиков (BACKLOG 16, 13:44 «организован плохо»; раздел 18 «современное оформление»). Одна строка коротких скользящих
// пресетов (7Д · 30Д · 90Д · 1Г · Всё) вместо шести длинных кнопок в 2–3 ряда; календарные периоды («Неделя»/«Месяц») листаются стрелками
// в стиле DateStepper (без отдельной «Прошлой недели»); «Свой период» — как раньше, календарём; выбранный период подписан датами.
// Формат хранения не менялся (PeriodState), поэтому периоды, сохранённые раньше (10 дней, эта/прошлая неделя, месяц), продолжают работать.
const props = defineProps<{ state: PeriodState }>()
const emit = defineEmits<{ change: [state: PeriodState] }>()

const showCustom = ref(false)
const today = () => todayStr()
const view = computed(() => classifyPeriod(props.state, today()))
const calendarView = computed(() => (view.value.kind === 'week' || view.value.kind === 'month' ? view.value : null))

const stepLabel = computed(() => {
  const v = calendarView.value
  if (!v) return ''
  if (containsDay(v, today())) return t(v.kind === 'week' ? 'period_this_week' : 'period_this_month')
  return v.kind === 'week' ? formatRange(v.from, v.to, getLang(), today()) : monthLabel(v.from, getLang(), today())
})

// Подпись выбранного периода датами («3 сент. – 2 окт.»); у «Всё» — слово
const caption = computed(() => {
  if (view.value.kind === 'preset' && view.value.key === 'all') return t('period_all')
  const [from, to] = viewBounds(view.value, today())
  return formatRange(from, to, getLang(), today())
})

const forwardOk = computed(() => (calendarView.value ? canStepForward(calendarView.value, today()) : false))

function pickPreset(key: PresetKey) {
  emit('change', { ...props.state, range: key })
}
function pickMode(kind: 'week' | 'month') {
  if (view.value.kind === kind) return
  emit('change', currentPeriod(kind, today()))
}
function step(dir: -1 | 1) {
  if (calendarView.value && (dir < 0 || forwardOk.value)) emit('change', stepPeriod(calendarView.value, dir))
}
function applyCustom(from: string | null, to: string | null) {
  showCustom.value = false
  emit('change', { range: 'custom', from, to })
}
</script>

<template>
  <div class="period-picker" data-test="period-picker">
    <div class="period-seg" role="group" :aria-label="t('dash_charts_period_label')">
      <button
        v-for="key in PRESETS"
        :key="key"
        type="button"
        class="period-seg-btn"
        :aria-pressed="view.kind === 'preset' && view.key === key"
        :data-test="'period-' + key"
        @click="pickPreset(key)"
      >
        {{ t(PRESET_LABEL_KEYS[key] as any) }}
      </button>
    </div>

    <div class="period-row">
      <button type="button" class="period-chip" :aria-pressed="view.kind === 'week'" data-test="period-mode-week" @click="pickMode('week')">{{ t('period_mode_week') }}</button>
      <button type="button" class="period-chip" :aria-pressed="view.kind === 'month'" data-test="period-mode-month" @click="pickMode('month')">{{ t('period_mode_month') }}</button>
      <button type="button" class="period-chip period-chip-custom" :aria-pressed="view.kind === 'custom'" data-test="period-custom" @click="showCustom = true">
        <Icon name="calendar" /> {{ t('period_custom') }}
      </button>
    </div>

    <div v-if="calendarView" class="date-stepper-pill period-stepper" data-test="period-stepper">
      <button type="button" class="date-stepper-btn" :aria-label="t('period_prev_aria')" data-test="period-prev" @click="step(-1)"><Icon name="chevron_left" /></button>
      <span class="date-stepper-label period-stepper-label" data-test="period-step-label">{{ stepLabel }}</span>
      <button type="button" class="date-stepper-btn" :aria-label="t('period_next_aria')" :disabled="!forwardOk" data-test="period-next" @click="step(1)"><Icon name="chevron_right" /></button>
    </div>

    <p v-if="caption" class="dim period-caption" data-test="period-caption">{{ caption }}</p>

    <CustomPeriodModal v-if="showCustom" :initial-from="state.from" :initial-to="state.to" @close="showCustom = false" @apply="applyCustom" />
  </div>
</template>
