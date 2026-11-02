import { describe, expect, it } from 'vitest'
import { challengeDay, groupLifeEvents, hasEvents, emptyEvents } from './lib/lifeEvents'

describe('события жизни в календаре (76.1)', () => {
  it('номер дня челленджа: старт — день 1; до старта и без старта — нет номера', () => {
    expect(challengeDay('2026-10-01', '2026-10-01')).toBe(1)
    expect(challengeDay('2026-10-01', '2026-10-10')).toBe(10)
    expect(challengeDay('2026-10-01', '2026-09-30')).toBeNull()
    expect(challengeDay(null, '2026-10-10')).toBeNull()
  })
  it('тренировки считаются записями за день', () => {
    const g = groupLifeEvents({ workouts: [{ date: '2026-10-05' }, { date: '2026-10-05' }, { date: '2026-10-06' }] })
    expect(g['2026-10-05'].workouts).toBe(2)
    expect(g['2026-10-06'].workouts).toBe(1)
  })
  it('челлендж: «день N», запись раз в день, чужой/удалённый челлендж пропускается', () => {
    const g = groupLifeEvents({
      challengeEntries: [{ date: '2026-10-05', challenge_id: 'c1' }, { date: '2026-10-05', challenge_id: 'c1' }, { date: '2026-10-05', challenge_id: 'gone' }],
      instances: [{ id: 'c1', title: 'Отжимания', start_date: '2026-10-01' }],
    })
    expect(g['2026-10-05'].challenges).toEqual([{ id: 'c1', title: 'Отжимания', day: 5 }])
  })
  it('вехи по сроку; без срока пропускаются', () => {
    const g = groupLifeEvents({ milestones: [{ id: 'm1', name: 'Марафон', due_date: '2026-10-20' }, { id: 'm2', name: 'Без срока', due_date: null }] })
    expect(g['2026-10-20'].milestones).toEqual([{ id: 'm1', name: 'Марафон' }])
    expect(Object.keys(g)).toEqual(['2026-10-20'])
  })
  it('пустые и отсутствующие источники дают пустую карту; hasEvents различает дни', () => {
    expect(groupLifeEvents({})).toEqual({})
    expect(groupLifeEvents({ workouts: null, milestones: null })).toEqual({})
    expect(hasEvents(emptyEvents())).toBe(false)
    expect(hasEvents(undefined)).toBe(false)
    expect(hasEvents({ workouts: 1, challenges: [], milestones: [] })).toBe(true)
  })
})
