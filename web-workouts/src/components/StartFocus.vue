<script setup lang="ts">
import { computed } from 'vue'
import { muscleGoals } from '../lib/muscleGoals'
import { restingMuscles, todayFocus } from '../lib/todayFocus'
import { t, type DictKey } from '../lib/i18n'
import type { BodyModel } from '../lib/bodyModel'
import MiniBody from './MiniBody.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

// «Сегодня можно тренировать» на главной (BACKLOG 69.17, срез 2, макет v2): до трёх групп мышц с наибольшим дефицитом подходов и достаточным отдыхом.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today: string; model?: BodyModel }>()
const items = computed(() => todayFocus(props.entries, props.exercises, props.today, muscleGoals.value)) // не более 3: todayFocus уже ограничивает
// «Отдыхают: …» — до четырёх групп, ближайшие к готовности первыми; срок — по самой скорой из них
const resting = computed(() => restingMuscles(props.entries, props.exercises, props.today).slice(0, 4))
const restingText = computed(() => {
  if (!resting.value.length) return ''
  const names = resting.value.map((r) => t(('workouts_muscle_' + r.muscle) as DictKey)).join(', ')
  const when = resting.value[0].readyInDays <= 1 ? t('workouts_start_resting_tomorrow') : t('workouts_start_resting_day_after')
  return t('workouts_start_resting').replace('{list}', names).replace('{when}', when)
})
</script>

<template>
  <section v-if="exercises.length && items.length" class="mb-3 flex items-center justify-between gap-3 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-testid="start-focus">
    <div class="min-w-0">
      <div class="mb-2 text-xs" style="color: var(--text-dim)">{{ t('workouts_start_focus_title') }}</div>
      <div class="flex flex-wrap gap-2">
        <span v-for="i in items" :key="i.muscle" class="rounded-full border px-3 py-1 text-sm font-medium" style="border-color: var(--accent); color: var(--accent)" data-testid="start-focus-chip">
          {{ t(('workouts_muscle_' + i.muscle) as DictKey) }}<span class="ml-1 text-xs font-normal" style="color: var(--text-dim)">{{ i.sets }}/{{ i.target }}</span>
        </span>
      </div>
      <div v-if="restingText" class="mt-2 text-xs" style="color: var(--text-dim)" data-testid="start-focus-resting">{{ restingText }}</div>
    </div>
    <MiniBody class="shrink-0" :highlight="items.map((i) => i.muscle)" :model="model" />
  </section>
</template>
