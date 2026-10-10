<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useWorkouts } from './lib/useWorkouts'
import { defaultWeightUnit } from './lib/weightUnit'
import { isKnownCategory, sortCategoryKeys } from './lib/workouts'
import { readWarmupDismissed, shouldShowWarmup, writeWarmupDismissed } from './lib/warmup'
import { nowHHMM, todayStr } from './lib/date'
import { isTrainedRecently, lastTrainedByMuscle } from './lib/muscleStats'
import { MUSCLE_IDS } from './lib/muscles'
import { getLang, t } from './lib/i18n'
import { showToast } from './lib/toast'
import { appendCopiedSet, removeLastSet } from './lib/quickSet'
import AppShell from './components/AppShell.vue'
import ExerciseCard from './components/ExerciseCard.vue'
import WarmupReminder from './components/WarmupReminder.vue'
import OverviewChart from './components/OverviewChart.vue'
import MuscleMap from './components/MuscleMap.vue'
import ProgressionTrees from './components/ProgressionTrees.vue'
import ExerciseForm from './components/ExerciseForm.vue'
import EntryForm from './components/EntryForm.vue'
import MetricLinkModal from './components/MetricLinkModal.vue'
import TemplatesModal from './components/TemplatesModal.vue'
import ProgramCard from './components/ProgramCard.vue'
import { PROGRAM_EVENT, readProgram, startProgram, toggleWeekDone, writeProgram, type ActiveProgram } from './lib/program'
import { saveProgramToProfile, syncProgramFromProfile } from './lib/programSync'
import { workoutTemplates } from './lib/templates'
import Toast from './components/Toast.vue'
import type { EntryFormInput, Exercise, ExerciseFormInput, WorkoutEntry, WorkoutTemplate } from './lib/types'
import type { LinkedMetric } from './lib/metricLink'
import CollapseChevron from './components/CollapseChevron.vue'
import CollapseSummary from './components/CollapseSummary.vue'
import { loadCollapseStyle, useAccordionGroup, ACCORDION_PAGE } from './lib/useCollapseStyle'
import { vCollapse } from './lib/collapseMotion'
import EmojiText from './components/EmojiText.vue'
import { confirmDialog } from './lib/confirmDialog'
import { errMsg } from './lib/errMsg'
import { friendlyError } from './lib/friendlyError'

// Порт workouts.js/html целиком: CRUD упражнений и записей (подходы), личные рекорды,
// группировка по категориям со сворачиванием, каталог типовых программ, мини-график прогресса
// на каждом упражнении (ExerciseChart в ExerciseCard) и общий график объёма тренировок.
const wk = useWorkouts()
const { auth, exercises, entries, loadError, studyRecent, bodyWeightKg, entriesFor, metricLinks } = wk

const defaultUnit = () => defaultWeightUnit()
const defaultValueLabel = () => t('workouts_default_value_label')

