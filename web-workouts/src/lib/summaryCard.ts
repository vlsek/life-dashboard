import { fmtVolume, type WorkoutSummaryData } from './summary'

// BACKLOG 69.10: «Поделиться картинкой» для итогов тренировки. Чистый расчёт строк (summaryCardModel) + рисование на canvas (drawSummaryCard).
// Без имени, аватара и чужого брендинга; заметка тренировки на картинку не попадает.
export interface SummaryCardStat { label: string; value: string }
export interface SummaryCardModel { title: string; date: string; stats: SummaryCardStat[]; records: string[]; moreRecords: number; muscles: string[] }
export interface SummaryCardLabels { title: string; time: string; min: string; sets: string; volume: string; exercises: string; records: string; moreRecords: (n: number) => string; recordLine: (r: WorkoutSummaryData['records'][number]) => string; muscle: (m: string) => string }

export const SUMMARY_CARD_MAX_RECORDS = 5
export const SUMMARY_CARD_MAX_MUSCLES = 8
export const SUMMARY_CARD_W = 1080
export const SUMMARY_CARD_H = 1350
export const SUMMARY_CARD_NAME_MAX = 40

export function summaryCardModel(d: WorkoutSummaryData, unit: string, date: string, l: SummaryCardLabels): SummaryCardModel {
  const name = (d.name ?? '').trim()
  const records = d.records.slice(0, SUMMARY_CARD_MAX_RECORDS).map((r) => l.recordLine(r))
  return {
    title: name ? name.slice(0, SUMMARY_CARD_NAME_MAX) : l.title,
    date,
    stats: [
      { label: l.time, value: d.minutes + ' ' + l.min },
      { label: l.sets, value: String(d.workingSets) },
      { label: l.volume, value: fmtVolume(d.volume) + ' ' + unit },
      { label: l.exercises, value: String(d.exerciseCount) },
    ],
    records,
    moreRecords: Math.max(0, d.records.length - SUMMARY_CARD_MAX_RECORDS),
    muscles: d.muscles.slice(0, SUMMARY_CARD_MAX_MUSCLES).map(l.muscle),
  }
}

// Обрезаем строку «…», чтобы она не выходила за правый край карточки
export function fitText(g: { measureText: (s: string) => { width: number } }, text: string, maxW: number): string {
  if (g.measureText(text).width <= maxW) return text
  let lo = 0, hi = text.length
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (g.measureText(text.slice(0, mid) + '…').width <= maxW) lo = mid; else hi = mid - 1 }
  return text.slice(0, lo).trimEnd() + '…'
}
const TEXT_MAX_W = SUMMARY_CARD_W - 160

export function drawSummaryCard(canvas: HTMLCanvasElement, m: SummaryCardModel, l: Pick<SummaryCardLabels, 'records' | 'moreRecords'>, c: { bg: string; text: string; dim: string; accent: string }): void {
  canvas.width = SUMMARY_CARD_W
  canvas.height = SUMMARY_CARD_H
  const g = canvas.getContext('2d')
  if (!g) return
  g.fillStyle = c.bg
  g.fillRect(0, 0, SUMMARY_CARD_W, SUMMARY_CARD_H)
  g.textBaseline = 'alphabetic'
  g.fillStyle = c.text
  g.font = '700 64px system-ui, sans-serif'
  g.fillText(fitText(g, m.title, TEXT_MAX_W), 80, 140)
  g.fillStyle = c.dim
  g.font = '400 36px system-ui, sans-serif'
  g.fillText(m.date, 80, 200)
  m.stats.forEach((s, i) => {
    const x = 80 + (i % 2) * 480
    const y = 300 + Math.floor(i / 2) * 200
    g.fillStyle = c.dim
    g.globalAlpha = 0.15
    g.fillRect(x, y - 60, 440, 160)
    g.globalAlpha = 1
    g.fillStyle = c.dim
    g.font = '400 32px system-ui, sans-serif'
    g.fillText(s.label, x + 24, y - 14)
    g.fillStyle = c.text
    g.font = '700 56px system-ui, sans-serif'
    g.fillText(s.value, x + 24, y + 60)
  })
  let y = 740
  if (m.records.length) {
    g.fillStyle = c.accent
    g.font = '700 40px system-ui, sans-serif'
    g.fillText('★ ' + l.records, 80, y)
    y += 20
    g.fillStyle = c.text
    g.font = '400 34px system-ui, sans-serif'
    for (const r of m.records) { y += 54; g.fillText(fitText(g, r, TEXT_MAX_W), 80, y) }
    if (m.moreRecords > 0) { y += 54; g.fillStyle = c.dim; g.fillText(l.moreRecords(m.moreRecords), 80, y) }
    y += 60
  }
  if (m.muscles.length) {
    g.fillStyle = c.dim
    g.font = '400 34px system-ui, sans-serif'
    g.fillText(fitText(g, m.muscles.join(' · '), TEXT_MAX_W), 80, Math.min(y + 40, SUMMARY_CARD_H - 80))
  }
}
