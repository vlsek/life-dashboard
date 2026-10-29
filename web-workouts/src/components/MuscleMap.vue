<script setup lang="ts">
import { usuallySkipped } from '../lib/genderTips'
import EmojiText from './EmojiText.vue'
import { computed, nextTick, ref } from 'vue'
import { getLang, t, type DictKey } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { MUSCLE_IDS, referenceFor, ruleForExercise, type MuscleId } from '../lib/muscles'
import type { MuscleShape } from '../lib/muscleShapes'
import { bodyGeometry, type BodyModel } from '../lib/bodyModel'
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
import { groupLastRows, muscleSessions, muscleVolume, trainingStrips, weeklyLoad, type Bucket } from '../lib/muscleHistory'
import { canInlineAdd, todaySetCount } from '../lib/inlineEntry'
import InlineEntryAdd from './InlineEntryAdd.vue'
import type { EntryFormInput, Exercise, WorkoutEntry } from '../lib/types'
import CollapseChevron from './CollapseChevron.vue'
import { capFirst } from '../lib/exerciseNames'
import { useAccordionMember } from '../lib/useCollapseStyle'

// Карта мышц (BACKLOG 3.2, первый срез): зелёные — мышцы, задействованные за последние 4 дня,
// серые — нет. Клик по мышце — её упражнения (свои с кнопкой «Добавить запись» + подсказки из справочника).
// `embedded` — карта лежит в своей вкладке «Карта мышц» (BACKLOG 54.2): заголовок-кнопка не нужна, тело всегда раскрыто, в аккордеон блоков не входит.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today?: string; studyRecent?: boolean; embedded?: boolean; model?: BodyModel; gender?: 'male' | 'female' | null }>()
const emit = defineEmits<{ 'add-entry': [exercise: Exercise]; 'quick-add-entry': [exercise: Exercise, input: EntryFormInput, done: (ok: boolean) => void] }>()

const OPEN_KEY = 'workouts_musclemap_open'
function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}
const open = ref(readOpen())
// «Аккордеон» (BACKLOG 498): раскрыли другой блок страницы (категорию, карту мышц, деревья) — этот сворачивается
const announceOpened = useAccordionMember(
  'block:muscle_map',
  () => !open.value,
  () => {
    open.value = false
    try {
      localStorage.setItem(OPEN_KEY, '0')
    } catch {
      /* состояние блока не критично */
    }
  },
)
function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem(OPEN_KEY, open.value ? '1' : '0')
  } catch {
    /* состояние блока не критично */
  }
  if (open.value) announceOpened()
}

const today = computed(() => props.today ?? todayStr())
const last = computed(() => lastTrainedByMuscle(props.entries, props.exercises, today.value))
const done = computed(() => new Set(MUSCLE_IDS.filter((m) => isTrainedRecently(last.value[m], today.value))))
// «Когда тренировали»: по каждой мышце — сегодня / вчера / N дн. назад (+ дата) или «ещё не тренировали»; давно не тренированные сверху.
const lastRows = computed(() => lastTrainedRows(props.entries, props.exercises, today.value, MUSCLE_IDS))
// BACKLOG 44.5г: группы по «свежести» + полоска последних 14 дней у каждой мышцы; «ещё не тренировали» — свёрнуто одной строкой чипов.
const groups = computed(() => groupLastRows(lastRows.value))
const strips = computed(() => trainingStrips(props.entries, props.exercises, today.value, MUSCLE_IDS))
const showNever = ref(false)
const BUCKET_TITLE: Record<Bucket, DictKey> = { stale: 'workouts_muscles_grp_stale', recent: 'workouts_muscles_grp_recent', fresh: 'workouts_muscles_grp_fresh', never: 'workouts_muscles_grp_never' }
const stripLabel = (m: MuscleId) => t('workouts_muscles_strip_aria').replace('{n}', String(strips.value[m].filter(Boolean).length))
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