// Порт showExerciseSaveError(): подсказка про миграции 027/028, если ошибка про эти поля.
function saveErrorText(e: unknown): string {
  const m = errMsg(e) // только для подсказок про миграции: сам текст драйвера не показываем
  const hint = /tracks_duration/i.test(m)
    ? ' — ' + t('workouts_duration_migration_hint')
    : /bilateral/i.test(m)
      ? ' — ' + t('workouts_bilateral_migration_hint')
      : ''
  return friendlyError(e, 'save') + hint
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
// «Аккордеон» (BACKLOG 498): раскрыли категорию — остальные категории сворачиваются (карту мышц и деревья сворачивают они сами, это ту же группу «страница»).
// Ключи событий категорий — с префиксом `cat:`, чтобы не пересекаться с блоками страницы.
const announceOpened = useAccordionGroup(ACCORDION_PAGE, (openedKey) => {
  for (const k of Object.keys(collapsed.value)) {
    if ('cat:' + k === openedKey || collapsed.value[k]) continue
    collapsed.value[k] = true
    try {
      localStorage.setItem(lsKey(k), '1')
    } catch {
      /* ignore */
    }
  }
})
const groupSummary = (n: number): string => (n > 0 ? t('workouts_collapse_exercises').replace('{n}', String(n)) : '')
function toggleCollapsed(key: string) {
  const next = !isCollapsed(key)
  collapsed.value[key] = next
  try {
    localStorage.setItem(lsKey(key), next ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (!next) announceOpened('cat:' + key)
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
// Связь упражнения с метриками дня (BACKLOG 19/30, миграция 054)
const linkModal = ref<Exercise | null>(null)
const linkBusy = ref(false)
const linkedFor = (exId: string) => metricLinks.value.metrics.filter((m) => m.source_exercise_id === exId)
async function runLink(action: () => Promise<string | void>) {
  if (linkBusy.value) return
  linkBusy.value = true
  try {
    const toast = await action()
    if (toast) showToast(toast)
  } catch (e) {
    showToast(friendlyError(e, 'save'), 'error')
    console.error(e)
  } finally {
    linkBusy.value = false
  }
}
const onLinkMetric = (m: LinkedMetric) =>
  runLink(async () => {
    const res = await wk.linkExerciseMetric(linkModal.value!, m)
    return t(res.imported ? 'workouts_ml_toast_imported' : 'workouts_ml_toast_linked')
  })
const onUnlinkMetric = (m: LinkedMetric) => runLink(async () => (await wk.unlinkExerciseMetric(m.id), t('workouts_ml_toast_unlinked')))
const onCreateMetric = () => runLink(async () => (await wk.createMetricForExercise(linkModal.value!), t('workouts_ml_toast_created')))
const templatesOpen = ref(false)

// Мышцы, тренированные за последние 4 дня, — для подбора типового упражнения по схеме тела в форме «Добавить упражнение» (BACKLOG 763)
const recentMuscles = computed(() => {
  const day = todayStr()
  const last = lastTrainedByMuscle(entries.value, exercises.value, day)
  return MUSCLE_IDS.filter((m) => isTrainedRecently(last[m], day))
})

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
  if (!(await confirmDialog(t('workouts_confirm_delete_exercise').replace('{name}', ex.name)))) return
  try {
    await wk.deleteExercise(ex.id)
  } catch (e) {
    showToast(friendlyError(e, 'save'), 'error')
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
    showToast(friendlyError(e, 'save'), 'error')
    console.error(e)
  }
}

// Встроенное добавление записи из карточки упражнения (BACKLOG 44.5ж): сохраняем без окна; done(ok) сообщает строке, очищать ли поля
async function onQuickAddEntry(exercise: Exercise, res: EntryFormInput, done: (ok: boolean) => void) {
  if (auth.value.status !== 'ready') return done(false)
  try {
    await wk.addEntry(exercise.id, auth.value.userId, res)
    showToast(t('workouts_toast_saved'))
    done(true)
  } catch (e) {
    showToast(friendlyError(e, 'save'), 'error')
    console.error(e)
    done(false)
  }
}

// «+ подход» / «− подход» прямо из таблицы записей (BACKLOG 590): правим подходы сегодняшней записи без окна; пока запись
// сохраняется, кнопки этой записи отключены (двойной тап не добавит два подхода)
const quickBusyId = ref<string | null>(null)
async function quickSets(entry: WorkoutEntry, change: (sets: WorkoutEntry['sets']) => { sets: WorkoutEntry['sets']; count: number } | null, toastKey: 'workouts_toast_set_added' | 'workouts_toast_set_removed') {
  if (quickBusyId.value) return
  const res = change(entry.sets ?? [])
  if (!res) return
  quickBusyId.value = entry.id
  try {
    await wk.editEntry(entry.id, { date: entry.date, sets: res.sets, notes: entry.notes })
    showToast(t(toastKey).replace('{n}', String(res.count)))
  } catch (e) {
    showToast(friendlyError(e, 'save'), 'error')
    console.error(e)
  } finally {
    quickBusyId.value = null
  }
}
const onAddSet = (entry: WorkoutEntry) => quickSets(entry, (sets) => appendCopiedSet(sets, nowHHMM()), 'workouts_toast_set_added')
const onRemoveLastSet = (entry: WorkoutEntry) => quickSets(entry, removeLastSet, 'workouts_toast_set_removed')

async function onDeleteEntry(entry: WorkoutEntry) {
  if (!(await confirmDialog(t('workouts_confirm_delete_entry')))) return
  try {
    await wk.deleteEntry(entry.id)
  } catch (e) {
    showToast(friendlyError(e, 'save'), 'error')
    console.error(e)
  }
}

function templateRows(tpl: WorkoutTemplate) {
  return tpl.days.flatMap((day) =>
    day.exercises.map((ex) => ({
      name: ex.name,
      category: day.label,
      tracksWeight: ex.tracksWeight,
      valueLabel: ex.valueLabel,
      scheme: ex.scheme,
      defaultUnit: defaultUnit(),
    })),
  )
}

async function onApplyTemplate(tpl: WorkoutTemplate) {
  if (auth.value.status !== 'ready') return
  const rows = templateRows(tpl)
  try {
    const added = await wk.applyTemplateExercises(auth.value.userId, rows)
    templatesOpen.value = false
    if (added === 0) showToast(t('workouts_templates_all_exist'))
    else showToast(t('workouts_templates_applied_toast').replace('{n}', String(added)))
  } catch (e) {
    showToast(friendlyError(e, 'save'), 'error')
    console.error(e)
  }
}

// ---- активная программа (BACKLOG 3.3) ----
// Хранится в profiles.workout_program (миграция 040) и в localStorage; текущую неделю карточка считает по дате старта.
const activeProgram = ref<ActiveProgram | null>(readProgram())
const activeTemplate = computed(() => (activeProgram.value ? (workoutTemplates(getLang()).find((x) => x.id === activeProgram.value!.templateId && x.weeks?.length) ?? null) : null))

function onProgramChanged(e: Event) {
  activeProgram.value = (e as CustomEvent<ActiveProgram | null>).detail ?? null
}
window.addEventListener(PROGRAM_EVENT, onProgramChanged)
onBeforeUnmount(() => window.removeEventListener(PROGRAM_EVENT, onProgramChanged))

watch(
  () => auth.value.status,
  async (status) => {
    if (status !== 'ready' || auth.value.status !== 'ready') return
    void loadCollapseStyle(auth.value.userId) // вид сворачивания блоков из «Кастомизации» (BACKLOG 498); до ответа — кэш
    try {
      activeProgram.value = await syncProgramFromProfile(auth.value.userId)
    } catch (e) {
      console.error(e)
    }
  },
  { immediate: true },
)

async function setProgram(next: ActiveProgram | null) {
  writeProgram(next)
  activeProgram.value = next
  if (auth.value.status === 'ready') {
    try {
      await saveProgramToProfile(auth.value.userId, next)
    } catch (e) {
      console.error(e) // без колонки/сети программа остаётся на этом устройстве
    }
  }
}

async function onStartProgram(tpl: WorkoutTemplate) {
  if (auth.value.status !== 'ready') return
  try {
    await wk.applyTemplateExercises(auth.value.userId, templateRows(tpl))
    await setProgram(startProgram(tpl.id))
    templatesOpen.value = false
    showToast(t('workouts_program_started_toast'))
  } catch (e) {
    showToast(friendlyError(e, 'save'), 'error')
    console.error(e)
  }
}

function onToggleProgramWeek(week: number) {
  if (activeProgram.value) void setProgram(toggleWeekDone(activeProgram.value, week))
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <main class="mx-auto max-w-3xl px-4 pb-16 pt-6">
    <h1 class="mb-3 text-xl font-bold"><EmojiText :text="t('workouts_h1')" /></h1>

    <div class="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium"
        style="background: var(--accent); color: var(--accent-text)"
        @click="exerciseForm = { existing: null }"
      >
        <EmojiText :text="t('workouts_add_exercise_btn')" />
      </button>
      <button
        type="button"
        class="rounded-lg border px-4 py-2 text-sm"
        style="border-color: var(--border); background: var(--bg-card); color: var(--text)"
        @click="templatesOpen = true"
      >
        <EmojiText :text="t('workouts_templates_btn')" />
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

      <ProgramCard
        v-if="activeProgram && activeTemplate"
        :program="activeProgram"
        :template="activeTemplate"
        @toggle-week="onToggleProgramWeek"
        @finish="setProgram(null)"
      />

      <WarmupReminder v-if="showWarmup" @dismiss="dismissWarmup" />

      <OverviewChart :entries="entries" />

      <MuscleMap
        :entries="entries"
        :exercises="exercises"
        :study-recent="studyRecent"
        @add-entry="(ex) => (entryForm = { exercise: ex, existing: null })"
      />
      <p v-if="exercises.length === 0" class="-mt-2 mb-3 text-xs" style="color: var(--text-dim)" data-testid="muscles-empty-hint">{{ t('workouts_muscles_empty') }}</p>

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
          <!-- «карточка со сводкой» (BACKLOG 498 срез 3): сколько упражнений в свёрнутой категории -->
          <CollapseSummary :text="groupSummary(g.items.length)" :collapsed="isCollapsed(g.key)" />
        </div>
        <div v-collapse="!isCollapsed(g.key)">
          <ExerciseCard
            v-for="ex in g.items"
            :key="ex.id"
            :exercise="ex"
            :entries="entriesFor(ex.id)"
            :body-weight-kg="bodyWeightKg"
            :linked-metrics="linkedFor(ex.id)"
            :link-supported="metricLinks.supported"
            @add-entry="entryForm = { exercise: ex, existing: null }"
            @quick-add-entry="(res, done) => onQuickAddEntry(ex, res, done)"
            @link-metric="linkModal = ex"
            @edit-exercise="exerciseForm = { existing: ex }"
            @delete-exercise="onDeleteExercise(ex)"
            @edit-entry="(e) => (entryForm = { exercise: ex, existing: e })"
            @delete-entry="onDeleteEntry"
            :busy-entry-id="quickBusyId"
            @add-set="onAddSet"
            @remove-last-set="onRemoveLastSet"
          />
        </div>
      </section>
    </template>
  </main>

  <ExerciseForm v-if="exerciseForm" :existing="exerciseForm.existing" :recent-muscles="recentMuscles" @close="exerciseForm = null" @save="onSaveExercise" />
  <MetricLinkModal v-if="linkModal" :exercise="linkModal" :metrics="metricLinks.metrics" :supported="metricLinks.supported" :busy="linkBusy" @close="linkModal = null" @link="onLinkMetric" @unlink="onUnlinkMetric" @create="onCreateMetric" />
  <EntryForm v-if="entryForm" :exercise="entryForm.exercise" :existing="entryForm.existing" @close="entryForm = null" @save="onSaveEntry" />
  <TemplatesModal v-if="templatesOpen" :active-title="activeTemplate?.title ?? null" @close="templatesOpen = false" @apply="onApplyTemplate" @start="onStartProgram" />
  <Toast />
</template>
