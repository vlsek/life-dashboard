import { ref } from 'vue'
import { sb } from './supabase'
import { addDaysIso, mondayOf } from './date'
import { friendlyError } from './friendlyError'
import { normalizePlanned, type PlannedEntry } from './planned'
import { repeatsDueOn, toPlanRepeat, type PlanRepeat, type RepeatSchedule } from './planRepeats'

// Композабл повторяющихся пунктов «Планов» (BACKLOG 1054, миграция 087). Нет таблицы (миграция не применена) — список пуст и
// available = false: блок и окно просто не показываются, «Планы» работают как раньше.
export function usePlanRepeats() {
  const repeats = ref<PlanRepeat[]>([])
  const weekNotes = ref<{ date: string; entries: PlannedEntry[] }[]>([])
  const available = ref(false)
  const error = ref<string | null>(null)

  async function load(userId: string, day: string) {
    const { data, error: e } = await sb.from('plan_repeats').select('id, text, time, schedule').eq('user_id', userId).order('created_at', { ascending: true })
    if (e) {
      repeats.value = []
      weekNotes.value = []
      available.value = false
      return
    }
    available.value = true
    repeats.value = ((data || []) as { id: string; text: string; time?: string | null; schedule?: unknown }[]).map(toPlanRepeat)
    // «N раз в неделю»: нужны отметки за неделю дня — читаем только неделю (и только если такие пункты есть)
    if (repeats.value.some((r) => r.schedule?.type === 'weekly')) {
      const monday = mondayOf(day)
      const { data: notes, error: ne } = await sb.from('daily_notes').select('date, planned_goals').eq('user_id', userId).gte('date', monday).lte('date', addDaysIso(monday, 6))
      weekNotes.value = ne ? [] : ((notes || []) as { date: string; planned_goals: unknown }[]).map((n) => ({ date: n.date, entries: normalizePlanned(n.planned_goals) }))
    } else weekNotes.value = []
  }

  // Что предложить на день `day` при текущем плане дня.
  const dueOn = (day: string, planToday: PlannedEntry[]): PlanRepeat[] => repeatsDueOn(repeats.value, day, planToday, weekNotes.value)

  // Добавить повторяющийся пункт; ошибка записи летит вызывающему (окно показывает её и остаётся открытым).
  async function add(userId: string, text: string, time: string | null, schedule: RepeatSchedule): Promise<void> {
    const row: Record<string, unknown> = { user_id: userId, text: text.trim(), schedule }
    if (time) row.time = time
    const { data, error: e } = await sb.from('plan_repeats').insert(row).select('id, text, time, schedule').single()
    if (e || !data) throw e ?? new Error('no data')
    repeats.value = [...repeats.value, toPlanRepeat(data as { id: string; text: string; time?: string | null; schedule?: unknown })]
  }

  async function remove(id: string): Promise<boolean> {
    const before = repeats.value
    repeats.value = before.filter((r) => r.id !== id) // сразу убираем из списка; при ошибке вернём
    const { error: e } = await sb.from('plan_repeats').delete().eq('id', id)
    if (e) {
      repeats.value = before
      error.value = friendlyError(e)
      return false
    }
    error.value = null
    return true
  }

  return { repeats, weekNotes, available, error, load, dueOn, add, remove }
}