type MuscleVisualStyle = 'anatomy' | 'atlas' | 'tech'
const MUSCLE_STYLE_KEY = 'workouts_musclemap_visual_style'
function readMuscleVisualStyle(): MuscleVisualStyle {
  try {
    const value = localStorage.getItem(MUSCLE_STYLE_KEY)
    return value === 'atlas' || value === 'tech' || value === 'anatomy' ? value : 'anatomy'
  } catch {
    return 'anatomy'
  }
}
const visualStyle = ref<MuscleVisualStyle>(readMuscleVisualStyle())
const visualStyles: { key: MuscleVisualStyle; ru: string; en: string; hintRu: string; hintEn: string }[] = [
  { key: 'anatomy', ru: 'Анатомия', en: 'Anatomy', hintRu: 'Плотная заливка · зелёным отмечены недавно задействованные мышцы', hintEn: 'Solid tissue shading · recently trained muscles are highlighted in green' },
  { key: 'atlas', ru: 'Атлас', en: 'Atlas', hintRu: 'Лаконичная схема · контуры важнее заливки', hintEn: 'Minimal atlas · outlines take priority over fills' },
  { key: 'tech', ru: 'Техно', en: 'Tech', hintRu: 'Кибернетическая сетка · контуры и координатные метки', hintEn: 'Cybernetic grid · technical outlines and coordinate marks' },
]
function setVisualStyle(value: MuscleVisualStyle) {
  visualStyle.value = value
  try {
    localStorage.setItem(MUSCLE_STYLE_KEY, value)
  } catch {
    /* оформление не критично */
  }
}
const selected = ref<MuscleId | null>(null)
// «Добавить запись» в блоке «Ваши упражнения» (BACKLOG 44.5ж, срез 2): встроенная строка под упражнением, окно — по «Подробно…» и для Л/П
const addingEx = ref<string | null>(null)
function onAddClick(ex: Exercise) {
  if (canInlineAdd(ex)) addingEx.value = addingEx.value === ex.id ? null : ex.id
  else emit('add-entry', ex)
}
function onInlineSave(ex: Exercise, res: EntryFormInput, done: (ok: boolean) => void) {
  emit('quick-add-entry', ex, res, done) // строка остаётся открытой: подходов обычно несколько
}
function onInlineDetail(ex: Exercise) {
  addingEx.value = null
  emit('add-entry', ex)
}
function select(m: MuscleId) {
  selected.value = selected.value === m ? null : m
  showAllSessions.value = false
  addingEx.value = null
}
// Клик по строке списка (и по чипу «ещё не тренировали») открывает панель ЭТОЙ мышцы — не переключает: повторный клик не закрывает ту, на которую
// пришли из списка. Панель лежит выше списка — подводим к ней, если её не видно (в тестовой среде scrollIntoView нет).
const detailEl = ref<HTMLElement | null>(null)
function pickFromList(m: MuscleId) {
  if (selected.value !== m) select(m)
  void nextTick(() => {
    const el = detailEl.value
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}
// История выбранной мышцы: последние 5 тренировочных дней (+ «показать все») и нагрузка за 7 / 30 дней
const SESSIONS_SHOWN = 5
const showAllSessions = ref(false)
const sessions = computed(() => (selected.value ? muscleSessions(props.entries, props.exercises, today.value, selected.value) : []))
const sessionsShown = computed(() => (showAllSessions.value ? sessions.value : sessions.value.slice(0, SESSIONS_SHOWN)))
// Нагрузка по неделям: подходы за каждые 7 дней, 8 недель (мини-график в панели и текстовая сводка для скринридеров)
const weeks = computed(() => weeklyLoad(sessions.value, today.value))
const weeksMax = computed(() => Math.max(1, ...weeks.value.map((w) => w.sets)))
const weeksSummary = computed(() => t('workouts_muscles_weeks_aria').replace('{list}', weeks.value.map((w) => w.sets).join(', ')))
const volumes = computed(() => [7, 30].map((d) => ({ d, v: muscleVolume(sessions.value, today.value, d) })))
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
  // 58.10: упражнения, которые данному полу обычно не нужны, — в конец списка и с мягкой пометкой (не запрет)
  const list = referenceFor(m)
    .filter((r) => !ownRuleIds.has(r.id))
    .map((r) => ({ name: lang === 'ru' ? r.ru : r.en, skip: usuallySkipped(r.id, props.gender) }))
  return [...list.filter((s) => !s.skip), ...list.filter((s) => s.skip)]
})

