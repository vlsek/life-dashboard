import { ref } from 'vue'
import { sb } from './supabase'
import { exerciseBilateralField, exerciseDurationField, exerciseMusclesField } from './workouts'
import { unitToSave } from './weightUnit'
import { getMuscleOverride, renameMuscleOverride, setMuscleOverride } from './muscles'
import { planMuscleSync, type SyncRow } from './muscleSync'
import { createLinkedMetric, linkMetric, loadMetricLinks, syncLinkedMetrics, unlinkMetric, type LinkedMetric } from './metricLink'
import { todayStr } from './date'
import type { EntryFormInput, Exercise, ExerciseFormInput, WorkoutEntry } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

export function useWorkouts() {
  const auth = ref<AuthState>({ status: 'loading' })
  const exercises = ref<Exercise[]>([])
  const entries = ref<WorkoutEntry[]>([])
  const loadError = ref<string | null>(null)
  const studyRecent = ref(false)
  const bodyWeightKg = ref(70)
  // Метрики дня и их связь с упражнениями (миграция 054). supported=false — колонки нет, раздел работает как раньше.
  const metricLinks = ref<{ supported: boolean; metrics: LinkedMetric[] }>({ supported: false, metrics: [] })

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await load(userId)
  }

  async function load(userId: string) {
    const { data: ex, error: exErr } = await sb.from('workout_exercises').select('*').eq('user_id', userId).order('created_at')
    if (exErr) {
      loadError.value = exErr.message
      return
    }
    const { data: en, error: enErr } = await sb.from('workout_entries').select('*').eq('user_id', userId).order('date')
    if (enErr) {
      loadError.value = enErr.message
      return
    }
    loadError.value = null
    exercises.value = (ex || []) as Exercise[]
    entries.value = (en || []) as WorkoutEntry[]
    await syncMuscleGroups(exercises.value)
    await Promise.all([loadStudyRecent(userId), loadBodyWeight(userId), loadLinks(userId)])
  }


  async function loadBodyWeight(userId: string) {
    const { data: params } = await sb.from('body_parameters').select('id, name, unit').eq('user_id', userId).eq('active', true)
    const weightParam = (params || []).find((p) => {
      const name = String(p.name || '').toLowerCase()
      return name.includes('вес') || name.includes('weight')
    })
    if (!weightParam?.id) return
    const { data } = await sb.from('body_parameter_values').select('value').eq('user_id', userId).eq('parameter_id', weightParam.id).order('date', { ascending: false }).limit(1).maybeSingle()
    const value = Number(data?.value)
    if (Number.isFinite(value) && value > 0) bodyWeightKg.value = value
  }

  // Учёба для головы на карте мышц. Пользователь может выбрать как встроенную
  // категорию study, так и свою категорию с подписью вроде «Учёба и работа».
  // Поэтому ищем не только key=study, но и учебные ключи/подписи.
  async function loadStudyRecent(userId: string) {
    studyRecent.value = false
    const since = new Date()
    since.setDate(since.getDate() - 3)
    const sinceIso = since.toISOString().slice(0, 10)

    const { data: categories } = await sb.from('metric_categories').select('id, key, label_ru, label_en')
    const studyCategoryIds = (categories || [])
      .filter((cat) => {
        const hay = [cat.key, cat.label_ru, cat.label_en].map((v) => String(v || '').toLowerCase()).join(' ')
        return cat.key === 'study' || /study|learn|уч[её]б/u.test(hay)
      })
      .map((cat) => cat.id)
    if (!studyCategoryIds.length) return

    const { data: metrics } = await sb
      .from('metrics')
      .select('id, type, goal_value, goal_direction, category_id')
      .eq('user_id', userId)
      .eq('active', true)
      .in('category_id', studyCategoryIds)
    if (!metrics?.length) return

    const ids = metrics.map((m) => m.id)
    const { data: values } = await sb
      .from('daily_values')
      .select('date, metric_id, value')
      .eq('user_id', userId)
      .in('metric_id', ids)
      .gte('date', sinceIso)
      .order('date', { ascending: false })
    if (!values?.length) return

    const metricById = new Map(metrics.map((m) => [m.id, m]))
    for (const row of values) {
      const m = metricById.get(row.metric_id)
      if (!m) continue
      const value = row.value as any
      let done = false
      if (m.type === 'boolean') done = value === true
      else if (m.type === 'multiselect') done = Array.isArray(value) && value.length > 0
      else if (m.type === 'sets') {
        const numeric = Array.isArray(value) ? value.reduce((sum: number, s: any) => sum + (Number(s?.reps) || 0), 0) : 0
        const goal = Number(m.goal_value) || 0
        done = m.goal_direction === 'at_most' ? numeric > 0 && numeric < goal : numeric > 0 && (goal <= 0 || numeric >= goal)
      } else {
        const numeric = typeof value === 'number' ? value : Number(value)
        const goal = Number(m.goal_value) || 0
        done = Number.isFinite(numeric) && (m.goal_direction === 'at_most' ? numeric > 0 && numeric < goal : numeric > 0 && (goal <= 0 || numeric >= goal))
      }
      if (done) {
        studyRecent.value = true
        return
      }
    }
  }

  // Свои группы мышц между устройствами (миграция 038, BACKLOG 22 «12:33»): БД → локальный слой muscles.ts; при первом проходе
  // устройства — локальные привязки (из v2.32) однократно в БД. Без колонки (миграция не применена) ничего не делает.
  const MUSCLES_SYNCED_KEY = 'workouts_muscle_groups_synced'
  async function syncMuscleGroups(rows: Exercise[]) {
    let uploaded = false
    try {
      uploaded = localStorage.getItem(MUSCLES_SYNCED_KEY) === '1'
    } catch {
      /* без хранилища считаем, что проход первый */
    }
    const plan = planMuscleSync(rows as unknown as SyncRow[], getMuscleOverride, uploaded)
    if (!plan.hasColumn) return
    let allOk = true
    for (const u of plan.toUpload) {
      const { error } = await sb.from('workout_exercises').update({ muscle_groups: u.muscles }).eq('id', u.id)
      if (error) allOk = false
    }
    for (const a of plan.apply) setMuscleOverride(a.name, a.muscles)
    if (allOk && !uploaded) {
      try {
        localStorage.setItem(MUSCLES_SYNCED_KEY, '1')
      } catch {
        /* не запомнили — следующий проход повторит однократную загрузку, это безопасно */
      }
    }
  }

  async function loadLinks(userId: string) {
    metricLinks.value = await loadMetricLinks(userId)
  }

  // Зеркало: после правки записей пересчитать значение связанных метрик за даты (ошибка зеркала не должна ронять сохранение тренировки).
  async function mirror(exerciseId: string, dates: string[]) {
    const a = auth.value
    if (a.status !== 'ready' || !metricLinks.value.supported) return
    if (!metricLinks.value.metrics.some((m) => m.source_exercise_id === exerciseId)) return
    try {
      const failed = await syncLinkedMetrics(a.userId, exerciseId, metricLinks.value.metrics, entries.value, dates)
      if (failed) console.warn('metric mirror: failed writes', failed)
    } catch (e) {
      console.warn('metric mirror failed', e)
    }
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  function entriesFor(exerciseId: string): WorkoutEntry[] {
    return entries.value.filter((e) => e.exercise_id === exerciseId)
  }

  async function addExercise(userId: string, res: ExerciseFormInput, defaultUnit: string, defaultValueLabel: string) {
    const { error } = await sb.from('workout_exercises').insert({
      user_id: userId,
      name: res.name.trim(),
      category: res.category?.trim() || null,
      unit: unitToSave(res, defaultUnit),
      tracks_weight: res.tracks_weight !== 'no',
      value_label: res.value_label?.trim() || defaultValueLabel,
    })
    if (error) throw error
    // Свои группы мышц (BACKLOG 22 «12:33»): только после успешной записи, по названию; undefined — не трогаем
    if (res.muscles !== undefined) setMuscleOverride(res.name, res.muscles)
    // Длительность/билатеральность для новой записи — отдельным апдейтом, аналогично
    // streak_import у метрик: сначала вставляем базовую строку, потом узнаём, есть ли у
    // неё эти колонки (мигрирована ли база), и патчим при необходимости.
    if (res.tracks_duration || res.bilateral || res.muscles?.length) {
      const { data: created } = await sb
        .from('workout_exercises')
        .select('*') // целиком: так видно, какие из необязательных колонок (027/028/038) в базе уже есть
        .eq('user_id', userId)
        .eq('name', res.name.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (created) {
        const patch: Record<string, boolean | string[]> = {}
        if (res.tracks_duration && 'tracks_duration' in created) patch.tracks_duration = true
        if (res.bilateral && 'bilateral' in created) patch.bilateral = true
        if (res.muscles?.length && 'muscle_groups' in created) patch.muscle_groups = [...res.muscles]
        if (Object.keys(patch).length) await sb.from('workout_exercises').update(patch).eq('id', created.id)
      }
    }
    await reload()
  }

  async function editExercise(existing: Exercise, res: ExerciseFormInput, defaultUnit: string, defaultValueLabel: string) {
    const { error } = await sb
      .from('workout_exercises')
      .update({
        name: res.name.trim(),
        category: res.category?.trim() || null,
        unit: unitToSave(res, defaultUnit),
        tracks_weight: res.tracks_weight !== 'no',
        value_label: res.value_label?.trim() || defaultValueLabel,
        ...exerciseDurationField(res.tracks_duration, existing),
        ...exerciseBilateralField(res.bilateral, existing),
        ...exerciseMusclesField(res.muscles, existing),
      })
      .eq('id', existing.id)
    if (error) throw error
    // Переименование не должно терять свою привязку к мышцам; затем применяем выбор из формы (undefined — не менять)
    renameMuscleOverride(existing.name, res.name.trim())
    if (res.muscles !== undefined) setMuscleOverride(res.name, res.muscles)
    await reload()
  }

  async function deleteExercise(id: string) {
    const { error } = await sb.from('workout_exercises').delete().eq('id', id)
    if (error) throw error
    await reload()
  }

  async function addEntry(exerciseId: string, userId: string, res: EntryFormInput) {
    const { error } = await sb.from('workout_entries').insert({
      user_id: userId,
      exercise_id: exerciseId,
      date: res.date,
      sets: res.sets,
      notes: res.notes,
    })
    if (error) throw error
    await reload()
    await mirror(exerciseId, [res.date])
  }

  async function editEntry(entryId: string, res: EntryFormInput) {
    const old = entries.value.find((e) => e.id === entryId)
    const { error } = await sb.from('workout_entries').update({ date: res.date, sets: res.sets, notes: res.notes }).eq('id', entryId)
    if (error) throw error
    await reload()
    if (old) await mirror(old.exercise_id, [old.date, res.date])
  }

  async function deleteEntry(id: string) {
    const old = entries.value.find((e) => e.id === id)
    const { error } = await sb.from('workout_entries').delete().eq('id', id)
    if (error) throw error
    await reload()
    if (old) await mirror(old.exercise_id, [old.date])
  }

  // ---- связь с метриками дня (BACKLOG 19/30; миграция 054) ----
  // Прошлые дни не трогаем (значения метрики остаются как были); пересчитываем только сегодня — после переноса сегодняшних ручных подходов в тренировку.
  async function linkExerciseMetric(exercise: Exercise, metric: LinkedMetric): Promise<{ imported: boolean }> {
    const a = auth.value
    if (a.status !== 'ready') return { imported: false }
    const res = await linkMetric(a.userId, exercise.id, metric, todayStr(), entries.value)
    await reload()
    await loadLinks(a.userId)
    await mirror(exercise.id, [todayStr()])
    return res
  }

  async function unlinkExerciseMetric(metricId: string) {
    const a = auth.value
    if (a.status !== 'ready') return
    await unlinkMetric(a.userId, metricId)
    await loadLinks(a.userId)
  }

  async function createMetricForExercise(exercise: Exercise) {
    const a = auth.value
    if (a.status !== 'ready') return
    const pos = metricLinks.value.metrics.reduce((mx, m) => Math.max(mx, m.position ?? 0), 0) + 1 // в конец списка метрик
    await createLinkedMetric(a.userId, exercise.id, exercise.name, pos)
    await loadLinks(a.userId)
    await mirror(exercise.id, [todayStr()])
  }

  async function applyTemplateExercises(
    userId: string,
    rows: { name: string; category: string; tracksWeight: boolean; valueLabel: string; scheme: string; defaultUnit: string }[],
  ): Promise<number> {
    const { data: existing } = await sb.from('workout_exercises').select('name').eq('user_id', userId)
    const existingNames = new Set((existing || []).map((e) => e.name.trim().toLowerCase()))
    const toInsert = []
    for (const r of rows) {
      if (existingNames.has(r.name.trim().toLowerCase())) continue
      toInsert.push({
        user_id: userId,
        name: r.name,
        category: r.category,
        tracks_weight: r.tracksWeight,
        value_label: r.valueLabel,
        suggested_scheme: r.scheme,
        unit: r.defaultUnit,
      })
      existingNames.add(r.name.trim().toLowerCase())
    }
    if (toInsert.length === 0) return 0
    const { error } = await sb.from('workout_exercises').insert(toInsert)
    if (error) throw error
    await reload()
    return toInsert.length
  }

  init()

  return {
    auth,
    exercises,
    entries,
    loadError,
    studyRecent,
    bodyWeightKg,
    metricLinks,
    linkExerciseMetric,
    unlinkExerciseMetric,
    createMetricForExercise,
    entriesFor,
    addExercise,
    editExercise,
    deleteExercise,
    addEntry,
    editEntry,
    deleteEntry,
    applyTemplateExercises,
  }
}
