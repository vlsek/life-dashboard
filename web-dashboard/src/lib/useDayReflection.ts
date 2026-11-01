import { ref } from 'vue'
import { sb } from './supabase'
import { qUpsert } from './outboxClient'
import { cleanNote, isMissingColumn, isMood, shouldWrite, type Mood } from './dayReflection'

// Оценка и заметка выбранного дня (BACKLOG 75.3). Пишет только свои колонки daily_notes — items и planned_goals остаются как были.
// `supported` = false, пока в базе нет колонки mood (миграция 114): блок не показывается и «Сохранить день» ничего лишнего не пишет.
export function useDayReflection() {
  const supported = ref(true)
  const mood = ref<Mood | null>(null)
  const note = ref('')
  const had = ref(false)
  let token = 0

  async function load(userId: string, date: string) {
    const my = ++token
    mood.value = null
    note.value = ''
    had.value = false
    const { data, error } = await sb.from('daily_notes').select('mood, notes').eq('user_id', userId).eq('date', date).maybeSingle()
    if (my !== token) return // пока грузили, день уже сменился
    if (error) {
      if (isMissingColumn(error)) supported.value = false
      return
    }
    supported.value = true
    const row = data as { mood?: number | null; notes?: string | null } | null
    mood.value = isMood(row?.mood) ? row!.mood as Mood : null
    note.value = row?.notes ?? ''
    had.value = mood.value !== null || cleanNote(note.value) !== null
  }

  // true — записано или писать нечего
  async function save(userId: string, date: string): Promise<boolean> {
    if (!supported.value) return true
    const n = cleanNote(note.value)
    if (!shouldWrite(mood.value, n, had.value)) return true
    const { error } = await qUpsert(userId, 'daily_notes', `daily_notes:${date}:reflection`, { user_id: userId, date, mood: mood.value, notes: n }, 'user_id,date')
    if (error) return false
    had.value = mood.value !== null || n !== null
    return true
  }

  return { supported, mood, note, load, save }
}
