<script setup lang="ts">
import { computed } from 'vue'
import { muscleGoals } from '../lib/muscleGoals'
import { todayFocus } from '../lib/todayFocus'
import { t, type DictKey } from '../lib/i18n'
import type { Exercise, WorkoutEntry } from '../lib/types'
import type { MuscleId } from '../lib/muscles'

// «Что тренировать сегодня» (BACKLOG 80.4): группы с наибольшим дефицитом подходов за неделю и достаточным отдыхом.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today: string }>()
// «Начать по этим»: кнопка у группы открывает список упражнений, отфильтрованный по этой мышце (тот же фильтр, что и в панели мышцы на карте)
const emit = defineEmits<{ pick: [muscle: MuscleId] }>()
const items = computed(() => todayFocus(props.entries, props.exercises, props.today, muscleGoals.value))
const rest = (d: number | null) => (d === null ? t('workouts_focus_never') : t('workouts_focus_rest').replace('{n}', String(d)))
</script>

<template>
  <section v-if="exercises.length" class="mb-3 rounded-lg border p-3" style="border-color: var(--border); background: var(--bg)" data-testid="today-focus">
    <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_focus_title') }}</div>
    <ul v-if="items.length" class="m-0 list-none p-0 text-[0.85em]">
      <li v-for="i in items" :key="i.muscle" class="flex flex-wrap items-center gap-2 py-0.5" data-testid="focus-item">
        <span>{{ t(('workouts_muscle_' + i.muscle) as DictKey) }} {{ i.sets }}/{{ i.target }}, {{ rest(i.restDays) }}</span>
        <button type="button" class="rounded-lg border px-2 py-0.5" style="border-color: var(--border); background: transparent; color: var(--accent)" data-testid="focus-start" :aria-label="t('workouts_focus_start_aria').replace('{m}', t(('workouts_muscle_' + i.muscle) as DictKey))" @click="emit('pick', i.muscle)">{{ t('workouts_focus_start') }}</button>
      </li>
    </ul>
    <p v-else class="m-0 text-[0.8em]" style="color: var(--text-dim)" data-testid="focus-empty">{{ t('workouts_focus_none') }}</p>
  </section>
</template>
