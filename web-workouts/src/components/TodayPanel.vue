<script setup lang="ts">
import { computed } from 'vue'
import { countSets, todayItems } from '../lib/journal'
import { formatSets } from '../lib/workouts'
import { defaultWeightUnit } from '../lib/weightUnit'
import { capFirst } from '../lib/exerciseNames'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import type { Exercise, WorkoutEntry } from '../lib/types'

// Блок «Сегодня» над вкладками (BACKLOG 44.5б, срез 1): что уже сделано сегодня и «+ подход» одним тапом (копия последнего подхода).
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; busyId?: string | null }>()
const emit = defineEmits<{ addSet: [WorkoutEntry] }>()
const items = computed(() => todayItems(props.entries, props.exercises, todayStr()))
const summary = computed(() => t('workouts_today_summary').replace('{ex}', String(items.value.length)).replace('{n}', String(countSets(items.value))))
</script>

<template>
  <section class="mb-4 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="today-panel">
    <h3 class="m-0 font-bold">{{ t('workouts_today_title') }}</h3>
    <p v-if="items.length === 0" class="mb-0 mt-1.5 text-sm" style="color: var(--text-dim)" data-testid="today-empty">{{ t('workouts_today_empty') }}</p>
    <template v-else>
      <p class="mb-2 mt-0.5 text-xs" style="color: var(--text-dim)" data-testid="today-summary">{{ summary }}</p>
      <ul class="m-0 list-none p-0">
        <li v-for="i in items" :key="i.entry.id" class="flex items-center gap-2 border-t py-1.5 first:border-t-0" style="border-color: var(--border)" data-testid="today-row">
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ capFirst(i.exercise.name) }}</div>
            <div class="truncate text-xs" style="color: var(--text-dim)">{{ formatSets(i.entry.sets, i.exercise, t('workouts_per_hour'), t('workouts_duration_unit'), defaultWeightUnit()) }}</div>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border px-2.5 py-1 text-sm"
            style="border-color: var(--border); background: var(--bg); color: var(--text)"
            :disabled="busyId === i.entry.id"
            data-testid="today-add-set"
            @click="emit('addSet', i.entry)"
          >
            {{ t('workouts_inline_add_set') }}
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>
