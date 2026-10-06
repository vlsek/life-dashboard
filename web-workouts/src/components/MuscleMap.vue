<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLang, t, type DictKey } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { MUSCLE_IDS, referenceFor, ruleForExercise, type MuscleId } from '../lib/muscles'
import { BACK_SHAPES, FRONT_SHAPES, type MuscleShape } from '../lib/muscleShapes'
import {
  DEFAULT_STATS_PERIOD,
  STATS_PERIODS,
  isStatsPeriod,
  isTrainedRecently,
  lastTrainedByMuscle,
  lastTrainedRows,
  daysAgo,
  periodStart,
  trainingDaysByMuscle,
  unmappedExercises,
  untrainedMuscles,
  type StatsPeriod,
} from '../lib/muscleStats'
import type { Exercise, WorkoutEntry } from '../lib/types'
import CollapseChevron from './CollapseChevron.vue'

// Карта мышц (BACKLOG 3.2, первый срез): зелёные — мышцы, задействованные за последние 4 дня,
// серые — нет. Клик по мышце — её упражнения (свои с кнопкой «Добавить запись» + подсказки из справочника).
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today?: string; studyRecent?: boolean }>()
const emit = defineEmits<{ 'add-entry': [exercise: Exercise] }>()

const OPEN_KEY = 'workouts_musclemap_open'
function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}
const open = ref(readOpen())
function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem(OPEN_KEY, open.value ? '1' : '0')
  } catch {
    /* состояние блока не критично */
  }
}

const today = computed(() => props.today ?? todayStr())
const last = computed(() => lastTrainedByMuscle(props.entries, props.exercises, today.value))
const done = computed(() => new Set(MUSCLE_IDS.filter((m) => isTrainedRecently(last.value[m], today.value))))
// «Когда тренировали»: по каждой мышце — сегодня / вчера / N дн. назад (+ дата) или «ещё не тренировали»; давно не тренированные сверху.
const lastRows = computed(() => lastTrainedRows(props.entries, props.exercises, today.value, MUSCLE_IDS))
function agoText(last: string | undefined | null): string {
  const n = daysAgo(last ?? undefined, today.value)
  if (n === null) return t('workouts_muscles_not_yet')
  if (n === 0) return t('workouts_muscles_today')
  if (n === 1) return t('workouts_muscles_yesterday')
  return n + ' ' + t('workouts_muscles_days_ago')
}
function ruDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
const PERIOD_KEY = 'workouts_musclemap_period'
function readPeriod(): StatsPeriod {
  try {
    const v = Number(localStorage.getItem(PERIOD_KEY))
    return isStatsPeriod(v) ? v : DEFAULT_STATS_PERIOD
  } catch {
    return DEFAULT_STATS_PERIOD
  }
}
const period = ref<StatsPeriod>(readPeriod())
function setPeriod(p: StatsPeriod) {
  period.value = p
  try {
    localStorage.setItem(PERIOD_KEY, String(p))
  } catch {
    /* выбор периода не критичен */
  }
}
// Все группы, которые были в работе за период (а не только топ), по убыванию числа дней.
const stats = computed(() => trainingDaysByMuscle(props.entries, props.exercises, today.value, periodStart(today.value, period.value)))
const untrained = computed(() => untrainedMuscles(stats.value, MUSCLE_IDS))
const maxDays = computed(() => Math.max(1, ...stats.value.map((s) => s.days)))
const unmapped = computed(() => unmappedExercises(props.exercises))

const selected = ref<MuscleId | null>(null)
function select(m: MuscleId) {
  selected.value = selected.value === m ? null : m
}
const muscleName = (m: MuscleId) => t(`workouts_muscle_${m}` as DictKey)

const ownExercises = computed(() => {
  const m = selected.value
  if (!m) return []
  return props.exercises.filter((ex) => ruleForExercise(ex.name)?.muscles.includes(m))
})
const suggestions = computed(() => {
  const m = selected.value
  if (!m) return []
  const ownRuleIds = new Set(ownExercises.value.map((ex) => ruleForExercise(ex.name)?.id))
  const lang = getLang()
  return referenceFor(m)
    .filter((r) => !ownRuleIds.has(r.id))
    .map((r) => (lang === 'ru' ? r.ru : r.en))
})

