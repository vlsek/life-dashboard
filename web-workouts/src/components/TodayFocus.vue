<script setup lang="ts">
import { computed } from 'vue'
import { todayFocus } from '../lib/todayFocus'
import { t, type DictKey } from '../lib/i18n'
import type { Exercise, WorkoutEntry } from '../lib/types'

// «Что тренировать сегодня» (BACKLOG 80.4): группы с наибольшим дефицитом подходов за неделю и достаточным отдыхом.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today: string }>()
const items = computed(() => todayFocus(props.entries, props.exercises, props.today))
const rest = (d: number | null) => (d === null ? t('workouts_focus_never') : t('workouts_focus_rest').replace('{n}', String(d)))
</script>

<template>
  <section v-if="exercises.length" class="mb-3 rounded-lg border p-3" style="border-color: var(--border); background: var(--bg)" data-testid="today-focus">
    <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_focus_title') }}</div>
    <ul v-if="items.length" class="m-0 list-none p-0 text-[0.85em]">
      <li v-for="i in items" :key="i.muscle" data-testid="focus-item">
        {{ t(('workouts_muscle_' + i.muscle) as DictKey) }} {{ i.sets }}/{{ i.target }}, {{ rest(i.restDays) }}
      </li>
    </ul>
    <p v-else class="m-0 text-[0.8em]" style="color: var(--text-dim)" data-testid="focus-empty">{{ t('workouts_focus_none') }}</p>
  </section>
</template>
