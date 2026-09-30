<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWorkouts } from './lib/useWorkouts'
import { isKnownCategory, sortCategoryKeys } from './lib/workouts'
import { readWarmupDismissed, shouldShowWarmup, writeWarmupDismissed } from './lib/warmup'
import { todayStr } from './lib/date'
import { t } from './lib/i18n'
import { showToast } from './lib/toast'
import AppShell from './components/AppShell.vue'
import ExerciseCard from './components/ExerciseCard.vue'
import WarmupReminder from './components/WarmupReminder.vue'
import OverviewChart from './components/OverviewChart.vue'
import MuscleMap from './components/MuscleMap.vue'
import ProgressionTrees from './components/ProgressionTrees.vue'
import ExerciseForm from './components/ExerciseForm.vue'
import EntryForm from './components/EntryForm.vue'
import TemplatesModal from './components/TemplatesModal.vue'
import Toast from './components/Toast.vue'
import type { EntryFormInput, Exercise, ExerciseFormInput, WorkoutEntry, WorkoutTemplate } from './lib/types'
import CollapseChevron from './components/CollapseChevron.vue'
import { vCollapse } from './lib/collapseMotion'

// Порт workouts.js/html целиком: CRUD упражнений и записей (подходы), личные рекорды,
// группировка по категориям со сворачиванием, каталог типовых программ, мини-график прогресса
// на каждом упражнении (ExerciseChart в ExerciseCard) и общий график объёма тренировок.
const wk = useWorkouts()
const { auth, exercises, entries, loadError, entriesFor } = wk

const defaultUnit = () => t('workouts_default_unit')
const defaultValueLabel = () => t('workouts_default_value_label')

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
// Порт showExerciseSaveError(): подсказка про миграции 027/028, если ошибка про эти поля.
function saveErrorText(e: unknown): string {
  const m = errMsg(e)
  const hint = /tracks_duration/i.test(m)
    ? ' — ' + t('workouts_duration_migration_hint')
    : /bilateral/i.test(m)
      ? ' — ' + t('workouts_bilateral_migration_hint')
      : ''
  return t('workouts_toast_save_error') + m + hint
}

// ---- группировка по категориям ----
function categoryLabel(key: string): string {
  if (key === '') return t('workouts_uncategorized')
  if (isKnownCategory(key)) return t(('workouts_cat_' + key) as 'workouts_cat_upper')
  return key
}
const groups = computed(() => {
  const map = new Map<string, Exercise[]>()
  for (const ex of exercises.value) {
    const key = ex.category?.trim() || ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ex)
  }
  return sortCategoryKeys([...map.keys()], categoryLabel).map((key) => ({ key, label: categoryLabel(key), items: map.get(key)! }))
})

// Состояние свёрнуто/развёрнуто запоминается по каждой категории отдельно (как в оригинале).
const collapsed = ref<Record<string, boolean>>({})
function lsKey(key: string) {
  return 'workouts_collapsed:' + (key || 'uncategorized')
}
function isCollapsed(key: string): boolean {
  if (!(key in collapsed.value)) {
    try {
      collapsed.value[key] = localStorage.getItem(lsKey(key)) === '1'
    } catch {
      collapsed.value[key] = false
    }
  }
  return collapsed.value[key]
}
function toggleCollapsed(key: string) {
  const next = !isCollapsed(key)
  collapsed.value[key] = next
  try {
    localStorage.setItem(lsKey(key), next ? '1' : '0')
  } catch {
    /* ignore */
  }
}

// ---- напоминание о разминке ----
const warmupDismissedOn = ref<string | null>(readWarmupDismissed())
const showWarmup = computed(() =>
  shouldShowWarmup({
    hasExercises: exercises.value.length > 0,
    entries: entries.value,
    dismissedOn: warmupDismissedOn.value,
    today: todayStr(),
  }),
)
function dismissWarmup() {
  const day = todayStr()
  warmupDismissedOn.value = day
  writeWarmupDismissed(day)
}

// ---- формы ----
const exerciseForm = ref<{ existing: Exercise | null } | null>(null)
const entryForm = ref<{ exercise: Exercise; existing: WorkoutEntry | null } | null>(null)
const templatesOpen = ref(false)

async function onSaveExercise(res: ExerciseFormInput) {
  if (auth.value.status !== 'ready' || !exerciseForm.value) return
  const existing = exerciseForm.value.existing
  try {
    if (existing) await wk.editExercise(existing, res, defaultUnit(), defaultValueLabel())
    else await wk.addExercise(auth.value.userId, res, defaultUnit(), defaultValueLabel())
    exerciseForm.value = null
  } catch (e) {
    showToast(saveErrorText(e), 'error')
    console.error(e)
  }
}

async function onDeleteExercise(ex: Exercise) {
  if (!confirm(t('workouts_confirm_delete_exercise').replace('{name}', ex.name))) return
  try {
    await wk.deleteExercise(ex.id)
  } catch (e) {
    showToast(t('workouts_toast_save_error') + errMsg(e), 'error')
    console.error(e)
  }
}

