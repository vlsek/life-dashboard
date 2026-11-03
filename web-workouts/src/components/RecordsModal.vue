<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { exerciseBests, prSetText } from '../lib/records'
import type { Exercise, WorkoutEntry } from '../lib/types'

// «Рекорды» упражнения (BACKLOG 69.9, срез 2): лучшие значения за всё время и «повторы на весе».
const props = defineProps<{ exercise: Exercise; entries: WorkoutEntry[]; unit: string }>()
const emit = defineEmits<{ close: [] }>()
const unit = computed(() => props.exercise.unit || props.unit)
const b = computed(() => exerciseBests(props.entries.filter((e) => e.exercise_id === props.exercise.id)))
const num = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')
const rows = computed(() => {
  const x = b.value, u = unit.value, out: { k: string; label: string; text: string; date: string }[] = []
  if (x.weight) out.push({ k: 'weight', label: t('aw_pr_weight'), text: `${num(x.weight.value)} ${u}`, date: x.weight.date })
  if (x.e1rm) out.push({ k: 'e1rm', label: t('aw_pr_e1rm'), text: `${num(x.e1rm.value)} ${u}`, date: x.e1rm.date })
  if (x.volume) out.push({ k: 'volume', label: t('aw_pr_volume'), text: prSetText({ reps: x.volume.reps, weight: x.volume.weight, duration: null, time: null, side: null }, u), date: x.volume.date })
  if (x.reps) out.push({ k: 'reps', label: t('aw_pr_reps'), text: String(x.reps.value), date: x.reps.date })
  if (x.duration) out.push({ k: 'duration', label: t('aw_pr_duration'), text: `${x.duration.value}'`, date: x.duration.date })
  return out
})
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" style="background: rgba(0, 0, 0, 0.6)" data-testid="records-modal" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" role="dialog" aria-modal="true">
      <h2 class="mb-3 text-lg font-bold">★ {{ t('rec_title') }} — {{ exercise.name }}</h2>
      <p v-if="!rows.length" class="py-4 text-sm" style="color: var(--text-dim)" data-testid="records-empty">{{ t('rec_empty') }}</p>
      <ul v-else class="mb-4 text-sm">
        <li v-for="r in rows" :key="r.k" class="flex items-baseline justify-between gap-2 border-b py-2" style="border-color: var(--border)" :data-testid="'rec-' + r.k">
          <span style="color: var(--text-dim)">{{ r.label }}</span>
          <span class="text-right"><b class="tabular-nums">{{ r.text }}</b> <span class="text-xs" style="color: var(--text-dim)">{{ r.date }}</span></span>
        </li>
      </ul>
      <div v-if="b.repsAt.length" class="mb-4" data-testid="rec-repsat">
        <h3 class="mb-1 text-sm font-semibold" style="color: var(--accent)">{{ t('rec_reps_at') }}</h3>
        <ul class="text-sm">
          <li v-for="r in b.repsAt" :key="r.weight" class="flex justify-between py-0.5"><span class="tabular-nums">{{ num(r.weight) }} {{ unit }}</span><span><b>× {{ r.reps }}</b> <span class="text-xs" style="color: var(--text-dim)">{{ r.date }}</span></span></li>
        </ul>
      </div>
      <button type="button" class="w-full rounded-lg border py-2 text-sm" style="border-color: var(--border); min-height: 44px" data-testid="records-close" @click="emit('close')">{{ t('close') }}</button>
    </div>
  </div>
</template>
