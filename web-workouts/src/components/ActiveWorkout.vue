<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useActiveWorkout } from '../lib/useActiveWorkout'
import { categoriesOf, musclesOf, rankExercises } from '../lib/exercisePick'
import { progressionHint } from '../lib/progressionHint'
import PlateCalculator from './PlateCalculator.vue'
import { warmupPlan, workingWeightFor, hasWarmup, parseScheme, formatScheme, readScheme, writeScheme, resetScheme } from '../lib/warmupGen'
import { supersetPos, doneSetCount, formatElapsed, previousSet, previousSets, scopeToRoutine, previousText, lastNote, nextSupersetTarget, stepNumber, weightStep, NOTE_MAX, type PrevSource } from '../lib/activeWorkout'
import { parseNum } from '../lib/entrySets'
import { setType, SET_TYPES, type SetV2 } from '../lib/sessionContract'
import { t, type DictKey } from '../lib/i18n'
import { prSetText, setRecords, topKind } from '../lib/records'
import { showToast } from '../lib/toast'
import { useRoutines } from '../lib/useRoutines'
import { useRestTimer } from '../lib/useRestTimer'
import { normalizeRpe } from '../lib/sessionContract'
import { shouldRestAfter } from '../lib/restTimer'
import RestTimer from './RestTimer.vue'
import { haptic } from '../lib/nativeFeedback'
import type { Exercise, WorkoutEntry } from '../lib/types'

