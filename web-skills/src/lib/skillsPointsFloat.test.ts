import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POINTS_FLOAT, type PointsFloatDetail } from './pointsFloat'

// «+N / −N с монетой» при освоении навыка и прочтении книги (BACKLOG 14): очки как в балансе (пусто → 10), анимация — после подтверждённой записи.
const db = vi.hoisted(() => ({ fail: false, updates: [] as any[] }))
vi.mock('./supabase', () => ({
  sb: {
    from: () => ({
      update: (patch: any) => ({
        eq: () => {
          if (db.fail) return Promise.resolve({ error: { message: 'boom' } })
          db.updates.push(patch)
          return Promise.resolve({ error: null })
        },
      }),
    }),
  },
}))

import { useSkills } from './useSkills'
import { useBooks } from './useBooks'

const skill = (o: Partial<any> = {}): any => ({ id: 's1', user_id: 'u', name: 'S', progress: 0, step: 10, points: 10, mastered: false, created_at: '', ...o })
const book = (o: Partial<any> = {}): any => ({ id: 'b1', user_id: 'u', title: 'B', author: null, points: 10, status: 'to_read', done_date: null, created_at: '', ...o })
const got: number[] = []
const onFloat = (e: Event) => got.push((e as CustomEvent<PointsFloatDetail>).detail.delta)

beforeEach(() => {
  got.length = 0
  db.fail = false
  db.updates = []
  window.addEventListener(POINTS_FLOAT, onFloat)
})
afterEach(() => window.removeEventListener(POINTS_FLOAT, onFloat))

describe('навыки: баллы-анимация', () => {
  it('галочка «освоено» → +points, снятие → −points', async () => {
    const { toggleMastered } = useSkills()
    await toggleMastered(skill({ points: 25 }))
    await toggleMastered(skill({ points: 25, mastered: true, progress: 100 }))
    expect(got).toEqual([25, -25])
  })

  it('очков нет (null) — по умолчанию 10, как в балансе', async () => {
    const { toggleMastered } = useSkills()
    await toggleMastered(skill({ points: null }))
    expect(got).toEqual([10])
  })

  it('прогресс +step: промежуточные шаги без анимации, дошёл до 100% → +points, откатил с 100% → −points', async () => {
    const { bumpProgress } = useSkills()
    await bumpProgress(skill({ progress: 50 }), 1)
    expect(got).toEqual([])
    await bumpProgress(skill({ progress: 90 }), 1)
    expect(got).toEqual([10])
    await bumpProgress(skill({ progress: 100, mastered: true }), 1) // уже 100% и освоен — ничего не изменилось
    expect(got).toEqual([10])
    await bumpProgress(skill({ progress: 100, mastered: true }), -1)
    expect(got).toEqual([10, -10])
  })

  it('ошибка записи — анимации нет', async () => {
    const { toggleMastered } = useSkills()
    db.fail = true
    await expect(toggleMastered(skill())).rejects.toBeTruthy()
    expect(got).toEqual([])
  })
})

describe('книги: баллы-анимация', () => {
  it('прочитал → +points, вернул в «хочу прочитать» → −points; пусто → 10', async () => {
    const { toggleDone } = useBooks()
    await toggleDone(book({ points: 15 }))
    await toggleDone(book({ points: 15, status: 'done' }))
    await toggleDone(book({ points: null }))
    expect(got).toEqual([15, -15, 10])
  })

  it('ошибка записи — анимации нет', async () => {
    const { toggleDone } = useBooks()
    db.fail = true
    await expect(toggleDone(book())).rejects.toBeTruthy()
    expect(got).toEqual([])
  })
})
