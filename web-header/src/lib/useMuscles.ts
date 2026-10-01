import { ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { addDaysIso, todayStr } from './date'
import { isTrainedRecently, lastTrainedByMuscle } from './muscleStats'
import { MUSCLE_IDS, type MuscleId } from './muscles'

// Карта мышц для правой панели (BACKLOG 3.2). Данные грузятся лениво — только когда панель открыта, чтобы не тянуть
// подходы на каждой странице. Берём последние 90 дней: хватает и для окна «4 дня», и для «последний раз тренировали».
const LOOKBACK_DAYS = 90

export function useMuscles() {
  const last = ref<Partial<Record<MuscleId, string>>>({})
  const done = ref<Set<MuscleId>>(new Set())
  const loaded = ref(false)
  const hasExercises = ref(false)
  let running = false

  async function load(userId: string) {
    if (running) return
    running = true
    try {
      const today = todayStr()
      const since = addDaysIso(today, -(LOOKBACK_DAYS - 1))
      const [exRes, enRes] = await Promise.all([
        sb.from('workout_exercises').select('id, name').eq('user_id', userId),
        fetchAllRows<{ exercise_id: string; date: string; sets: unknown[] }>((from, to) =>
          sb.from('workout_entries').select('exercise_id, date, sets').eq('user_id', userId).gte('date', since).order('date').range(from, to),
        ),
      ])
      if (exRes.error || enRes.error) return // молча остаёмся с прошлым состоянием
      const exercises = (exRes.data || []) as { id: string; name: string }[]
      hasExercises.value = exercises.length > 0
      last.value = lastTrainedByMuscle(enRes.rows, exercises, today)
      done.value = new Set(MUSCLE_IDS.filter((m) => isTrainedRecently(last.value[m], today)))
      loaded.value = true
    } finally {
      running = false
    }
  }

  return { last, done, loaded, hasExercises, load }
}
