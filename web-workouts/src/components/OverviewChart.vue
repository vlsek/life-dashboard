<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ChartBlock from './ChartBlock.vue'
import PeriodPicker from './PeriodPicker.vue'
import Icon from './Icon.vue'
import { overviewPoints } from '../lib/workoutCharts'
import { filterPointsByRange, loadPeriodState, savePeriodState, type PeriodState } from '../lib/chart'
import { t } from '../lib/i18n'
import type { WorkoutEntry } from '../lib/types'
import EmojiText from './EmojiText.vue'

// Общий график объёма тренировок (все упражнения сразу) — портировано из renderOverviewChart()
// в workouts.js. Свой период (dash_period_workouts — тот же ключ localStorage, что в оригинале,
// чтобы период не сбрасывался при переходе со старой страницы на пилот).
const props = defineProps<{ entries: WorkoutEntry[] }>()
const allPoints = computed(() => overviewPoints(props.entries))
const period = reactive<PeriodState>(loadPeriodState('dash_period_workouts', { range: 'month', from: null, to: null }))
const showPeriod = ref(false)
const points = computed(() => filterPointsByRange(allPoints.value, period.range, period.from, period.to))

function onPeriodChange(next: PeriodState) {
  Object.assign(period, next)
  savePeriodState('dash_period_workouts', period)
}
</script>

<template>
  <section v-if="allPoints.length >= 2" class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-test="overview-card">
    <div class="mb-2 flex items-center gap-2">
      <strong class="flex-1"><EmojiText :text="t('workouts_overview_title')" /></strong>
      <button type="button" class="secondary px-2 py-0.5" :title="t('dash_charts_period_label')" data-test="period-btn" @click="showPeriod = !showPeriod"><Icon name="gear" /></button>
    </div>
    <PeriodPicker v-if="showPeriod" :state="period" @change="onPeriodChange" />
    <ChartBlock v-if="points.length >= 2" title="" :points="points" :unit="' ' + t('workouts_sets_word')" color="var(--accent)" />
    <p v-else class="dim">{{ t('chart_not_enough_data') }}</p>
  </section>
</template>
