<script setup lang="ts">
import { capFirst } from '../lib/exerciseNames'
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { fmtRu, todayStr } from '../lib/date'
import { setCount } from '../lib/quickSet'
import { canInlineAdd } from '../lib/inlineEntry'
import InlineEntryAdd from './InlineEntryAdd.vue'
import { bestPaceRecord, bestSetRecord, formatSets } from '../lib/workouts'
import { defaultWeightUnit } from '../lib/weightUnit'
import { estimateExerciseCalories, hasCalorieActivity, validWeightKg } from '../lib/calories'
import Icon from './Icon.vue'
import ExerciseChart from './ExerciseChart.vue'
import { readExerciseCollapsed, writeExerciseCollapsed } from '../lib/exerciseCollapse'
import { useAccordionMember } from '../lib/useCollapseStyle'
import type { EntryFormInput, Exercise, WorkoutEntry } from '../lib/types'
import { plannedSetsOn, setsOfDay, totalReps, type LinkedMetric } from '../lib/metricLink'
import SetsRing from './SetsRing.vue'
import CollapseChevron from './CollapseChevron.vue'
import CollapseSummary from './CollapseSummary.vue'
import { vCollapse } from '../lib/collapseMotion'
import EmojiText from './EmojiText.vue'

// Порт renderExerciseCard() из workouts.js — заголовок с кнопками, рекомендованная схема,
// личные рекорды (по сторонам для билатеральных), мини-график прогресса, таблица записей.
const props = defineProps<{ exercise: Exercise; entries: WorkoutEntry[]; busyEntryId?: string | null; bodyWeightKg?: number | null; linkedMetrics?: LinkedMetric[]; linkSupported?: boolean }>()
const emit = defineEmits<{
  addEntry: []
  quickAddEntry: [EntryFormInput, (ok: boolean) => void]
  editExercise: []
  linkMetric: []
  deleteExercise: []
  editEntry: [WorkoutEntry]
  deleteEntry: [WorkoutEntry]
  addSet: [WorkoutEntry]
  removeLastSet: [WorkoutEntry]
}>()

interface RecordLine {
  icon: string
  label: string
  text: string
  date: string
}

const records = computed<RecordLine[]>(() => {
  const ex = props.exercise
  const perHour = t('workouts_per_hour')
  const durUnit = t('workouts_duration_unit')
  const unitFallback = defaultWeightUnit()
  const out: RecordLine[] = []
  const push = (icon: string, label: string, r: { text: string; date: string } | null) => {
    if (r) out.push({ icon, label, text: r.text, date: r.date })
  }
  if (ex.bilateral) {
    for (const side of ['L', 'R'] as const) {
      const sideLabel = t(side === 'L' ? 'workouts_side_L' : 'workouts_side_R')
      push('trophy', `${sideLabel}: ${t('workouts_record_label')}`, bestSetRecord(props.entries, ex, unitFallback, side))
      push('zap', `${sideLabel}: ${t('workouts_record_pace_label')}`, bestPaceRecord(props.entries, ex, perHour, durUnit, side))
    }
  } else {
    push('trophy', t('workouts_record_label'), bestSetRecord(props.entries, ex, unitFallback))
    push('zap', t('workouts_record_pace_label'), bestPaceRecord(props.entries, ex, perHour, durUnit))
  }
  return out
})

// Связь с метриками дня (миграция 054): строка «В метриках дня · сегодня: X [из N]» — подходы вводятся один раз, здесь.
const todayTotal = computed(() => totalReps(setsOfDay(props.entries, props.exercise.id, todayStr())))
// Кольцо подходов: есть связанная метрика с планом «N подходов в день» (с учётом даты) — показываем сделано/N.
const setsToday = computed(() => setsOfDay(props.entries, props.exercise.id, todayStr()).length)
const plannedToday = computed(() => {
  const m = props.linkedMetrics?.[0]
  return m ? plannedSetsOn(m.planned_sets_log, todayStr()) : null
})
const metricChip = computed(() => {
  const m = props.linkedMetrics?.[0]
  if (!m) return null
  const goal = m.goal_value
  return (goal ? t('workouts_ml_chip_goal').replace('{goal}', String(goal)) : t('workouts_ml_chip')).replace('{n}', String(todayTotal.value))
})

