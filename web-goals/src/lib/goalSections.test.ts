import { describe, expect, it } from 'vitest'
import { upcomingDeadlines } from './goalSections'
import type { Goal } from './types'

const g = (id: string, deadline: string | null, done = false): Goal => ({ id, user_id: 'u', name: id, points: 5, category: 'c', stages: 1, current_stage: 0, done, done_date: null, deadline, difficulty: null, created_at: '2026-01-01' }) as Goal

describe('«Ближайшие сроки» (BACKLOG 44.2)', () => {
  const today = new Date(2026, 9, 10)
  it('просроченные и в ближайшие 14 дней, по возрастанию срока; без срока, далёкие и выполненные не входят', () => {
    const list = [g('far', '2026-12-01'), g('none', null), g('soon', '2026-10-15'), g('over', '2026-10-01'), g('edge', '2026-10-24'), g('out', '2026-10-25'), g('done', '2026-10-11', true)]
    expect(upcomingDeadlines(list, today).map((x) => x.id)).toEqual(['over', 'soon', 'edge'])
  })
  it('окно настраивается', () => {
    expect(upcomingDeadlines([g('a', '2026-10-12'), g('b', '2026-10-20')], today, 3).map((x) => x.id)).toEqual(['a'])
  })
})
