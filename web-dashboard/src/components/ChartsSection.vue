<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import ChartBlock from './ChartBlock.vue'
import ChartsConfigModal from './ChartsConfigModal.vue'
import ChartPeriodModal from './ChartPeriodModal.vue'
import ChartEditValues from './ChartEditValues.vue'
import Icon from './Icon.vue'
import { BODY_PARAMS_CHANGED, BODY_VALUES_CHANGED, useCharts } from '../lib/useCharts'
import { canEditValues, entryGoal, type ChartEntry } from '../lib/chartSeries'
import { effectivePeriod } from '../lib/chartPeriods'
import { filterPointsWithFallback, loadPeriodState, savePeriodState, type PeriodState } from '../lib/chart'
import { t } from '../lib/i18n'

// Блок «Графики»: серии параметров тела, «баллы за день» и числовых метрик; выбор/порядок/цели
// (profiles.dashboard_charts), период общий + свой у каждого графика, правка значений из графика.
const props = defineProps<{ userId: string | null }>()
// state: данные блока загружены, и есть ли хотя бы один ПОСТРОЕННЫЙ график (≥2 точек за окно). Дашборд по этому сигналу сворачивает
// пустой блок «Графики» по умолчанию, чтобы он не занимал место впустую (BACKLOG 17, 07:20).
const emit = defineEmits<{ state: [s: { loaded: boolean; hasChart: boolean }] }>()
const { series, entries, loaded, error, init, reload, saveEntries, saveValue } = useCharts()

watch(
  () => props.userId,
  (uid) => {
    if (uid) init(uid)
  },
  { immediate: true },
)

// Профиль добавил/изменил/удалил параметр тела (или записал значение) — серии надо пересобрать.
const onParamsChanged = () => {
  if (props.userId) reload()
}
const onValuesChanged = (e: Event) => {
  if ((e as CustomEvent).detail?.source !== 'charts') onParamsChanged()
}
onMounted(() => {
  window.addEventListener(BODY_PARAMS_CHANGED, onParamsChanged)
  window.addEventListener(BODY_VALUES_CHANGED, onValuesChanged)
})
onBeforeUnmount(() => {
  window.removeEventListener(BODY_PARAMS_CHANGED, onParamsChanged)
  window.removeEventListener(BODY_VALUES_CHANGED, onValuesChanged)
})

const period = reactive<PeriodState>(loadPeriodState('dash_period_dashboard', { range: 'days30', from: null, to: null }))
const showConfig = ref(false)
const configError = ref<string | null>(null)
const periodFor = ref<string | null>(null)
const periodTick = ref(0) // пересчёт периодов отдельных графиков после сохранения/сброса

function windowFor(key: string) {
  void periodTick.value
  const p = effectivePeriod(key, period)
  return filterPointsWithFallback(series.value[key].points, p.range, p.from, p.to)
}
function pointsFor(key: string) {
  return windowFor(key).points
}
// период был слишком коротким для графика — показали последние записи и говорим об этом
function noteFor(key: string): string | null {
  return windowFor(key).widened ? t('chart_period_widened') : null
}

function goalFor(entry: ChartEntry) {
  const s = series.value[entry.key]
  const g = entryGoal(entry, s)
  return { value: g, label: g != null ? `${t('chart_goal_label')} ${g}${s.unit || ''}` : null }
}

const withData = () => entries.value.filter((e) => (series.value[e.key]?.points.length ?? 0) > 0)
const hasBuiltChart = computed(() => {
  void periodTick.value
  return entries.value.some((e) => series.value[e.key] && pointsFor(e.key).filter((p) => p.y != null).length >= 2)
})
watch([loaded, hasBuiltChart], () => emit('state', { loaded: loaded.value, hasChart: hasBuiltChart.value }), { immediate: true })

async function onSaveConfig(order: ChartEntry[], nextPeriod: PeriodState) {
  configError.value = await saveEntries(order)
  if (configError.value) return
  Object.assign(period, nextPeriod)
  savePeriodState('dash_period_dashboard', period)
  showConfig.value = false
}

function onPeriodApplied() {
  periodFor.value = null
  periodTick.value++
}
</script>

<template>
  <template v-if="loaded">
    <p v-if="error" class="dim text-sm">{{ t('comm_load_error') }} {{ error }}</p>

    <div v-else class="card">
      <div class="mb-3.5 flex justify-end">
        <button type="button" class="secondary" data-test="configure" @click="((configError = null), (showConfig = true))"><EmojiText :text="t('dash_charts_configure_btn')" /></button>
      </div>

      <p v-if="entries.length === 0" class="dim">{{ t('dash_charts_empty') }}</p>
      <p v-else-if="withData().length === 0" class="dim">{{ t('dash_charts_no_data_yet') }}</p>

      <div v-for="entry in withData()" :key="entry.key" class="mb-4" data-test="chart">
        <div class="mb-0.5 flex justify-end">
          <button type="button" class="secondary px-2 py-0.5 text-xs" :title="t('dash_chart_period_btn_title')" data-test="period-btn" @click="periodFor = entry.key"><Icon name="calendar" /></button>
        </div>
        <ChartBlock
          :title="series[entry.key].name ?? series[entry.key].label"
          :icon="series[entry.key].icon"
          :points="pointsFor(entry.key)"
          :variations="series[entry.key].variations"
          :note="noteFor(entry.key)"
          :unit="series[entry.key].unit"
          :color="series[entry.key].color"
          :goal-value="goalFor(entry).value"
          :goal-label="goalFor(entry).label"
        />
        <ChartEditValues v-if="canEditValues(entry.key, series[entry.key].type) && pointsFor(entry.key).length" :points="pointsFor(entry.key)" :unit="series[entry.key].unit" :save="(d, raw) => saveValue(entry.key, d, raw)" />
      </div>
    </div>
  </template>

  <ChartsConfigModal v-if="showConfig" :series="series" :entries="entries" :period="period" :error="configError" @close="showConfig = false" @save="onSaveConfig" />
  <ChartPeriodModal v-if="periodFor" :series-key="periodFor" :shared="period" @close="periodFor = null" @applied="onPeriodApplied" />
</template>
