import { ref } from 'vue'
import { sb } from './supabase'
import { exerciseBilateralField, exerciseDurationField } from './workouts'
import { unitToSave } from './weightUnit'
import { renameMuscleOverride, setMuscleOverride } from './muscles'
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
    if (res.tracks_duration || res.bilateral) {
      const { data: created } = await sb
        .from('workout_exercises')
        .select('id, tracks_duration, bilateral')
        .eq('user_id', userId)
        .eq('name', res.name.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (created) {
        const patch: Record<string, boolean> = {}
        if (res.tracks_duration && 'tracks_duration' in created) patch.tracks_duration = true
        if (res.bilateral && 'bilateral' in created) patch.bilateral = true
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
  }

  async function editEntry(entryId: string, res: EntryFormInput) {
    const { error } = await sb.from('workout_entries').update({ date: res.date, sets: res.sets, notes: res.notes }).eq('id', entryId)
    if (error) throw error
    await reload()
  }

  async function deleteEntry(id: string) {
    const { error } = await sb.from('workout_entries').delete().eq('id', id)
    if (error) throw error
    await reload()
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
