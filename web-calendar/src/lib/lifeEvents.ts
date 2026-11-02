// «События жизни» в календаре (BACKLOG 76.1): тренировки, дни челленджей и сроки вех по датам.
// Только чтение чужих разделов; ошибка любого запроса просто убирает свои точки (календарь не ломается).
export interface LifeEvents {
  workouts: number // записей тренировки за день
  challenges: { id: string; title: string; day: number | null }[] // «день N» от даты старта челленджа
  milestones: { id: string; name: string }[] // вехи со сроком в этот день
}

export interface WorkoutRow { date: string }
export interface ChallengeEntryRow { date: string; challenge_id: string }
export interface ChallengeInstanceRow { id: string; title: string; start_date: string | null }
export interface MilestoneRow { id: string; name: string; due_date: string | null }

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Номер дня челленджа: дата старта — день 1; раньше старта или без старта — нет номера
export function challengeDay(startDate: string | null | undefined, date: string): number | null {
  if (!startDate) return null
  const n = Math.round((parse(date).getTime() - parse(startDate).getTime()) / 86400000) + 1
  return n >= 1 ? n : null
}

export const emptyEvents = (): LifeEvents => ({ workouts: 0, challenges: [], milestones: [] })
export const hasEvents = (e: LifeEvents | undefined | null): boolean => !!e && (e.workouts > 0 || e.challenges.length > 0 || e.milestones.length > 0)

export function groupLifeEvents(src: {
  workouts?: WorkoutRow[] | null
  challengeEntries?: ChallengeEntryRow[] | null
  instances?: ChallengeInstanceRow[] | null
  milestones?: MilestoneRow[] | null
}): Record<string, LifeEvents> {
  const out: Record<string, LifeEvents> = {}
  const at = (d: string) => (out[d] ||= emptyEvents())
  for (const w of src.workouts || []) if (w.date) at(w.date).workouts++
  const inst = new Map((src.instances || []).map((i) => [i.id, i]))
  const seen = new Set<string>() // одна запись челленджа в день — один раз, сколько бы подходов ни было
  for (const e of src.challengeEntries || []) {
    const i = inst.get(e.challenge_id)
    if (!e.date || !i || seen.has(e.date + '|' + e.challenge_id)) continue
    seen.add(e.date + '|' + e.challenge_id)
    at(e.date).challenges.push({ id: i.id, title: i.title, day: challengeDay(i.start_date, e.date) })
  }
  for (const m of src.milestones || []) if (m.due_date) at(m.due_date).milestones.push({ id: m.id, name: m.name })
  return out
}