const views: { key: 'front' | 'back'; label: DictKey; shapes: MuscleShape[] }[] = [
  { key: 'front', label: 'workouts_muscles_front', shapes: FRONT_SHAPES },
  { key: 'back', label: 'workouts_muscles_back', shapes: BACK_SHAPES },
]
function shapeStyle(m: MuscleId) {
  const isDone = done.value.has(m)
  return {
    fill: isDone ? 'var(--success)' : 'var(--text-dim)',
    opacity: isDone ? 0.9 : 0.35,
    stroke: selected.value === m ? 'var(--accent)' : 'transparent',
    strokeWidth: 1.6,
    cursor: 'pointer',
  }
}
</script>

<template>
  <section class="mb-4 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="muscle-map">
    <div
      class="collapse-head flex items-center gap-2"
      role="button"
      tabindex="0"
      data-testid="muscle-map-toggle"
      :aria-expanded="open"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <h3 class="m-0 font-bold">{{ t('workouts_muscles_title') }}</h3>
      <CollapseChevron :collapsed="!open" />
    </div>

    <div v-if="open" class="mt-3" data-testid="muscle-map-body">
      <p class="m-0 mb-3 text-[0.85em]" style="color: var(--text-dim)">{{ t('workouts_muscles_hint') }}</p>

      <div class="flex flex-wrap justify-center gap-4">
        <figure v-for="v in views" :key="v.key" class="m-0 text-center">
          <svg viewBox="0 0 100 190" class="h-64 w-32" role="group" :aria-label="t(v.label)">
            <circle cx="50" cy="14" r="9" :fill="props.studyRecent ? 'var(--success)' : 'none'" :fill-opacity="props.studyRecent ? 0.9 : 1" :stroke="props.studyRecent ? 'var(--success)' : 'var(--border)'" stroke-width="1.2" data-testid="muscle-head" />
            <rect x="36" y="33" width="28" height="60" rx="8" fill="none" stroke="var(--border)" stroke-width="1" />
            <g
              v-for="(s, i) in v.shapes"
              :key="v.key + i"
              :data-muscle="s.muscle"
              :data-state="done.has(s.muscle) ? 'done' : 'idle'"
              role="button"
              tabindex="0"
              :aria-label="muscleName(s.muscle)"
              @click="select(s.muscle)"
              @keydown.enter.prevent="select(s.muscle)"
              @keydown.space.prevent="select(s.muscle)"
            >
              <component :is="s.tag" v-bind="s.attrs" :style="shapeStyle(s.muscle)" />
            </g>
          </svg>
          <figcaption class="text-[0.8em]" style="color: var(--text-dim)">{{ t(v.label) }}</figcaption>
        </figure>
      </div>

      <div v-if="studyRecent" class="mt-2 text-center text-[0.8em]" style="color: var(--success)" data-testid="muscle-head-study">{{ t('workouts_muscles_head_study') }}</div>

      <div class="mt-2 flex flex-wrap justify-center gap-4 text-[0.8em]" style="color: var(--text-dim)">
        <span><span style="color: var(--success)">■</span> {{ t('workouts_muscles_legend_done') }}</span>
        <span><span style="opacity: 0.5">■</span> {{ t('workouts_muscles_legend_idle') }}</span>
      </div>

      <div v-if="selected" class="mt-3 rounded-lg border p-3 text-sm" style="border-color: var(--border); background: var(--bg)" data-testid="muscle-detail">
        <div class="font-bold">{{ muscleName(selected) }}</div>
        <div class="mb-2 text-[0.85em]" style="color: var(--text-dim)">
          {{ t('workouts_muscles_last') }}
          <template v-if="last[selected]"><span data-testid="muscle-last-ago">{{ agoText(last[selected]) }}</span> ({{ ruDate(last[selected] as string) }})</template>
          <template v-else>{{ t('workouts_muscles_never') }}</template>
        </div>

        <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_my_ex') }}</div>
        <p v-if="ownExercises.length === 0" class="m-0 mb-2 text-[0.85em]" style="color: var(--text-dim)">{{ t('workouts_muscles_no_own') }}</p>
        <ul v-else class="m-0 mb-2 list-none p-0">
          <li v-for="ex in ownExercises" :key="ex.id" class="flex items-center justify-between gap-2 py-1">
            <span>{{ ex.name }}</span>
            <button
              type="button"
              class="rounded-lg border px-2 py-1 text-[0.8em]"
              style="border-color: var(--border); color: var(--text)"
              data-testid="muscle-add-entry"
              @click="emit('add-entry', ex)"
            >
              {{ t('workouts_muscles_add_entry') }}
            </button>
          </li>
        </ul>

        <template v-if="suggestions.length">
          <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_suggest') }}</div>
          <ul class="m-0 list-disc pl-5" style="color: var(--text-dim)" data-testid="muscle-suggestions">
            <li v-for="s in suggestions" :key="s">{{ s }}</li>
          </ul>
        </template>
      </div>

      <div class="mt-4" data-testid="muscle-last-list">
        <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_when_title') }}</div>
        <div v-for="r in lastRows" :key="r.muscle" class="flex items-baseline gap-2 py-0.5 text-[0.85em]" :data-muscle="r.muscle">
          <span class="w-28 shrink-0 truncate">{{ muscleName(r.muscle) }}</span>
          <span :style="{ color: r.last ? 'var(--text)' : 'var(--text-dim)' }" data-testid="muscle-last-row-ago">{{ agoText(r.last) }}</span>
          <span v-if="r.last" class="ml-auto" style="color: var(--text-dim)">{{ ruDate(r.last) }}</span>
        </div>
      </div>

      <div class="mt-4" data-testid="muscle-stats">
        <div class="mb-1 flex flex-wrap items-center gap-2">
          <span class="text-[0.85em] font-semibold">{{ t('workouts_muscles_stats_title') }}</span>
          <span class="ml-auto flex gap-1" role="group" :aria-label="t('workouts_muscles_period_label')">
            <button
              v-for="p in STATS_PERIODS"
              :key="p"
              type="button"
              class="rounded-lg border px-2 py-0.5 text-[0.8em]"
              :style="{
                borderColor: 'var(--border)',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? 'var(--accent-text)' : 'var(--text)',
              }"
              :aria-pressed="period === p"
              :data-testid="'muscle-period-' + p"
              @click="setPeriod(p)"
            >
              {{ p }} {{ t('workouts_muscles_days_suffix') }}
            </button>
          </span>
        </div>
        <p v-if="stats.length === 0" class="m-0 text-[0.85em]" style="color: var(--text-dim)">{{ t('workouts_muscles_stats_empty') }}</p>
        <div v-for="s in stats" :key="s.muscle" class="mb-1 flex items-center gap-2 text-[0.85em]">
          <span class="w-28 shrink-0 truncate">{{ muscleName(s.muscle) }}</span>
          <span class="h-2 rounded" style="background: var(--accent)" :style="{ width: (s.days / maxDays) * 100 + '%', minWidth: '4px' }"></span>
          <span style="color: var(--text-dim)">{{ s.days }} {{ t('workouts_muscles_days_suffix') }}</span>
        </div>
        <p v-if="stats.length && untrained.length" class="m-0 mt-2 text-[0.8em]" style="color: var(--text-dim)" data-testid="muscle-untrained">
          {{ t('workouts_muscles_untrained') }} {{ untrained.map(muscleName).join(', ') }}
        </p>
        <p v-if="unmapped.length" class="m-0 mt-2 text-[0.8em]" style="color: var(--text-dim)" data-testid="muscle-unmapped">
          {{ t('workouts_muscles_unmapped') }} {{ unmapped.map((x) => x.name).join(', ') }}
        </p>
      </div>
    </div>
  </section>
</template>
