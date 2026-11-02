<script setup lang="ts">
import { computed, ref } from 'vue'
import { journalDays, journalMonths } from '../lib/journal'
import { formatSets } from '../lib/workouts'
import { defaultWeightUnit } from '../lib/weightUnit'
import { capFirst } from '../lib/exerciseNames'
import { fmtRu } from '../lib/date'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'
import { prSetText } from '../lib/records'
import type { Exercise, WorkoutEntry } from '../lib/types'

// Вкладка «Журнал» (BACKLOG 44.5б, срез 1): записи по дням, свежие сверху — один взгляд вместо поиска по карточкам упражнений.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[] }>()
const month = ref('')
const months = computed(() => journalMonths(props.entries))
const days = computed(() => journalDays(props.entries, props.exercises, 30, month.value || null))
const fmtVol = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ${defaultWeightUnit()}`
const daySummary = (n: number, sets: number) => t('workouts_today_summary').replace('{ex}', String(n)).replace('{n}', String(sets))
</script>

<template>
  <div data-testid="journal">
    <select v-if="months.length > 1" v-model="month" class="mb-3 rounded-lg border px-2 py-1 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" data-testid="journal-month">
      <option value="">{{ t('workouts_journal_all_months') }}</option>
      <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
    </select>
    <p v-if="days.length === 0" class="text-sm" style="color: var(--text-dim)" data-testid="journal-empty">{{ t('workouts_journal_empty') }}</p>
    <section v-for="d in days" :key="d.date" class="mb-3 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="journal-day">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="m-0 font-bold" data-testid="journal-date">{{ fmtRu(d.date) }}</h3>
        <span class="text-xs" style="color: var(--text-dim)">{{ daySummary(d.items.length, d.setCount) }}<template v-if="d.volume"> · <span data-testid="journal-volume">{{ t('workouts_journal_volume') }} {{ fmtVol(d.volume) }}</span></template></span>
      </div>
      <ul class="m-0 mt-1 list-none p-0">
        <li v-for="i in d.items" :key="i.entry.id" class="border-t py-1.5 first:border-t-0" style="border-color: var(--border)" data-testid="journal-row">
          <div class="text-sm font-medium">{{ capFirst(i.exercise.name) }}</div>
          <div v-if="i.best" class="text-xs" data-testid="journal-best">
            <span style="color: var(--text-dim)">{{ t('workouts_journal_best') }}: </span><span class="font-medium">{{ prSetText(i.best, defaultWeightUnit()) }}</span>
            <span v-if="i.record" class="ml-1 font-semibold" style="color: var(--warn, #d9a400)" data-testid="journal-record">★ {{ t(('aw_pr_' + i.record) as DictKey) }}</span>
          </div>
          <div class="text-xs" style="color: var(--text-dim)">{{ formatSets(i.entry.sets, i.exercise, t('workouts_per_hour'), t('workouts_duration_unit'), defaultWeightUnit()) }}</div>
        </li>
      </ul>
    </section>
  </div>
</template>
