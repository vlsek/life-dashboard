import { sb } from './supabase'
import { addDaysIso, todayStr } from './date'
import { RECENT_DAYS, recentMuscles, type RecencyEntry, type RecencyExercise } from '../../../shared/body-picker/muscleRecency'
import type { MuscleId } from '../../../shared/body-picker/muscles'

// Данные для подбора по схеме тела в форме метрики (BACKLOG 762 срез 2, вариант Б): какие мышцы работали за последние дни
// (из workout_entries «Тренировок») и пол профиля (выбор мужской/женской модели). Любая ошибка — пустой результат: схема остаётся
// рабочей (все мышцы серые, мужская модель), форма метрики из-за этого не ломается.
export interface PickerData {
  recent: MuscleId[]
  gender: 'male' | 'female' | null
}

type Client = Pick<typeof sb, 'from' | 'auth'>

export async function loadPickerData(client: Client, exercises: readonly RecencyExercise[], today: string = todayStr()): Promise<PickerData> {
  const empty: PickerData = { recent: [], gender: null }
  try {
    const { data } = await client.auth.getSession()
    const uid = data?.session?.user?.id
    if (!uid) return empty
    const from = addDaysIso(today, -(RECENT_DAYS - 1))
    const [eRes, pRes] = await Promise.all([
      client.from('workout_entries').select('exercise_id, date, sets').eq('user_id', uid).gte('date', from).lte('date', today),
      client.from('profiles').select('gender').eq('user_id', uid).maybeSingle(),
    ])
    const entries = (eRes && !eRes.error ? eRes.data || [] : []) as RecencyEntry[]
    const g = pRes && !pRes.error ? pRes.data?.gender : null
    return { recent: recentMuscles(entries, exercises, today), gender: g === 'female' ? 'female' : g === 'male' ? 'male' : null }
  } catch {
    return empty
  }
}