async function onSaveEntry(res: EntryFormInput) {
  if (auth.value.status !== 'ready' || !entryForm.value) return
  const { exercise, existing } = entryForm.value
  try {
    if (existing) await wk.editEntry(existing.id, res)
    else await wk.addEntry(exercise.id, auth.value.userId, res)
    entryForm.value = null
    showToast(t('workouts_toast_saved'))
  } catch (e) {
    showToast(t('workouts_toast_save_error') + errMsg(e), 'error')
    console.error(e)
  }
}

async function onDeleteEntry(entry: WorkoutEntry) {
  if (!confirm(t('workouts_confirm_delete_entry'))) return
  try {
    await wk.deleteEntry(entry.id)
  } catch (e) {
    showToast(t('workouts_toast_save_error') + errMsg(e), 'error')
    console.error(e)
  }
}

async function onApplyTemplate(tpl: WorkoutTemplate) {
  if (auth.value.status !== 'ready') return
  const rows = tpl.days.flatMap((day) =>
    day.exercises.map((ex) => ({
      name: ex.name,
      category: day.label,
      tracksWeight: ex.tracksWeight,
      valueLabel: ex.valueLabel,
      scheme: ex.scheme,
      defaultUnit: defaultUnit(),
    })),
  )
  try {
    const added = await wk.applyTemplateExercises(auth.value.userId, rows)
    templatesOpen.value = false
    if (added === 0) showToast(t('workouts_templates_all_exist'))
    else showToast(t('workouts_templates_applied_toast').replace('{n}', String(added)))
  } catch (e) {
    showToast(t('workouts_toast_save_error') + errMsg(e), 'error')
    console.error(e)
  }
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <main class="mx-auto max-w-3xl px-4 pb-16 pt-6">
    <h1 class="mb-3 text-xl font-bold">{{ t('workouts_h1') }}</h1>

    <div class="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium"
        style="background: var(--accent); color: var(--accent-text)"
        @click="exerciseForm = { existing: null }"
      >
        {{ t('workouts_add_exercise_btn') }}
      </button>
      <button
        type="button"
        class="rounded-lg border px-4 py-2 text-sm"
        style="border-color: var(--border); background: var(--bg-card); color: var(--text)"
        @click="templatesOpen = true"
      >
        {{ t('workouts_templates_btn') }}
      </button>
    </div>

    <div v-if="auth.status === 'loading' || auth.status === 'redirecting'" class="text-sm" style="color: var(--text-dim)">
      {{ t('workouts_loading') }}
    </div>

    <template v-else>
      <p v-if="loadError" class="text-sm" style="color: var(--text-dim)">
        {{ t('workouts_toast_save_error') }}{{ loadError }} — {{ t('workouts_migration_hint') }}
      </p>
      <p v-else-if="exercises.length === 0" class="text-sm" style="color: var(--text-dim)">{{ t('workouts_empty') }}</p>

      <WarmupReminder v-if="showWarmup" @dismiss="dismissWarmup" />

      <OverviewChart :entries="entries" />

      <MuscleMap
        v-if="exercises.length > 0"
        :entries="entries"
        :exercises="exercises"
        @add-entry="(ex) => (entryForm = { exercise: ex, existing: null })"
      />

      <ProgressionTrees
        v-if="exercises.length > 0"
        :entries="entries"
        :exercises="exercises"
        @add-entry="(ex) => (entryForm = { exercise: ex, existing: null })"
      />

      <section v-for="g in groups" :key="g.key">
        <div
          class="collapse-head mb-2.5 mt-6 flex items-center gap-2"
          role="button"
          tabindex="0"
          data-testid="group-toggle"
          :aria-expanded="!isCollapsed(g.key)"
          :title="isCollapsed(g.key) ? t('dash_expand_btn') : t('dash_collapse_btn')"
          @click="toggleCollapsed(g.key)"
          @keydown.enter.prevent="toggleCollapsed(g.key)"
          @keydown.space.prevent="toggleCollapsed(g.key)"
        >
          <h3 class="m-0 font-bold">{{ g.label }}</h3>
          <CollapseChevron :collapsed="isCollapsed(g.key)" />
        </div>
        <div v-collapse="!isCollapsed(g.key)">
          <ExerciseCard
            v-for="ex in g.items"
            :key="ex.id"
            :exercise="ex"
            :entries="entriesFor(ex.id)"
            @add-entry="entryForm = { exercise: ex, existing: null }"
            @edit-exercise="exerciseForm = { existing: ex }"
            @delete-exercise="onDeleteExercise(ex)"
            @edit-entry="(e) => (entryForm = { exercise: ex, existing: e })"
            @delete-entry="onDeleteEntry"
          />
        </div>
      </section>
    </template>
  </main>

  <ExerciseForm v-if="exerciseForm" :existing="exerciseForm.existing" @close="exerciseForm = null" @save="onSaveExercise" />
  <EntryForm v-if="entryForm" :exercise="entryForm.exercise" :existing="entryForm.existing" @close="entryForm = null" @save="onSaveEntry" />
  <TemplatesModal v-if="templatesOpen" @close="templatesOpen = false" @apply="onApplyTemplate" />
  <Toast />
</template>