// Экран активной тренировки (BACKLOG 69.2, макет A): липкая шапка с секундомером, блоки упражнений со строками подходов «№ · прошлый раз · вес · повторы · ✓».
// Данные черновика — useActiveWorkout (localStorage); сохранение в Supabase делает App.vue по событию finish.
const props = withDefaults(defineProps<{ exercises: Exercise[]; entries: WorkoutEntry[]; unit: string; busy: boolean; sessions?: { id: string; routine_id: string | null }[] }>(), { sessions: () => [] })
const emit = defineEmits<{ finish: []; cancel: [] }>()
const aw = useActiveWorkout()
const draft = computed(() => aw.draft.value)
const exById = computed(() => new Map(props.exercises.map((e) => [e.id, e])))
// Рекорды (69.9): по каждому упражнению — какие рекорды побил каждый выполненный подход (история = записи ДО даты тренировки)
const prMap = computed(() => {
  const m = new Map<string, ReturnType<typeof setRecords>>()
  const d = draft.value
  if (!d) return m
  for (const e of d.exercises) m.set(e.id, setRecords(props.entries.filter((x) => x.exercise_id === e.exercise_id && x.date < d.date), e.sets))
  return m
})
const prKind = (entryId: string, i: number) => topKind(prMap.value.get(entryId)?.[i] ?? [])
const rest = useRestTimer()
// RPE (69.4): колонка в строке подхода, включается на устройстве
const RPE_KEY = 'workouts.rpe.v1'
const readRpe = (): boolean => { try { return localStorage.getItem(RPE_KEY) === '1' } catch { return false } }
const rpeOn = ref(readRpe())
function toggleRpe() { rpeOn.value = !rpeOn.value; try { localStorage.setItem(RPE_KEY, rpeOn.value ? '1' : '0') } catch { /* настройка не критична */ } }
const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]
const PREV_KEY = 'workouts.prevSource.v1'
const readPrev = (): PrevSource => { try { return localStorage.getItem(PREV_KEY) === 'best' ? 'best' : 'last' } catch { return 'last' } }
const prevSource = ref<PrevSource>(readPrev())
function togglePrevSource() { prevSource.value = prevSource.value === 'best' ? 'last' : 'best'; try { localStorage.setItem(PREV_KEY, prevSource.value) } catch { /* настройка не критична */ } }
const HINT_KEY = 'workouts.hint.v1'
const hintOn = ref((() => { try { return localStorage.getItem(HINT_KEY) !== '0' } catch { return true } })())
function toggleHint() { hintOn.value = !hintOn.value; try { localStorage.setItem(HINT_KEY, hintOn.value ? '1' : '0') } catch { /* не критично */ } }
// Enter / «Далее» на клавиатуре прыгает к следующему полю ввода (вес → повторы → вес следующего подхода …); на последнем поле — убирает клавиатуру
function onEnter(ev: KeyboardEvent) {
  const cur = ev.target as HTMLElement
  const all = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="active-workout"] input[data-nav]'))
  const next = all[all.indexOf(cur as HTMLInputElement) + 1]
  if (next) { next.focus(); next.select?.() } else cur.blur()
}
const settingsOpen = ref(false)
// Удаление подхода: сразу, но с «Отменить» в тосте — случайный тап не стоит потерянных цифр
function onRemoveSet(entryId: string, i: number) {
  const set = draft.value?.exercises.find((x) => x.id === entryId)?.sets[i]
  if (!set) return
  const snapshot = { ...set }
  aw.removeSet(entryId, i)
  showToast(t('aw_set_removed'), 'success', { action: { label: t('workouts_journal_undo'), run: () => aw.insertSet(entryId, i, snapshot) } })
}
const noteOpen = ref<Record<string, boolean>>({})
const prevNote = (exerciseId: string) => lastNote(props.entries, exerciseId, draft.value?.date ?? '9999')
const restLabel = (exerciseId: string): string => {
  const own = rest.byEx.value[exerciseId]
  if (own === undefined) return t('aw_rest_default')
  return own ? own + ' ' + t('sm_sec') : t('aw_rest_off')
}
const prevEntries = (exerciseId: string) => scopeToRoutine(props.entries, props.sessions, draft.value?.routine_id, exerciseId, draft.value?.date ?? '9999')
const hintFor = (exerciseId: string) => progressionHint(previousSets(prevEntries(exerciseId), exerciseId, draft.value?.date ?? '9999', prevSource.value), unitOf(exById.value.get(exerciseId)))
function hintText(exerciseId: string): string {
  const h = hintFor(exerciseId)
  if (!h) return ''
  const u = unitOf(exById.value.get(exerciseId))
  const was = `${h.sets}×${h.reps} ${t('aw_hint_on')} ${h.weight}${u}`
  return h.kind === 'weight' ? `${t('aw_hint_last')} ${was} — ${t('aw_hint_try')} ${h.next}${u}` : `${t('aw_hint_last')} ${was} — ${t('aw_hint_try')} ${h.weight}${u}×${h.next}`
}
const cols = computed(() => (rpeOn.value ? '40px 1fr 1fr 1fr 64px 44px 28px' : '40px 1fr 1fr 1fr 44px 28px'))
const onRpe = (entryId: string, i: number, ev: Event) => aw.update(entryId, i, { rpe: normalizeRpe(Number((ev.target as HTMLSelectElement).value)) })
// Экран не гаснет, пока идёт тренировка (Screen Wake Lock); не поддерживается — молча пропускаем
let wake: { release: () => Promise<void> } | null = null
async function lockScreen() { try { wake = (await (navigator as unknown as { wakeLock?: { request: (k: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen')) ?? null } catch { wake = null } }
const onVisible = () => { if (document.visibilityState === 'visible' && !wake) void lockScreen() }
onMounted(() => { void lockScreen(); document.addEventListener('visibilitychange', onVisible) })
onBeforeUnmount(() => { document.removeEventListener('visibilitychange', onVisible); void wake?.release().catch(() => undefined); wake = null; rest.skip() })
async function onTick(entryId: string, i: number) {
  const before = draft.value?.exercises.find((x) => x.id === entryId)?.sets[i]?.done === true
  aw.toggleDone(entryId, i)
  await nextTick()
  const ei = draft.value?.exercises.findIndex((x) => x.id === entryId) ?? -1
  if (!before && ei >= 0 && draft.value && shouldRestAfter(draft.value, ei)) rest.start(draft.value.exercises[ei].exercise_id) // отдых после выполненного подхода (в суперсете — после последнего в группе)
  // суперсет: ввод идёт попеременно — курсор сразу в поле следующего упражнения группы
  if (!before && ei >= 0 && draft.value) {
    const target = nextSupersetTarget(draft.value, ei, i)
    if (target) { await nextTick(); (document.querySelector(`[data-testid="aw-set-${target.ei}-${target.i}"] input`) as HTMLInputElement | null)?.focus() }
  }
  const k = prKind(entryId, i)
  const e = draft.value?.exercises.find((x) => x.id === entryId)
  if (k && e) {
    showToast(t('aw_pr_toast').replace('{x}', prSetText(e.sets[i], unitOf(exById.value.get(e.exercise_id)))))
    haptic('success')
  }
}
// «В рутину» (69.7): запоминаем набор упражнений этой тренировки
const rt = useRoutines()
const savingRoutine = ref(false)
const routineName = ref('')
function openSaveRoutine() { routineName.value = draft.value?.name ?? ''; savingRoutine.value = true }
function saveRoutine() {
  if (draft.value && rt.saveFromDraft(draft.value, routineName.value)) { savingRoutine.value = false; showToast(t('rt_saved')) }
}
// «Прошлый раз» (69.6): подход с тем же номером из последней тренировки; тап по подсказке подставляет числа
const prevFor = (exerciseId: string, i: number) => previousSet(prevEntries(exerciseId), exerciseId, draft.value?.date ?? '9999', i, prevSource.value)
const fillAll = (entryId: string, exerciseId: string) => aw.fillAllPrev(entryId, (i) => prevFor(exerciseId, i))
const hasPrev = (exerciseId: string) => prevFor(exerciseId, 0) !== null
// Разминка (69.15 срез 2): план от рабочего веса (свой первый подход, иначе прошлая тренировка); кнопка только у упражнений с весом, когда плана ещё нет в подходах
// Калькулятор блинов из тренировки (69.15 срез 4): сразу с рабочим весом упражнения (свой первый подход, иначе прошлая тренировка), в единице упражнения
const platesFor = ref<{ unit: string; weight: number | null } | null>(null)
function openPlates(e: { exercise_id: string; sets: SetV2[] }) {
  const w = workingWeightFor(e.sets, previousSets(prevEntries(e.exercise_id), e.exercise_id, draft.value?.date ?? '9999', prevSource.value))
  platesFor.value = { unit: unitOf(exById.value.get(e.exercise_id)), weight: w }
}
const warmupScheme = ref(readScheme())
const warmupText = ref(formatScheme(warmupScheme.value))
function onWarmupScheme() { const p = parseScheme(warmupText.value); if (p) { warmupScheme.value = p; writeScheme(p) } } // пока печатают негодное — прежняя схема остаётся
function onWarmupReset() { warmupScheme.value = resetScheme(); warmupText.value = formatScheme(warmupScheme.value) }
const warmupFor = (e: { id: string; exercise_id: string; sets: SetV2[] }) => {
  if (!exById.value.get(e.exercise_id)?.tracks_weight || hasWarmup(e.sets)) return []
  const w = workingWeightFor(e.sets, previousSets(prevEntries(e.exercise_id), e.exercise_id, draft.value?.date ?? '9999', prevSource.value))
  return w ? warmupPlan(w, stepOf(e.exercise_id), warmupScheme.value) : []
}
// Суперсеты (69.8): цветная скобка слева у группы, кнопка между соседними упражнениями
const SS_COLORS = ['#e07a1f', '#3d8fd1', '#8a5cc2', '#3aa57a']
const ssColor = (g: number | null) => (g == null ? 'transparent' : SS_COLORS[(g - 1) % SS_COLORS.length])
const ssPos = (i: number) => (draft.value ? supersetPos(draft.value, i) : 'none')
const joined = (i: number) => !!draft.value && draft.value.exercises[i].superset_group != null && draft.value.exercises[i].superset_group === draft.value.exercises[i + 1]?.superset_group
const picking = ref(false)
const query = ref('')
const pickCategory = ref<string | null>(null)
const pickCategories = computed(() => categoriesOf(props.exercises))
const pickMuscle = ref<string | null>(null)
const pickMuscles = computed(() => musclesOf(props.exercises))
const pickList = computed(() => rankExercises(props.exercises, props.entries, query.value, pickCategory.value, pickMuscle.value))
const unitOf = (ex: Exercise | undefined) => ex?.unit || props.unit
const TYPE_MARK: Record<string, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' }
const TYPE_LABEL = (ty: string): string => (ty === 'warmup' ? t('aw_type_warmup') : ty === 'drop' ? t('aw_type_drop') : ty === 'failure' ? t('aw_type_failure') : '')
function cycleType(entryId: string, i: number, current: string) {
  const next = SET_TYPES[(SET_TYPES.indexOf(current as (typeof SET_TYPES)[number]) + 1) % SET_TYPES.length]
  aw.setType(entryId, i, next)
}
// Номер показываем только по рабочим подходам: разминка — буква W
function label(entryId: string, i: number): string {
  const e = draft.value?.exercises.find((x) => x.id === entryId)
  if (!e) return ''
  const ty = setType(e.sets[i])
  if (ty !== 'normal') return TYPE_MARK[ty]
  return String(e.sets.slice(0, i + 1).filter((s) => setType(s) === 'normal').length)
}
const onNum = (entryId: string, i: number, field: 'weight' | 'reps' | 'duration', ev: Event) => aw.update(entryId, i, { [field]: parseNum((ev.target as HTMLInputElement).value) })
// ↑/↓ в поле меняет значение на шаг: вес — 2,5 кг (5 lb), повторы/минуты — 1
function onStep(entryId: string, i: number, field: 'weight' | 'reps' | 'duration', step: number, dir: 1 | -1, ev: KeyboardEvent) {
  ev.preventDefault()
  const s = draft.value?.exercises.find((x) => x.id === entryId)?.sets[i]
  aw.update(entryId, i, { [field]: stepNumber(s?.[field] as number | null | undefined, dir, step) })
}
const stepOf = (exerciseId: string) => weightStep(unitOf(exById.value.get(exerciseId)))
function pick(id: string) {
  aw.addExercise(id)
  picking.value = false
  query.value = ''
  pickCategory.value = null
  pickMuscle.value = null
}
const inputCls = 'w-full rounded-md border px-2 py-2 text-center text-base'
const inputStyle = 'border-color: var(--border); background: var(--bg); color: var(--text); min-height: 44px'
</script>

<template>
  <div v-if="draft" class="fixed inset-0 z-50 overflow-y-auto" style="background: var(--bg); color: var(--text)" data-testid="active-workout" role="dialog" aria-modal="true">
    <header class="sticky top-0 z-10 border-b px-4 py-3" style="background: var(--bg-card); border-color: var(--border)">
      <div class="mx-auto flex max-w-3xl items-center gap-3">
        <button type="button" class="rounded-lg border px-3 py-2 text-sm" style="border-color: var(--border); color: var(--text-dim); min-height: 44px" data-testid="aw-cancel" @click="emit('cancel')">
          {{ t('aw_cancel') }}
        </button>
        <div class="min-w-0 flex-1 text-center">
          <div class="text-xl font-bold tabular-nums" data-testid="aw-timer" aria-live="off">{{ formatElapsed(aw.elapsed.value) }}</div>
          <div v-if="draft.manual_minutes" class="text-xs" style="color: var(--accent)" data-testid="aw-past-badge">{{ t('aw_past_badge').replace('{date}', draft.date) }}</div>
          <input
            :value="draft.name ?? ''"
            :placeholder="t('aw_title_ph')"
            maxlength="80"
            class="w-full bg-transparent text-center text-sm outline-none"
            style="color: var(--text-dim)"
            :aria-label="t('aw_title_ph')"
            @input="aw.setName(($event.target as HTMLInputElement).value)"
          />
        </div>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold"
          style="background: var(--success); color: #fff; min-height: 44px"
          :disabled="busy"
          data-testid="aw-finish"
          @click="emit('finish')"
        >
          {{ t('aw_finish') }}
        </button>
      </div>
      <div class="mx-auto mt-1 max-w-3xl text-center text-xs" style="color: var(--text-dim)">{{ t('aw_done_sets').replace('{n}', String(doneSetCount(draft))) }}</div>
      <div v-if="draft.exercises.length" class="mx-auto mt-1 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs">
        <button type="button" class="whitespace-nowrap px-2 py-1" style="color: var(--text-dim); min-height: 32px" :aria-expanded="settingsOpen" data-testid="aw-settings-toggle" @click="settingsOpen = !settingsOpen">⚙ {{ t('aw_settings') }}</button>
        <div v-show="settingsOpen" class="flex w-full flex-wrap justify-center gap-x-1" data-testid="aw-settings" style="order: 5">
        <button type="button" class="whitespace-nowrap px-2 py-1" style="color: var(--text-dim); min-height: 32px" :aria-pressed="hintOn" data-testid="aw-hint-setting" @click="toggleHint">{{ t('aw_hint_setting') }}: {{ hintOn ? t('aw_on') : t('aw_rest_off') }}</button>
        <button type="button" class="whitespace-nowrap px-2 py-1" style="color: var(--text-dim); min-height: 32px" data-testid="aw-prev-source" @click="togglePrevSource">{{ t('aw_prev_source') }}: {{ prevSource === 'best' ? t('aw_prev_best') : t('aw_prev_last') }}</button>
        <button type="button" class="whitespace-nowrap px-2 py-1" style="color: var(--text-dim); min-height: 32px" :aria-pressed="rpeOn" data-testid="aw-rpe-setting" @click="toggleRpe">{{ t('aw_rpe_setting') }}: {{ rpeOn ? t('aw_on') : t('aw_rest_off') }}</button>
        <button type="button" class="whitespace-nowrap px-2 py-1" style="color: var(--text-dim); min-height: 32px" data-testid="aw-rest-setting" @click="rest.cycleSetting()">{{ t('aw_rest_setting') }}: {{ rest.seconds.value ? rest.seconds.value + ' ' + t('sm_sec') : t('aw_rest_off') }}</button>
        <button type="button" class="whitespace-nowrap px-2 py-1" style="color: var(--text-dim); min-height: 32px" :aria-pressed="rest.sound.value" data-testid="aw-rest-sound" @click="rest.toggleSound()">{{ t('aw_sound') }}: {{ rest.sound.value ? t('aw_on') : t('aw_rest_off') }}</button>
        <label class="flex w-full items-center justify-center gap-2 px-2 py-1 text-xs" style="color: var(--text-dim)">
          {{ t('aw_warmup_scheme') }}:
          <input v-model="warmupText" type="text" class="w-40 rounded-md border px-2 py-1" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 32px" :title="t('aw_warmup_scheme_hint')" :aria-label="t('aw_warmup_scheme') + ': ' + t('aw_warmup_scheme_hint')" data-testid="aw-warmup-scheme" @input="onWarmupScheme" />
          <button type="button" class="border-0 bg-transparent px-1" style="color: var(--accent); min-height: 32px" data-testid="aw-warmup-scheme-reset" @click="onWarmupReset">{{ t('aw_warmup_scheme_reset') }}</button>
        </label>
        </div>
        <button v-if="!savingRoutine" type="button" class="px-2 py-1" style="color: var(--accent); min-height: 32px" data-testid="aw-save-routine" @click="openSaveRoutine">{{ t('rt_save') }}</button>
        <template v-else>
          <input v-model="routineName" maxlength="80" :placeholder="t('rt_name_ph')" class="rounded-md border px-2 py-1" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 36px" data-testid="aw-routine-name" @keyup.enter="saveRoutine" />
          <button type="button" class="rounded-md px-3 py-1 font-semibold" style="background: var(--accent); color: var(--accent-text); min-height: 36px" data-testid="aw-routine-ok" @click="saveRoutine">{{ t('rt_ok') }}</button>
        </template>
      </div>
      <div class="mx-auto max-w-3xl"><RestTimer /></div>
    </header>

    <main class="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <p v-if="draft.exercises.length === 0" class="py-6 text-center text-sm" style="color: var(--text-dim)">{{ t('aw_empty') }}</p>

      <template v-for="(e, ei) in draft.exercises" :key="e.id">
      <section class="rounded-xl border p-3" :class="ssPos(ei) === 'start' || ssPos(ei) === 'mid' ? 'mb-0' : 'mb-1'" :style="'border-color: var(--border); background: var(--bg-card); border-left: 5px solid ' + ssColor(e.superset_group)" :data-testid="'aw-ex-' + ei" :data-superset="e.superset_group ?? ''">
        <div class="mb-2 flex items-center gap-1">
          <h2 class="min-w-0 flex-1 truncate font-semibold">{{ exById.get(e.exercise_id)?.name ?? '—' }}</h2>
          <button type="button" class="px-2 py-2 text-sm" style="color: var(--text-dim); min-width: 40px; min-height: 40px" :aria-label="t('aw_move_up')" :disabled="ei === 0" @click="aw.move(e.id, -1)">↑</button>
          <button type="button" class="px-2 py-2 text-sm" style="color: var(--text-dim); min-width: 40px; min-height: 40px" :aria-label="t('aw_move_down')" :disabled="ei === draft.exercises.length - 1" @click="aw.move(e.id, 1)">↓</button>
          <button type="button" class="px-2 py-2 text-sm" style="color: var(--danger); min-width: 40px; min-height: 40px" :aria-label="t('aw_remove_exercise')" @click="aw.removeExercise(e.id)">✕</button>
        </div>
        <button type="button" class="mb-1 mr-2 rounded-full border px-3 py-1 text-xs" style="border-color: var(--border); color: var(--text-dim); min-height: 32px" :data-testid="'aw-rest-ex-' + ei" @click="rest.cycleFor(e.exercise_id)">{{ t('aw_rest_ex') }}: {{ restLabel(e.exercise_id) }}</button>
        <button type="button" class="mb-1 mr-2 rounded-full border px-3 py-1 text-xs" style="border-color: var(--border); color: var(--text-dim); min-height: 32px" :data-testid="'aw-note-btn-' + ei" @click="noteOpen[e.id] = !noteOpen[e.id]">{{ t('aw_note') }}<template v-if="e.note"> ✓</template></button>
        <textarea v-if="noteOpen[e.id] || e.note" :value="e.note ?? ''" :maxlength="NOTE_MAX" rows="2" class="mb-2 w-full rounded-lg border px-3 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" :placeholder="t('aw_note_ph')" :data-testid="'aw-note-' + ei" @input="aw.setNote(e.id, ($event.target as HTMLTextAreaElement).value)"></textarea>
        <p v-if="prevNote(e.exercise_id) && !e.note" class="mb-2 text-xs italic" style="color: var(--text-dim)" :data-testid="'aw-prevnote-' + ei">{{ t('aw_prev_note') }}: {{ prevNote(e.exercise_id) }}</p>
        <p v-if="hintOn && hintFor(e.exercise_id)" class="mb-2 text-xs" style="color: var(--text-dim)" :data-testid="'aw-hint-' + ei">{{ hintText(e.exercise_id) }}</p>
        <div class="grid items-center gap-2 text-xs" :style="'grid-template-columns: ' + cols + '; color: var(--text-dim)'">
          <span class="text-center">#</span>
          <span class="text-center">{{ t('aw_prev') }}</span>
          <span class="text-center">{{ exById.get(e.exercise_id)?.tracks_weight ? t('aw_weight') + ', ' + unitOf(exById.get(e.exercise_id)) : t('aw_value') }}</span>
          <span class="text-center">{{ exById.get(e.exercise_id)?.tracks_duration ? t('aw_minutes') : t('aw_reps') }}</span>
          <span v-if="rpeOn" class="text-center">{{ t('aw_rpe') }}</span>
          <span></span><span></span>
        </div>
        <template v-for="(s, i) in e.sets" :key="i">
        <div
          class="mt-1 grid items-center gap-2 rounded-md"
          :style="'grid-template-columns: ' + cols + ';' + (s.done === true ? 'background: color-mix(in srgb, var(--success) 18%, transparent)' : '')"
          :data-testid="'aw-set-' + ei + '-' + i"
        >
          <button type="button" class="rounded-md text-sm font-semibold" style="min-height: 44px; color: var(--text-dim)" :aria-label="t('aw_set_type') + (TYPE_LABEL(setType(s)) ? ': ' + TYPE_LABEL(setType(s)) : '')" :title="TYPE_LABEL(setType(s))" @click="cycleType(e.id, i, setType(s))">
            {{ label(e.id, i) }}
          </button>
          <button
            type="button"
            class="truncate rounded-md text-center text-xs"
            style="color: var(--text-dim); min-height: 44px"
            :disabled="!prevFor(e.exercise_id, i)"
            :aria-label="t('aw_use_prev')"
            :data-testid="'aw-prev-' + ei + '-' + i"
            @click="aw.applyPrev(e.id, i, prevFor(e.exercise_id, i))"
          >
            {{ previousText(prevFor(e.exercise_id, i), unitOf(exById.get(e.exercise_id))) || '—' }}
          </button>
          <input
            v-if="exById.get(e.exercise_id)?.tracks_weight"
            type="text"
            inputmode="decimal"
            :value="s.weight ?? ''"
            :class="inputCls"
            :style="inputStyle"
            :aria-label="t('aw_weight')"
            enterkeyhint="next"
            data-nav
            @input="onNum(e.id, i, 'weight', $event)"
            @keydown.up="onStep(e.id, i, 'weight', stepOf(e.exercise_id), 1, $event)"
            @keydown.down="onStep(e.id, i, 'weight', stepOf(e.exercise_id), -1, $event)"
            @keydown.enter.prevent="onEnter($event)"
          />
          <input v-else type="text" inputmode="decimal" :value="s.weight ?? ''" :class="inputCls" :style="inputStyle" :aria-label="t('aw_value')" enterkeyhint="next" data-nav @input="onNum(e.id, i, 'weight', $event)" @keydown.up="onStep(e.id, i, 'weight', 1, 1, $event)" @keydown.down="onStep(e.id, i, 'weight', 1, -1, $event)" @keydown.enter.prevent="onEnter($event)" />
          <input
            v-if="exById.get(e.exercise_id)?.tracks_duration"
            type="text"
            inputmode="numeric"
            :value="s.duration ?? ''"
            :class="inputCls"
            :style="inputStyle"
            :aria-label="t('aw_minutes')"
            enterkeyhint="next"
            data-nav
            @input="onNum(e.id, i, 'duration', $event)"
            @keydown.up="onStep(e.id, i, 'duration', 1, 1, $event)"
            @keydown.down="onStep(e.id, i, 'duration', 1, -1, $event)"
            @keydown.enter.prevent="onEnter($event)"
          />
          <input v-else type="text" inputmode="numeric" :value="s.reps ?? ''" :class="inputCls" :style="inputStyle" :aria-label="t('aw_reps')" enterkeyhint="next" data-nav @input="onNum(e.id, i, 'reps', $event)" @keydown.up="onStep(e.id, i, 'reps', 1, 1, $event)" @keydown.down="onStep(e.id, i, 'reps', 1, -1, $event)" @keydown.enter.prevent="onEnter($event)" />
          <select v-if="rpeOn" :value="s.rpe ?? ''" :class="inputCls" style="min-height: 44px; padding: 0 2px; border-color: var(--border); background: var(--bg); color: var(--text)" :aria-label="t('aw_rpe')" :data-testid="'aw-rpe-' + ei + '-' + i" @change="onRpe(e.id, i, $event)">
            <option value="">—</option>
            <option v-for="v in RPE_VALUES" :key="v" :value="v">{{ String(v).replace('.', ',') }}</option>
          </select>
          <button
            type="button"
            class="rounded-md border text-lg"
            :style="'min-height: 44px; border-color: var(--border);' + (s.done === true ? 'background: var(--success); color: #fff' : 'color: var(--text-dim)')"
            :aria-pressed="s.done === true"
            :aria-label="t('aw_set_done')"
            :data-testid="'aw-tick-' + ei + '-' + i"
            @click="onTick(e.id, i)"
          >
            ✓
          </button>
          <button type="button" class="text-sm" style="color: var(--text-dim); min-height: 44px" :aria-label="t('aw_remove_set')" :data-testid="'aw-rm-' + ei + '-' + i" @click="onRemoveSet(e.id, i)">×</button>
        </div>
        <div v-if="prKind(e.id, i)" class="mt-0.5 text-xs font-semibold" style="color: var(--accent)" :data-testid="'aw-pr-' + ei + '-' + i">
          ★ {{ t(('aw_pr_' + prKind(e.id, i)) as DictKey) }} · {{ prSetText(s, unitOf(exById.get(e.exercise_id))) }}
        </div>
        </template>
        <div class="mt-2 flex flex-wrap gap-2">
          <button type="button" class="flex-1 rounded-md border py-2 text-sm" style="border-color: var(--border); color: var(--accent); min-height: 44px" :data-testid="'aw-add-set-' + ei" @click="aw.addSet(e.id)">{{ t('aw_add_set') }}</button>
          <button v-if="exById.get(e.exercise_id)?.tracks_weight" type="button" class="min-w-[6rem] flex-1 rounded-md border py-2 text-sm" style="border-color: var(--border); color: var(--text); min-height: 44px" :title="t('aw_plates_title')" :data-testid="'aw-plates-' + ei" @click="openPlates(e)">{{ t('aw_plates') }}</button>
          <button v-if="warmupFor(e).length" type="button" class="min-w-[6rem] flex-1 rounded-md border py-2 text-sm" style="border-color: var(--border); color: var(--text); min-height: 44px" :title="t('aw_warmup_title')" :data-testid="'aw-warmup-' + ei" @click="aw.insertWarmup(e.id, warmupFor(e))">{{ t('aw_warmup') }}</button>
          <button v-if="hasPrev(e.exercise_id)" type="button" class="flex-1 rounded-md border py-2 text-sm" style="border-color: var(--border); color: var(--text); min-height: 44px" :data-testid="'aw-fill-' + ei" @click="fillAll(e.id, e.exercise_id)">{{ t('aw_fill_prev') }}</button>
        </div>
      </section>
      <div v-if="ei < draft.exercises.length - 1" class="mb-1 text-center">
        <button type="button" class="px-3 py-1 text-xs" :style="'min-height: 32px; color: ' + (joined(ei) ? ssColor(e.superset_group) : 'var(--text-dim)')" :data-testid="'aw-ss-' + ei" @click="aw.superset(e.id)">{{ joined(ei) ? t('aw_ss_split') : t('aw_ss_join') }}</button>
      </div>
      </template>

      <button type="button" class="w-full rounded-xl border-2 border-dashed py-3 text-sm font-medium" style="border-color: var(--accent); color: var(--accent); min-height: 48px" data-testid="aw-add-exercise" @click="picking = true">
        {{ t('aw_add_exercise') }}
      </button>
    </main>

    <PlateCalculator v-if="platesFor" :unit="platesFor.unit" :initial="platesFor.weight" @close="platesFor = null" />
    <div v-if="picking" class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" style="background: rgba(0, 0, 0, 0.6)" @click.self="picking = false">
      <div class="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border p-4 sm:rounded-2xl" style="background: var(--bg-card); border-color: var(--border)" role="dialog" :aria-label="t('aw_pick_title')">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="font-semibold">{{ t('aw_pick_title') }}</h3>
          <button type="button" class="px-2 py-1" style="color: var(--text-dim); min-height: 40px" @click="picking = false">✕</button>
        </div>
        <input v-model="query" type="text" :placeholder="t('aw_search')" class="mb-2 w-full rounded-md border px-3 py-2" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 44px" data-testid="aw-search" />
        <div v-if="pickCategories.length > 1" class="mb-2 flex gap-1 overflow-x-auto pb-1" data-testid="aw-pick-cats">
          <button v-for="c in [null, ...pickCategories]" :key="c ?? '_all'" type="button" class="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs" :style="'min-height: 32px; border-color: ' + (pickCategory === c ? 'var(--accent)' : 'var(--border)') + '; color: ' + (pickCategory === c ? 'var(--accent)' : 'var(--text-dim)')" :aria-pressed="pickCategory === c" :data-testid="'aw-cat-' + (c ?? 'all')" @click="pickCategory = c">{{ c ?? t('aw_cat_all') }}</button>
        </div>
        <div v-if="pickMuscles.length > 1" class="mb-2 flex gap-1 overflow-x-auto pb-1" data-testid="aw-pick-muscles">
          <button v-for="m in [null, ...pickMuscles]" :key="m ?? '_all'" type="button" class="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs" :style="'min-height: 32px; border-color: ' + (pickMuscle === m ? 'var(--accent)' : 'var(--border)') + '; color: ' + (pickMuscle === m ? 'var(--accent)' : 'var(--text-dim)')" :aria-pressed="pickMuscle === m" :data-testid="'aw-muscle-' + (m ?? 'all')" @click="pickMuscle = m">{{ m ? t(('workouts_muscle_' + m) as DictKey) : t('aw_muscle_all') }}</button>
        </div>
        <p v-if="exercises.length === 0" class="py-4 text-sm" style="color: var(--text-dim)">{{ t('aw_no_exercises') }}</p>
        <ul class="overflow-y-auto">
          <li v-for="row in pickList" :key="row.exercise.id">
            <button type="button" class="flex w-full items-baseline justify-between gap-2 rounded-md px-3 py-3 text-left" style="min-height: 48px" :data-testid="'aw-pick-' + row.exercise.id" @click="pick(row.exercise.id)"><span>{{ row.exercise.name }}</span><span v-if="row.last" class="shrink-0 text-xs" style="color: var(--text-dim)">{{ row.last }}</span></button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
