import { ref } from 'vue'
import { sb } from './supabase'

// Серия «выполняю цели каждый день» (BACKLOG 60.1, миграция 079 `get_my_goals_streak`): день засчитан, если выполнена хотя бы одна цель; дни паузы серию не рвут.
// Только чтение: огоньки/баллы за эту серию не начисляются. Нет миграции или ошибка — плашки просто нет.
export interface GoalsStreak {
  current: number
  best: number
}

const int = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

export function parseGoalsStreak(raw: unknown): GoalsStreak | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const current = int(r.current)
  const best = int(r.best)
  if (current === null || best === null) return null
  return { current, best: Math.max(best, current) }
}

export async function fetchGoalsStreak(): Promise<GoalsStreak | null> {
  try {
    const { data, error } = await sb.rpc('get_my_goals_streak')
    if (error) return null
    return parseGoalsStreak(data)
  } catch {
    return null
  }
}

export function useGoalsStreak() {
  const streak = ref<GoalsStreak | null>(null)
  async function load() {
    streak.value = await fetchGoalsStreak()
  }
  return { streak, load }
}

// «1 день» / «2 дня» / «5 дней» (ru); en — «1 day» / «2 days»
export function daysWord(n: number, lang: 'ru' | 'en'): string {
  if (lang === 'en') return n === 1 ? 'day' : 'days'
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня'
  return 'дней'
}
