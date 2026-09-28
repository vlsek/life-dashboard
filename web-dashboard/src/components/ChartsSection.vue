<script setup lang="ts">
import { reactive, watch } from 'vue'
import ChartBlock from './ChartBlock.vue'
import PeriodPicker from './PeriodPicker.vue'
import Icon from './Icon.vue'
import { useCharts } from '../lib/useCharts'
import { filterPointsByRange, loadPeriodState, savePeriodState, type PeriodState } from '../lib/chart'
import { t } from '../lib/i18n'

const props = defineProps<{ userId: string | null }>()

const { pointsSeries, loaded, error, init } = useCharts()

watch(
  () => props.userId,
  (uid) => {
    if (uid) init(uid)
  },
  { immediate: true },
)

const period = reactive<PeriodState>(loadPeriodState('dash_period_dashboard', { range: 'days10', from: null, to: null }))

function onPeriodChange(next: PeriodState) {
  Object.assign(period, next)
  savePeriodState('dash_period_dashboard', period)
}
</script>

<template>
  <template v-if="loaded">
    <p v-if="error" class="dim text-sm">{{ t('comm_load_error') }} {{ error }}</p>

    <template v-else>
      <div class="mb-2.5 flex items-center gap-2">
        <PeriodPicker :state="period" @change="onPeriodChange" />
        <span class="dim inline-flex items-center gap-1 text-xs" :title="t('dash_charts_period_label')"><Icon name="gear" /></span>
      </div>
      <ChartBlock :title="t('dash_points_series_label')" :points="filterPointsByRange(pointsSeries, period.range, period.from, period.to)" color="var(--danger)" />
    </template>
  </template>
</template>
