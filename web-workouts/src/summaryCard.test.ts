import { describe, it, expect } from 'vitest'
import { summaryCardModel, drawSummaryCard, SUMMARY_CARD_MAX_RECORDS, SUMMARY_CARD_MAX_MUSCLES, SUMMARY_CARD_NAME_MAX } from './lib/summaryCard'
import { fmtVolume, type WorkoutSummaryData } from './lib/summary'

const L = { title: 'Done', time: 'Time', min: 'min', sets: 'Sets', volume: 'Vol', exercises: 'Ex', records: 'PR', moreRecords: (n: number) => `+${n}`, recordLine: (r: { exerciseId: string }) => 'rec ' + r.exerciseId, muscle: (m: string) => 'm_' + m }
const rec = (i: number) => ({ exerciseId: 'e' + i, kind: 'weight' as const, reps: 5, weight: 100, duration: null })
const base = (o: Partial<WorkoutSummaryData> = {}): WorkoutSummaryData => ({ minutes: 45, exerciseCount: 3, workingSets: 9, volume: 12500, records: [], muscles: [], ...o })

describe('summaryCardModel', () => {
  it('плитки и форматирование объёма', () => {
    const m = summaryCardModel(base(), 'кг', '07.11.2026', L)
    expect(m.stats.map((s) => s.value)).toEqual(['45 min', '9', fmtVolume(12500) + ' кг', '3'])
    expect(m.title).toBe('Done')
  })
  it('название тренировки вместо заголовка, обрезается; заметка не попадает', () => {
    const m = summaryCardModel(base({ name: ' ' + 'x'.repeat(100), notes: 'секрет' }), 'кг', 'd', L)
    expect(m.title.length).toBe(SUMMARY_CARD_NAME_MAX)
    expect(JSON.stringify(m)).not.toContain('секрет')
  })
  it('рекорды и мышцы ограничены, остаток считается', () => {
    const m = summaryCardModel(base({ records: Array.from({ length: 8 }, (_, i) => rec(i)), muscles: Array.from({ length: 12 }, (_, i) => 'x' + i) }), 'кг', 'd', L)
    expect(m.records).toHaveLength(SUMMARY_CARD_MAX_RECORDS)
    expect(m.moreRecords).toBe(8 - SUMMARY_CARD_MAX_RECORDS)
    expect(m.muscles).toHaveLength(SUMMARY_CARD_MAX_MUSCLES)
    expect(m.muscles[0]).toBe('m_x0')
  })
})

describe('drawSummaryCard', () => {
  it('рисует заголовок, плитки и рекорды на ctx', () => {
    const texts: string[] = []
    const g = new Proxy({ fillText: (s: string) => texts.push(s) } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : () => undefined), set: () => true })
    const canvas = { getContext: () => g } as unknown as HTMLCanvasElement
    const m = summaryCardModel(base({ records: [rec(1), rec(2), rec(3), rec(4), rec(5), rec(6)], muscles: ['a', 'b'] }), 'кг', 'D', L)
    drawSummaryCard(canvas, m, L, { bg: '#000', text: '#fff', dim: '#999', accent: '#00f' })
    expect(canvas.width).toBe(1080)
    expect(texts).toContain('Done')
    expect(texts).toContain('45 min')
    expect(texts).toContain('rec e1')
    expect(texts).toContain('+1')
    expect(texts).toContain('m_a · m_b')
  })
})
