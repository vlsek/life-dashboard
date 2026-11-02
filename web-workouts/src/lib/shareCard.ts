import { MUSCLE_IDS, type MuscleId } from './muscles'
import { setsByMuscle } from './muscleHeat'
import { workingOf } from './sessionContract'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 80.10 «Шаринг картинкой», срез 1: PNG-карточка «моя неделя»: подходы по группам мышц и итоги. Без личных данных профиля (ни имени, ни аватара, ни веса).
// Данные считаются чистой функцией; рисование на canvas отдельно (drawShareCard) и проверяется глазами/в браузере.
export interface ShareRow { muscle: MuscleId; sets: number }
export interface ShareData { rows: ShareRow[]; totalSets: number; workoutDays: number; days: number; from: string; to: string }

type ExLite = Pick<Exercise, 'id' | 'name'>
type EntryLite = Pick<WorkoutEntry, 'exercise_id' | 'date' | 'sets'>

export const SHARE_MAX_ROWS = 8

export function shareData(entries: EntryLite[], exercises: ExLite[], today: string, sinceIso: string, days: number): ShareData {
  const byMuscle = setsByMuscle(entries, exercises, today, sinceIso)
  const rows = MUSCLE_IDS.map((m) => ({ muscle: m, sets: byMuscle.get(m) ?? 0 }))
    .filter((r) => r.sets > 0)
    .sort((a, b) => b.sets - a.sets)
    .slice(0, SHARE_MAX_ROWS)
  const dates = new Set<string>()
  let totalSets = 0
  for (const e of entries) {
    if (e.date < sinceIso || e.date > today) continue
    const n = workingOf(e.sets).length
    if (n === 0) continue
    totalSets += n
    dates.add(e.date)
  }
  return { rows, totalSets, workoutDays: dates.size, days, from: sinceIso, to: today }
}

export interface ShareLabels { title: string; period: string; total: string; daysLine: string; empty: string; muscle: (m: MuscleId) => string }
export const SHARE_W = 1080
export const SHARE_H = 1350

export function drawShareCard(canvas: HTMLCanvasElement, d: ShareData, l: ShareLabels, c: { bg: string; text: string; dim: string; accent: string }): void {
  canvas.width = SHARE_W
  canvas.height = SHARE_H
  const g = canvas.getContext('2d')
  if (!g) return
  g.fillStyle = c.bg
  g.fillRect(0, 0, SHARE_W, SHARE_H)
  g.textBaseline = 'alphabetic'
  g.fillStyle = c.text
  g.font = '700 64px system-ui, sans-serif'
  g.fillText(l.title, 80, 140)
  g.fillStyle = c.dim
  g.font = '400 36px system-ui, sans-serif'
  g.fillText(l.period, 80, 200)
  g.fillStyle = c.text
  g.font = '700 120px system-ui, sans-serif'
  g.fillText(String(d.totalSets), 80, 360)
  const textX = 80 + g.measureText(String(d.totalSets)).width + 40
  g.fillStyle = c.dim
  g.font = '400 36px system-ui, sans-serif'
  g.fillText(l.total, textX, 330)
  g.fillText(l.daysLine, textX, 380)
  if (d.rows.length === 0) {
    g.fillText(l.empty, 80, 520)
    return
  }
  const max = Math.max(...d.rows.map((r) => r.sets))
  const top = 470
  const step = 100
  const barX = 360
  const barW = SHARE_W - barX - 160
  d.rows.forEach((r, i) => {
    const y = top + i * step
    g.fillStyle = c.text
    g.font = '500 38px system-ui, sans-serif'
    g.fillText(l.muscle(r.muscle), 80, y + 40)
    g.fillStyle = c.dim
    g.globalAlpha = 0.25
    g.fillRect(barX, y + 8, barW, 44)
    g.globalAlpha = 1
    g.fillStyle = c.accent
    g.fillRect(barX, y + 8, Math.max(8, (r.sets / max) * barW), 44)
    g.fillStyle = c.text
    g.fillText(String(r.sets), barX + barW + 24, y + 44)
  })
}