const geometry = computed(() => bodyGeometry(props.model ?? 'male'))
const views = computed<{ key: 'front' | 'back'; label: DictKey; shapes: MuscleShape[] }[]>(() => [
  { key: 'front', label: 'workouts_muscles_front', shapes: geometry.value.front },
  { key: 'back', label: 'workouts_muscles_back', shapes: geometry.value.back },
])
function shapeStyle(m: MuscleId) {
  const isDone = done.value.has(m)
  const isSelected = selected.value === m
  if (visualStyle.value === 'atlas') {
    return {
      fill: isSelected ? 'var(--accent)' : isDone ? 'var(--text-dim)' : 'transparent',
      opacity: isSelected ? 0.9 : isDone ? 0.58 : 0.95,
      stroke: isSelected ? 'var(--accent)' : 'var(--text-dim)',
      strokeWidth: isSelected ? 2 : 0.85,
      strokeDasharray: !isDone && !isSelected ? '1.2 0.8' : 'none',
      cursor: 'pointer',
    }
  }
  if (visualStyle.value === 'tech') {
    return {
      fill: isSelected ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--bg)',
      opacity: isSelected ? 0.95 : isDone ? 0.68 : 0.2,
      stroke: isSelected ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--accent)',
      strokeWidth: isSelected ? 2.2 : 0.75,
      strokeDasharray: !isDone && !isSelected ? '1.2 0.8' : 'none',
      cursor: 'pointer',
    }
  }
  return {
    fill: isSelected ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--text-dim)',
    opacity: isSelected ? 0.98 : isDone ? 0.88 : 0.24,
    stroke: isSelected ? 'var(--accent)' : 'var(--border)',
    strokeWidth: isSelected ? 2 : 0.55,
    strokeDasharray: !isDone && !isSelected ? '1.2 0.8' : 'none',
    cursor: 'pointer',
  }
}
</script>

