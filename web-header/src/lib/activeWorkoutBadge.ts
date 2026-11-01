// Плашка «Идёт тренировка» в общей шапке (BACKLOG 69.2, срез 4). Читает ЧЕРНОВИК активной тренировки раздела «Тренировки» из localStorage —
// тот же ключ и формат, что у web-workouts/src/lib/activeWorkout.ts (копия, страж — activeWorkoutBadge.test.ts). Ничего не пишет.
export const DRAFT_KEY = 'workouts.activeDraft.v1'

export interface ActiveInfo { startedMs: number; manualMinutes: number | null }
export function readActive(store: Pick<Storage, 'getItem'>): ActiveInfo | null {
  try {
    const o = JSON.parse(store.getItem(DRAFT_KEY) || 'null')
    const ms = o && o.v === 1 ? Date.parse(o.started_at) : NaN
    if (!Number.isFinite(ms)) return null
    return { startedMs: ms, manualMinutes: Number.isInteger(o.manual_minutes) && o.manual_minutes > 0 ? o.manual_minutes : null }
  } catch { return null }
}
export function elapsedSec(a: ActiveInfo, nowMs: number): number {
  return a.manualMinutes != null ? a.manualMinutes * 60 : Math.max(0, Math.floor((nowMs - a.startedMs) / 1000))
}
export function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`
}
// На самой странице тренировок плашка не нужна: там и так экран тренировки
export const onWorkoutsPage = (pathname: string): boolean => /^\/workouts(\/|$)/.test(pathname)