// Свёрнутое упражнение показывает только заголовок с кнопками; состояние помним по id.
const collapsed = ref(readExerciseCollapsed(props.exercise.id))
// «Аккордеон» (BACKLOG 498): раскрыли другое упражнение ТОЙ ЖЕ категории — это сворачивается (категория при этом остаётся раскрытой: у упражнений своя группа).
const announceOpened = useAccordionMember(
  'ex:' + props.exercise.id,
  () => collapsed.value,
  () => {
    collapsed.value = true
    writeExerciseCollapsed(props.exercise.id, true)
  },
  'ex:' + (props.exercise.category?.trim() || ''),
)
function toggleCollapsed() {
  collapsed.value = !collapsed.value
  writeExerciseCollapsed(props.exercise.id, collapsed.value)
  if (!collapsed.value) announceOpened()
}

// «+ подход» / «− подход» прямо в таблице (BACKLOG 590): только у сегодняшней записи, у которой уже есть первый подход
const today = todayStr()
const canQuick = (e: WorkoutEntry) => e.date === today && (e.sets?.length ?? 0) > 0
const canRemove = (e: WorkoutEntry) => setCount(e.sets ?? []) > 1

// «Добавить запись» (BACKLOG 44.5ж): у обычных упражнений раскрывает встроенную строку в карточке, окно — по «Подробно…»;
// у упражнений с Л/П (пара ячеек) сразу окно, как раньше.
const adding = ref(false)
function onAddClick() {
  if (canInlineAdd(props.exercise)) adding.value = !adding.value
  else emit('addEntry')
}
function onInlineSave(res: EntryFormInput, done: (ok: boolean) => void) {
  emit('quickAddEntry', res, (ok) => {
    if (ok) adding.value = false
    done(ok)
  })
}
function onInlineDetail() {
  adding.value = false
  emit('addEntry')
}

const sortedEntries = computed(() => props.entries.slice().sort((a, b) => b.date.localeCompare(a.date)))
const calories = computed(() => estimateExerciseCalories(props.entries, props.exercise, props.bodyWeightKg))
// Есть что считать, но вес не задан в метриках тела — вместо выдуманного числа показываем подсказку.
const needsWeight = computed(() => !validWeightKg(props.bodyWeightKg) && hasCalorieActivity(props.entries))
// «Карточка со сводкой» (BACKLOG 498 срез 3): у свёрнутого упражнения — его первый рекорд («Рекорд 8 × 80 кг»); без записей плашки нет
const collapsedSummary = computed(() => {
  const r = records.value[0]
  return r ? `${r.label} ${r.text}` : ''
})
</script>