<template>
  <section class="mb-4 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="muscle-map">
    <div
      v-if="!embedded"
      class="collapse-head flex items-center gap-2"
      role="button"
      tabindex="0"
      data-testid="muscle-map-toggle"
      :aria-expanded="open"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <h3 class="m-0 font-bold"><EmojiText :text="t('workouts_muscles_title')" /></h3>
      <CollapseChevron :collapsed="!open" />
    </div>

    <div v-if="embedded || open" :class="embedded ? '' : 'mt-3'" data-testid="muscle-map-body">
      <p class="m-0 mb-3 text-[0.85em]" style="color: var(--text-dim)">{{ t('workouts_muscles_hint') }}</p>

      <div class="muscle-style-picker mb-3" role="group" :aria-label="getLang() === 'ru' ? 'Стиль карты мышц' : 'Muscle map style'" data-testid="muscle-style-picker">
        <button
          v-for="style in visualStyles"
          :key="style.key"
          type="button"
          class="muscle-style-option"
          :class="{ 'is-active': visualStyle === style.key }"
          :aria-pressed="visualStyle === style.key"
          :data-style="style.key"
          @click="setVisualStyle(style.key)"
        >
          <span class="muscle-style-preview" :class="'preview-' + style.key" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>{{ getLang() === 'ru' ? style.ru : style.en }}</span>
        </button>
      </div>
      <p class="muscle-style-caption mb-3 text-center text-[0.75em]" style="color: var(--text-dim)">
        {{ getLang() === 'ru' ? visualStyles.find(s => s.key === visualStyle)?.hintRu : visualStyles.find(s => s.key === visualStyle)?.hintEn }}
      </p>

      <div class="flex flex-wrap justify-center gap-4">
        <figure v-for="v in views" :key="v.key" class="m-0 text-center">
          <svg viewBox="0 0 100 190" :class="['muscle-map-svg', 'muscle-map-svg--' + visualStyle]" :data-visual-style="visualStyle" class="h-64 w-32" role="group" :aria-label="t(v.label)">
            <circle :cx="geometry.head.cx" :cy="geometry.head.cy" :r="geometry.head.r" :fill="props.studyRecent ? 'var(--success)' : 'none'" :fill-opacity="props.studyRecent ? 0.9 : 1" :stroke="props.studyRecent ? 'var(--success)' : 'var(--border)'" stroke-width="1.2" data-testid="muscle-head" />
            <path
              :d="geometry.outline"
              fill="none"
              stroke="var(--border)"
              stroke-width="1.2"
              stroke-linejoin="round"
              data-testid="body-outline"
            />
            <g v-if="visualStyle === 'tech'" aria-hidden="true" class="muscle-tech-overlay" pointer-events="none">
              <path d="M12 43H88 M12 55H88 M12 67H88 M12 79H88 M12 91H88 M12 103H88 M12 115H88 M12 127H88 M12 139H88 M12 151H88" fill="none" stroke="var(--accent)" stroke-width="0.35" stroke-dasharray="1 2" opacity="0.42" />
              <path d="M8 44V36H16 M84 36H92V44 M8 150V158H16 M84 158H92V150" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.8" />
              <circle cx="50" cy="29" r="2" fill="none" stroke="var(--accent)" stroke-width="0.7" />
              <path d="M46 29H42 M54 29H58 M50 25V22 M50 33V36" stroke="var(--accent)" stroke-width="0.6" opacity="0.85" />
            </g>
            <path v-if="v.key === 'back'" d="M50 35 L50 112" fill="none" stroke="var(--border)" stroke-width="0.7" stroke-dasharray="2 3" opacity="0.65" />
            <g
              v-for="(s, i) in v.shapes"
              :key="v.key + i"
              :data-muscle="s.muscle"
              :data-state="done.has(s.muscle) ? 'done' : 'idle'"
              :data-selected="selected === s.muscle"
              role="button"
              tabindex="0"
              :aria-pressed="selected === s.muscle"
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

      <div class="mt-2 flex flex-wrap justify-center gap-4 text-[0.8em]" style="color: var(--text-dim)" data-testid="muscle-map-legend">
        <span class="inline-flex items-center gap-1.5"><span class="muscle-legend-mark muscle-legend-mark--done" aria-hidden="true"></span> {{ t('workouts_muscles_legend_done') }}</span>
        <span class="inline-flex items-center gap-1.5"><span class="muscle-legend-mark muscle-legend-mark--idle" aria-hidden="true"></span> {{ t('workouts_muscles_legend_idle') }}</span>
      </div>

      <div v-if="selected" class="mt-3 rounded-lg border p-3 text-sm" style="border-color: var(--border); background: var(--bg)" data-testid="muscle-detail" ref="detailEl">
        <div class="font-bold">{{ muscleName(selected) }}</div>
        <div class="mb-2 text-[0.85em]" style="color: var(--text-dim)">
          {{ t('workouts_muscles_last') }}
          <template v-if="last[selected]"><span data-testid="muscle-last-ago">{{ agoText(last[selected]) }}</span> ({{ ruDate(last[selected] as string) }})</template>
          <template v-else>{{ t('workouts_muscles_never') }}</template>
        </div>

        <template v-if="sessions.length">
          <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_volume_title') }}</div>
          <div class="mb-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.85em]" style="color: var(--text-dim)" data-testid="muscle-volume">
            <span v-for="x in volumes" :key="x.d" :data-window="x.d">{{ x.d }} {{ t('workouts_muscles_days_suffix') }} — {{ t('workouts_muscles_vol_days') }}: {{ x.v.days }} · {{ t('workouts_muscles_vol_sets') }}: {{ x.v.sets }} · {{ t('workouts_muscles_vol_reps') }}: {{ x.v.reps }}</span>
          </div>
          <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_weeks_title') }}</div>
          <div class="mb-2" data-testid="muscle-weeks" role="img" :aria-label="weeksSummary">
            <div class="flex h-14 items-end gap-1">
              <div v-for="(w, i) in weeks" :key="w.to" class="flex h-full flex-1 flex-col justify-end" :title="w.from + ' – ' + w.to + ': ' + w.sets" data-testid="muscle-week" :data-sets="w.sets" :data-current="i === weeks.length - 1">
                <div class="rounded-sm" :style="{ height: w.sets ? Math.max(8, Math.round((w.sets / weeksMax) * 100)) + '%' : '2px', background: w.sets ? (i === weeks.length - 1 ? 'var(--success)' : 'var(--accent)') : 'var(--border)', opacity: w.sets ? 1 : 0.6 }"></div>
              </div>
            </div>
            <div class="mt-0.5 flex justify-between text-[0.7em]" style="color: var(--text-dim)"><span>{{ t('workouts_muscles_weeks_ago').replace('{n}', String(weeks.length - 1)) }}</span><span>{{ t('workouts_muscles_weeks_now') }}</span></div>
          </div>
          <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_sessions_title') }}</div>
          <ul class="m-0 mb-1 list-none p-0 text-[0.85em]" data-testid="muscle-sessions">
            <li v-for="s in sessionsShown" :key="s.date" class="flex items-baseline gap-2 py-0.5" data-testid="muscle-session">
              <span class="shrink-0" style="color: var(--text-dim)">{{ ruDate(s.date) }}</span>
              <span class="min-w-0 flex-1 truncate">{{ s.exercises.join(', ') }}</span>
              <span class="shrink-0" style="color: var(--text-dim)">{{ s.sets }} {{ t('workouts_muscles_sets_short') }}</span>
            </li>
          </ul>
          <button v-if="sessions.length > SESSIONS_SHOWN" type="button" class="never-toggle mb-2 text-[0.8em]" data-testid="muscle-sessions-more" @click="showAllSessions = !showAllSessions">
            {{ showAllSessions ? t('workouts_muscles_sessions_less') : t('workouts_muscles_sessions_more').replace('{n}', String(sessions.length)) }}
          </button>
        </template>

        <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_my_ex') }}</div>
        <p v-if="ownExercises.length === 0" class="m-0 mb-2 text-[0.85em]" style="color: var(--text-dim)">{{ t('workouts_muscles_no_own') }}</p>
        <ul v-else class="m-0 mb-2 list-none p-0">
          <li v-for="ex in ownExercises" :key="ex.id" class="py-1">
            <div class="flex items-center justify-between gap-2">
              <span>{{ capFirst(ex.name) }}</span>
              <button
                type="button"
                class="rounded-lg border px-2 py-1 text-[0.8em]"
                style="border-color: var(--border); color: var(--text)"
                data-testid="muscle-add-entry"
                :aria-expanded="canInlineAdd(ex) ? addingEx === ex.id : undefined"
                @click="onAddClick(ex)"
              >
                {{ t('workouts_muscles_add_entry') }}
              </button>
            </div>
            <InlineEntryAdd v-if="addingEx === ex.id" class="mt-1.5" :exercise="ex" :today-sets="todaySetCount(entries, ex.id, today)" @save="(res, done) => onInlineSave(ex, res, done)" @detail="onInlineDetail(ex)" @cancel="addingEx = null" />
          </li>
        </ul>

        <template v-if="suggestions.length">
          <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_suggest') }}</div>
          <ul class="m-0 list-disc pl-5" style="color: var(--text-dim)" data-testid="muscle-suggestions">
            <li v-for="s in suggestions" :key="s.name" :data-skip="s.skip ? '1' : undefined">{{ s.name }}<span v-if="s.skip" class="text-[0.85em]" data-testid="muscle-suggest-skip"> — {{ t('workouts_muscles_usually_skip') }}</span></li>
          </ul>
        </template>
      </div>

      <div class="mt-4" data-testid="muscle-last-list">
        <div class="mb-1 text-[0.85em] font-semibold">{{ t('workouts_muscles_when_title') }}</div>
        <template v-for="g in groups" :key="g.bucket">
          <!-- «Ещё не тренировали» — одной свёрнутой строкой: не засоряет список мышцами без записей -->
          <div v-if="g.bucket === 'never'" class="mt-2" :data-bucket="g.bucket">
            <button type="button" class="never-toggle text-[0.8em]" :aria-expanded="showNever" data-testid="muscle-never-toggle" @click="showNever = !showNever">
              {{ t(BUCKET_TITLE.never) }} ({{ g.rows.length }}) <span aria-hidden="true">{{ showNever ? '▴' : '▾' }}</span>
            </button>
            <div v-show="showNever" class="mt-1 flex flex-wrap gap-1.5" data-testid="muscle-never-list">
              <button v-for="r in g.rows" :key="r.muscle" type="button" :data-muscle="r.muscle" class="chip-pick rounded-full border px-2 py-0.5 text-[0.8em]" :aria-pressed="selected === r.muscle" data-testid="muscle-chip" @click="pickFromList(r.muscle)">{{ muscleName(r.muscle) }}</button>
            </div>
          </div>
          <div v-else class="mt-2" :data-bucket="g.bucket">
            <div class="text-[0.75em] font-semibold uppercase tracking-wide" style="color: var(--text-dim)" data-testid="muscle-bucket-title">{{ t(BUCKET_TITLE[g.bucket]) }}</div>
            <div v-for="r in g.rows" :key="r.muscle" class="row-pick flex items-center gap-2 py-0.5 text-[0.85em]" :data-muscle="r.muscle" role="button" tabindex="0" :aria-pressed="selected === r.muscle" :aria-label="muscleName(r.muscle)" data-testid="muscle-row" @click="pickFromList(r.muscle)" @keydown.enter.prevent="pickFromList(r.muscle)" @keydown.space.prevent="pickFromList(r.muscle)">
              <span class="w-28 shrink-0 truncate">{{ muscleName(r.muscle) }}</span>
              <span class="flex shrink-0 gap-px" role="img" :aria-label="stripLabel(r.muscle)" data-testid="muscle-strip">
                <span v-for="(on, i) in strips[r.muscle]" :key="i" class="inline-block h-3 w-1.5 rounded-sm" :style="{ background: on ? 'var(--success)' : 'var(--border)', opacity: on ? 1 : 0.6 }" :data-on="on"></span>
              </span>
              <span class="ml-auto whitespace-nowrap" style="color: var(--text)" data-testid="muscle-last-row-ago">{{ agoText(r.last) }}</span>
              <span class="whitespace-nowrap" style="color: var(--text-dim)">{{ ruDate(r.last as string) }}</span>
            </div>
          </div>
        </template>
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
                borderColor: 'var(--accent)', // BACKLOG 48.8: рамки выбора периода — акцент темы, как у графиков
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

