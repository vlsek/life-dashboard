<script setup lang="ts">
import { computed } from 'vue'
import ChartBlock from './ChartBlock.vue'
import { exercisePoints } from '../lib/workoutCharts'
import { t } from '../lib/i18n'
import { defaultWeightUnit, repUnit } from '../lib/weightUnit'
import type { Exercise, WorkoutEntry } from '../lib/types'

// Мини-график прогресса на карточке упражнения — портировано из блока «мини-график» в
// renderExerciseCard() (workouts.js). Меньше 2 точек — оригинал график вообще не показывает,
// здесь то же решает родитель (ExerciseCard), т.к. нужно доступ к длине точек до рендера подписи.
const props = defineProps<{ exercise: Exercise; entries: WorkoutEntry[] }>()
const points = computed(() => exercisePoints(props.entries, props.exercise))
const title = computed(() => (props.exercise.tracks_weight ? t('workouts_chart_title') : t('workouts_chart_title_volume')))
const unit = computed(() => (props.exercise.tracks_weight ? ' ' + (props.exercise.unit || defaultWeightUnit()) : repUnit(props.exercise) ? ' ' + repUnit(props.exercise) : ''))
</script>

<template>
  <ChartBlock v-if="points.length >= 2" :title="title" :points="points" :unit="unit" color="var(--accent)" />
</template>
