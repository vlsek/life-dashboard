<script setup lang="ts">
import { computed } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { fmtVolume, type WorkoutSummaryData } from '../lib/summary'
import { prSetText } from '../lib/records'
import type { Exercise } from '../lib/types'

// Окно итогов после «Завершить» (BACKLOG 69.10, срез 1): плитки (время, подходы, объём, упражнения), рекорды, задействованные мышцы.
const props = defineProps<{ data: WorkoutSummaryData; exercises: Exercise[]; unit: string }>()
const emit = defineEmits<{ close: [] }>()
const names = computed(() => new Map(props.exercises.map((e) => [e.id, e])))
const unitOf = (id: string) => names.value.get(id)?.unit || props.unit
const muscleName = (m: string) => t(('workouts_muscle_' + m) as DictKey)
const tiles = computed(() => [
  { k: 'time', label: t('sm_time'), value: props.data.minutes + ' ' + t('sm_min') },
  { k: 'sets', label: t('sm_sets'), value: String(props.data.workingSets) },
  { k: 'volume', label: t('sm_volume'), value: fmtVolume(props.data.volume) + ' ' + props.unit },
  { k: 'ex', label: t('sm_exercises'), value: String(props.data.exerciseCount) },
])
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" style="background: rgba(0, 0, 0, 0.6)" data-testid="workout-summary" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" role="dialog" :aria-label="t('sm_title')">
      <h2 class="mb-3 text-lg font-bold">{{ t('sm_title') }}</h2>
      <div class="mb-4 grid grid-cols-2 gap-2">
        <div v-for="x in tiles" :key="x.k" class="rounded-lg border p-3" style="border-color: var(--border); background: var(--bg)" :data-testid="'sm-' + x.k">
          <div class="text-xs" style="color: var(--text-dim)">{{ x.label }}</div>
          <div class="text-lg font-semibold tabular-nums">{{ x.value }}</div>
        </div>
      </div>
      <div v-if="data.records.length" class="mb-4" data-testid="sm-records">
        <h3 class="mb-1 text-sm font-semibold" style="color: var(--accent)">{{ t('sm_records') }}</h3>
        <ul class="text-sm">
          <li v-for="(r, i) in data.records" :key="i" class="py-0.5">
            ★ {{ names.get(r.exerciseId)?.name ?? '' }} — {{ t(('aw_pr_' + r.kind) as DictKey) }}: {{ prSetText({ reps: r.reps, weight: r.weight, duration: r.duration, time: null, side: null }, unitOf(r.exerciseId)) }}
          </li>
        </ul>
      </div>
      <div v-if="data.muscles.length" class="mb-4" data-testid="sm-muscles">
        <h3 class="mb-1 text-sm font-semibold" style="color: var(--text-dim)">{{ t('sm_muscles') }}</h3>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="m in data.muscles" :key="m" class="rounded-full border px-3 py-1 text-xs" style="border-color: var(--border)">{{ muscleName(m) }}</span>
        </div>
      </div>
      <button type="button" class="w-full rounded-lg py-3 font-semibold" style="background: var(--accent); color: var(--accent-text); min-height: 48px" data-testid="sm-close" @click="emit('close')">{{ t('sm_done') }}</button>
    </div>
  </div>
</template>