<style scoped>
.muscle-style-picker {
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}
.muscle-style-option {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 40px;
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--bg);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.8rem;
  transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease;
}
.muscle-style-option:hover {
  border-color: var(--accent);
  color: var(--text);
}
.muscle-style-option.is-active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--bg));
  color: var(--text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
}
.muscle-style-option:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.muscle-style-preview {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: 20px;
  height: 22px;
  justify-content: center;
}
.muscle-style-preview i {
  display: block;
  width: 4px;
  height: 13px;
  border-radius: 3px;
  background: var(--text-dim);
}
.preview-anatomy i:first-child { height: 9px; background: var(--success); }
.preview-anatomy i:nth-child(2) { height: 17px; background: var(--success); }
.preview-anatomy i:last-child { height: 12px; background: var(--text-dim); }
.preview-atlas i { background: transparent; border: 1px solid var(--text-dim); }
.preview-atlas i:nth-child(2) { height: 17px; border-color: var(--accent); }
.preview-tech i { border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 28%, transparent); }
.preview-tech i:nth-child(2) { height: 18px; box-shadow: 0 0 5px color-mix(in srgb, var(--accent) 50%, transparent); }
.muscle-map-svg {
  max-width: 100%;
  overflow: visible;
}
.muscle-legend-mark {
  display: inline-block;
  width: 1.15rem;
  height: 0;
  border-top-width: 2px;
}
.muscle-legend-mark--done {
  border-top-style: solid;
  border-color: var(--success);
}
.muscle-legend-mark--idle {
  border-top-style: dashed;
  border-color: var(--text-dim);
}
.muscle-map-svg--anatomy [data-muscle]:hover,
.muscle-map-svg--anatomy [data-muscle]:focus-visible {
  filter: drop-shadow(0 0 2px var(--success));
}
.muscle-map-svg--atlas [data-muscle]:hover,
.muscle-map-svg--atlas [data-muscle]:focus-visible {
  filter: drop-shadow(0 0 1px var(--accent));
}
.muscle-map-svg--anatomy {
  background: radial-gradient(ellipse at 50% 48%, color-mix(in srgb, var(--success) 7%, transparent), transparent 68%);
  border-radius: 1rem;
}
.muscle-map-svg--anatomy [data-muscle][data-state='done'] {
  filter: drop-shadow(0 0 1.2px color-mix(in srgb, var(--success) 55%, transparent));
}
.muscle-map-svg--atlas {
  background: color-mix(in srgb, var(--bg-card) 70%, transparent);
  border-radius: 0.4rem;
}
.muscle-map-svg--atlas [data-muscle] {
  stroke-linejoin: round;
}
.muscle-map-svg--tech {
  background-image: linear-gradient(135deg, color-mix(in srgb, var(--accent) 7%, transparent), transparent 60%);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  border-radius: 0.65rem;
}
.muscle-map-svg--tech [data-muscle] {
  filter: drop-shadow(0 0 1px color-mix(in srgb, var(--accent) 30%, transparent));
  stroke-linejoin: bevel;
}
.muscle-map-svg--tech [data-muscle] > * {
  vector-effect: non-scaling-stroke;
}
.muscle-map-svg--tech .muscle-tech-overlay {
  opacity: 0.9;
}
.muscle-map-svg--tech [data-muscle]:hover,
.muscle-map-svg--tech [data-muscle]:focus-visible {
  filter: drop-shadow(0 0 3px var(--accent));
}
@media (prefers-reduced-motion: reduce) {
  .muscle-style-option { transition: none; }
}
.row-pick {
  cursor: pointer;
  border-radius: 6px;
}
.row-pick:hover {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.row-pick:focus-visible,
.chip-pick:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.chip-pick {
  background: transparent;
  cursor: pointer;
  color: var(--text-dim);
}
.chip-pick[aria-pressed='true'] {
  border-color: var(--accent);
  color: var(--text);
}
/* Кнопка-ссылка «показать / скрыть»: сброс системного вида кнопки, фокус виден */
.never-toggle {
  all: unset;
  display: inline-block;
  margin-bottom: 0.5rem;
  font-size: 0.8em;
  cursor: pointer;
  color: var(--text-dim);
  text-decoration: underline dotted;
}
.never-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