<template>
  <div class="mb-3.5 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)">
    <div class="mb-0.5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-lg border px-1.5 py-1 leading-none"
        style="border-color: var(--border); color: var(--text)"
        data-testid="exercise-toggle"
        :title="collapsed ? t('dash_expand_btn') : t('dash_collapse_btn')"
        :aria-expanded="!collapsed"
        @click="toggleCollapsed"
      >
        <CollapseChevron :collapsed="collapsed" />
      </button>
      <h3 class="m-0 flex-1 font-bold">{{ capFirst(exercise.name) }}</h3>
      <CollapseSummary :text="collapsedSummary" :collapsed="collapsed" />
      <span v-if="calories" class="rounded-full border px-2 py-1 text-xs" style="border-color: var(--border); color: var(--text-dim)" data-testid="exercise-calories">
        🔥 ≈ {{ calories.kcal }} {{ t('workouts_kcal') }}
      </span>
      <span v-else-if="needsWeight" class="rounded-full border px-2 py-1 text-xs" style="border-color: var(--border); color: var(--text-dim)" data-testid="exercise-calories-need-weight">
        🔥 {{ t('workouts_kcal_need_weight') }}
      </span>
      <button
        type="button"
        class="rounded-lg border px-3 py-1.5 text-sm"
        style="border-color: var(--border); background: var(--bg); color: var(--text)"
        :aria-expanded="canInlineAdd(exercise) ? adding : undefined"
        data-testid="exercise-add-entry"
        @click="onAddClick"
      >
        <EmojiText :text="t('workouts_add_entry_btn')" />
      </button>
      <button
        v-if="linkSupported"
        type="button"
        class="rounded-lg border px-2.5 py-1.5"
        style="border-color: var(--border); color: var(--text)"
        :title="t('workouts_ml_btn_title')"
        :aria-label="t('workouts_ml_btn_title')"
        data-testid="exercise-link-metric"
        @click="emit('linkMetric')"
      >
        <Icon name="link" />
      </button>
      <button type="button" class="rounded-lg border px-2.5 py-1.5" style="border-color: var(--border); color: var(--text)" @click="emit('editExercise')">
        <Icon name="edit" />
      </button>
      <button type="button" class="rounded-lg border px-2.5 py-1.5" style="border-color: var(--border); color: var(--danger, #e05555)" @click="emit('deleteExercise')">
        <Icon name="trash" />
      </button>
    </div>

    <InlineEntryAdd v-if="adding" :exercise="exercise" @save="onInlineSave" @detail="onInlineDetail" @cancel="adding = false" />

    <div v-if="metricChip" class="mb-2 flex items-center gap-2 text-[0.85em]" style="color: var(--text-dim)" data-testid="exercise-metric-chip">
      <SetsRing v-if="plannedToday" :done="setsToday" :planned="plannedToday" />
      <EmojiText :text="metricChip" />
    </div>

    <div v-collapse="!collapsed" data-testid="exercise-body">
    <div v-if="exercise.suggested_scheme" class="mb-2 text-[0.85em]" style="color: var(--text-dim)">
      {{ t('workouts_suggested_scheme_label') }} {{ exercise.suggested_scheme }}
    </div>

    <div v-for="(r, i) in records" :key="i" class="mb-1.5 flex items-center gap-1.5 text-[0.85em]" style="color: var(--text-dim)">
      <Icon :name="r.icon" extra-style="color:#e0a93b; flex-shrink:0;" />
      {{ r.label }} {{ r.text }} <span style="opacity: 0.7">· {{ fmtRu(r.date) }}</span>
    </div>

    <ExerciseChart :exercise="exercise" :entries="entries" />

    <p v-if="entries.length === 0" class="mt-2 text-sm" style="color: var(--text-dim)">{{ t('workouts_no_entries') }}</p>
    <div v-else class="mt-2 overflow-x-auto">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="e in sortedEntries" :key="e.id" class="border-b last:border-0" style="border-color: var(--border)">
            <td class="whitespace-nowrap py-1.5 pr-3 align-top">{{ fmtRu(e.date) }}</td>
            <td class="py-1.5 pr-3 align-top">
              {{ formatSets(e.sets, exercise, t('workouts_per_hour'), t('workouts_duration_unit'), defaultWeightUnit()) }}
              <div v-if="canQuick(e)" class="mt-1 flex gap-1.5" data-testid="quick-set-row">
                <button
                  type="button"
                  class="rounded-lg border px-2.5 py-1 text-xs"
                  style="border-color: var(--border); background: var(--bg); color: var(--text)"
                  :disabled="busyEntryId === e.id"
                  :aria-label="t('workouts_quick_add_set_aria')"
                  data-testid="quick-add-set"
                  @click="emit('addSet', e)"
                >
                  {{ t('workouts_quick_add_set') }}
                </button>
                <button
                  v-if="canRemove(e)"
                  type="button"
                  class="rounded-lg border px-2.5 py-1 text-xs"
                  style="border-color: var(--border); background: var(--bg); color: var(--text-dim)"
                  :disabled="busyEntryId === e.id"
                  :aria-label="t('workouts_quick_remove_set_aria')"
                  data-testid="quick-remove-set"
                  @click="emit('removeLastSet', e)"
                >
                  {{ t('workouts_quick_remove_set') }}
                </button>
              </div>
            </td>
            <td class="py-1.5 pr-3 align-top" style="color: var(--text-dim)">{{ e.notes || '' }}</td>
            <td class="whitespace-nowrap py-1.5 text-right align-top">
              <button type="button" class="mr-1 rounded p-1" style="color: var(--text-dim)" @click="emit('editEntry', e)">
                <Icon name="edit" />
              </button>
              <button type="button" class="rounded p-1" style="color: var(--danger, #e05555)" @click="emit('deleteEntry', e)">
                <Icon name="trash" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </div>
  </div>
</template>
