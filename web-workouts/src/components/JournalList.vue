<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import JournalCalendar from './JournalCalendar.vue'
import { dayMinutes, entryIdsOfRoutine, journalDays, journalMonths, routinesWithWorkouts, splitByWorkout } from '../lib/journal'
import type { JournalItem } from '../lib/journal'
import { formatSets } from '../lib/workouts'
import { defaultWeightUnit } from '../lib/weightUnit'
import { capFirst } from '../lib/exerciseNames'
import { fmtRu } from '../lib/date'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'
import { prSetText } from '../lib/records'
import { sessionMinutes } from '../lib/sessionContract'
import type { WorkoutSession } from '../lib/sessionContract'
import type { Exercise, WorkoutEntry } from '../lib/types'

// Вкладка «Журнал» (BACKLOG 44.5б, срез 1): записи по дням, свежие сверху — один взгляд вместо поиска по карточкам упражнений.
const props = withDefaults(defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; sessions?: WorkoutSession[]; routines?: { id: string; name: string }[] }>(), { sessions: () => [], routines: () => [] })
const month = ref('')
const query = ref('')
const months = computed(() => journalMonths(props.entries))
const day = ref<string | null>(null)
const routineId = ref('')
const routineOptions = computed(() => routinesWithWorkouts(props.routines, props.sessions))
const routineIds = computed(() => (routineId.value ? entryIdsOfRoutine(props.entries, props.sessions, routineId.value) : null))
const calMonth = computed(() => month.value || months.value[0] || '')
const activeDates = computed(() => [...new Set(props.entries.filter((e) => e.date.startsWith(calMonth.value)).map((e) => e.date))])
watch(month, () => { day.value = null })
const days = computed(() => journalDays(props.entries, props.exercises, 30, month.value || null, query.value, day.value, routineIds.value))
const view = ref<'days' | 'workouts'>('days')
interface Block { key: string; date: string; title: string; duration: string; items: JournalItem[]; setCount: number; volume: number; entries: WorkoutEntry[] }
// Меню карточки (69.11 срез 8): само ничего не пишет — события обрабатывает App (старт тренировки, рутины, удаление записей)
const emit = defineEmits<{ (e: 'repeat', entries: WorkoutEntry[]): void; (e: 'save-routine', entries: WorkoutEntry[], name: string): void; (e: 'delete', entries: WorkoutEntry[]): void }>()
const routineName = (b: Block) => b.title || fmtRu(b.date)
const fmtDur = (m: number | null) => (m != null && m > 0 ? `${m} ${t('workouts_duration_unit')}` : '')
const blocks = computed<Block[]>(() => {
  if (view.value === 'workouts' && props.sessions.length > 0) {
    return splitByWorkout(days.value, props.sessions).map((c) => ({
      key: c.key, date: c.date, items: c.items, setCount: c.setCount, volume: c.volume, entries: c.items.map((i) => i.entry),
      title: c.session ? (c.session.name || props.routines.find((r) => r.id === c.session?.routine_id)?.name || '') : '',
      duration: c.session?.finished_at ? fmtDur(sessionMinutes(c.session, 0)) : '',
    }))
  }
  return days.value.map((d) => ({ key: d.date, date: d.date, items: d.items, setCount: d.setCount, volume: d.volume ?? 0, entries: d.items.map((i) => i.entry), title: '', duration: fmtMin(d.date) }))
})
const fmtVol = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ${defaultWeightUnit()}`
const fmtMin = (date: string) => { const m = dayMinutes(props.sessions, date); return m > 0 ? `${m} ${t('workouts_duration_unit')}` : '' }
const daySummary = (n: number, sets: number) => t('workouts_today_summary').replace('{ex}', String(n)).replace('{n}', String(sets))
</script>

<template>
  <div data-testid="journal">
    <input v-if="entries.length > 0" v-model="query" type="search" class="mb-3 mr-2 rounded-lg border px-2 py-1 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" :placeholder="t('workouts_journal_search')" :aria-label="t('workouts_journal_search')" data-testid="journal-search" />
    <span v-if="sessions.length > 0" class="mb-3 mr-2 inline-flex overflow-hidden rounded-lg border text-sm" style="border-color: var(--border)" data-testid="journal-view">
      <button type="button" class="border-0 px-2 py-1" :style="{ background: view === 'days' ? 'var(--accent, #4f8cff)' : 'var(--bg-card)', color: view === 'days' ? '#fff' : 'var(--text)' }" :aria-pressed="view === 'days'" data-testid="journal-view-days" @click="view = 'days'">{{ t('workouts_journal_by_day') }}</button>
      <button type="button" class="border-0 px-2 py-1" :style="{ background: view === 'workouts' ? 'var(--accent, #4f8cff)' : 'var(--bg-card)', color: view === 'workouts' ? '#fff' : 'var(--text)' }" :aria-pressed="view === 'workouts'" data-testid="journal-view-workouts" @click="view = 'workouts'">{{ t('workouts_journal_by_workout') }}</button>
    </span>
    <select v-if="months.length > 1" v-model="month" class="mb-3 rounded-lg border px-2 py-1 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" data-testid="journal-month">
      <option value="">{{ t('workouts_journal_all_months') }}</option>
      <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
    </select>
    <select v-if="routineOptions.length > 0" v-model="routineId" class="mb-3 ml-2 rounded-lg border px-2 py-1 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" data-testid="journal-routine">
      <option value="">{{ t('workouts_journal_all_routines') }}</option>
      <option v-for="r in routineOptions" :key="r.id" :value="r.id">{{ r.name }}</option>
    </select>
    <JournalCalendar v-if="calMonth" :month="calMonth" :active-dates="activeDates" :selected="day" @select="day = $event" />
    <p v-if="blocks.length === 0" class="text-sm" style="color: var(--text-dim)" data-testid="journal-empty">{{ entries.length > 0 ? t('workouts_journal_nothing') : t('workouts_journal_empty') }}</p>
    <section v-for="d in blocks" :key="d.key" class="mb-3 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="journal-day">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="m-0 font-bold" data-testid="journal-date">{{ fmtRu(d.date) }}<span v-if="d.title" class="ml-2 text-sm font-medium" style="color: var(--text-dim)" data-testid="journal-workout-title">{{ d.title }}</span></h3>
        <span class="text-xs" style="color: var(--text-dim)">{{ daySummary(d.items.length, d.setCount) }}<template v-if="d.volume"> · <span data-testid="journal-volume">{{ t('workouts_journal_volume') }} {{ fmtVol(d.volume) }}</span></template><template v-if="d.duration"> · <span data-testid="journal-duration">{{ t('workouts_journal_duration') }} {{ d.duration }}</span></template></span>
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
      <div class="mt-2 flex gap-4 border-t pt-2 text-xs" style="border-color: var(--border)" data-testid="journal-actions">
        <button type="button" class="border-0 bg-transparent p-0" style="color: var(--accent, #4f8cff); min-height: 28px" data-testid="journal-repeat" @click="emit('repeat', d.entries)">{{ t('workouts_journal_repeat') }}</button>
        <button type="button" class="border-0 bg-transparent p-0" style="color: var(--accent, #4f8cff); min-height: 28px" data-testid="journal-to-routine" @click="emit('save-routine', d.entries, routineName(d))">{{ t('rt_save') }}</button>
        <button type="button" class="ml-auto border-0 bg-transparent p-0" style="color: var(--danger, #d64545); min-height: 28px" data-testid="journal-delete" @click="emit('delete', d.entries)">{{ t('workouts_journal_delete') }}</button>
      </div>
    </section>
  </div>
</template>
