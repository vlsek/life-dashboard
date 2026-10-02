import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POINTS_FLOAT, type PointsFloatDetail } from './pointsFloat'

// «+N / −N с монетой» при закрытии цели (BACKLOG 14): сумма — очки цели (пусто → 5, как в балансе), анимация — только после подтверждённой записи.
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

import { useGoals } from './useGoals'

const goal = (o: Partial<any> = {}): any => ({ id: 'g1', user_id: 'u', name: 'G', points: 5, category: '', stages: 1, current_stage: 0, done: false, done_date: null, deadline: null, difficulty: null, created_at: '', ...o })
const got: number[] = []
const onFloat = (e: Event) => got.push((e as CustomEvent<PointsFloatDetail>).detail.delta)

beforeEach(() => {
  got.length = 0
  db.fail = false
  db.updates = []
  window.addEventListener(POINTS_FLOAT, onFloat)
})
afterEach(() => window.removeEventListener(POINTS_FLOAT, onFloat))

describe('цели: баллы-анимация', () => {
  it('отметил выполненной → +points, снял отметку → −points', async () => {
    const { toggleGoal } = useGoals()
    await toggleGoal(goal({ points: 20 }))
    await toggleGoal(goal({ points: 20, done: true }))
    expect(got).toEqual([20, -20])
  })

  it('очков нет (null) — по умолчанию 5, как в балансе', async () => {
    const { toggleGoal } = useGoals()
    await toggleGoal(goal({ points: null }))
    expect(got).toEqual([5])
  })

  it('многоэтапная: промежуточные шаги без анимации, последний этап → +points, шаг назад с последнего → −points', async () => {
    const { stepGoal } = useGoals()
    await stepGoal(goal({ stages: 3, current_stage: 0 }), 1)
    await stepGoal(goal({ stages: 3, current_stage: 1 }), 1)
    expect(got).toEqual([])
    await stepGoal(goal({ stages: 3, current_stage: 2 }), 1)
    expect(got).toEqual([5])
    await stepGoal(goal({ stages: 3, current_stage: 3, done: true }), -1)
    expect(got).toEqual([5, -5])
  })

  it('тап по этапу: сразу на последний → +points; на промежуточный из выполненной → −points', async () => {
    const { setStage } = useGoals()
    await setStage(goal({ stages: 4, current_stage: 1, points: 8 }), 4)
    expect(got).toEqual([8])
    await setStage(goal({ stages: 4, current_stage: 4, done: true, points: 8 }), 2)
    expect(got).toEqual([8, -8])
    await setStage(goal({ stages: 4, current_stage: 1, points: 8 }), 3) // не дошёл до конца
    expect(got).toEqual([8, -8])
  })

  it('правка числа этапов закрыла цель сама → +points (по очкам из формы); правка без смены статуса — тишина', async () => {
    const { updateGoal } = useGoals()
    const form = (o: Partial<any> = {}): any => ({ name: 'G', points: 12, category: '', stages: 2, difficulty: null, deadline: '', ...o })
    await updateGoal(goal({ stages: 3, current_stage: 2 }), form({ stages: 2 }), 'none') // 2 из 2 → закрыта
    expect(got).toEqual([12])
    await updateGoal(goal({ stages: 3, current_stage: 1 }), form({ stages: 3 }), 'none') // всё ещё открыта
    expect(got).toEqual([12])
  })

  it('ошибка записи в БД — анимации нет, ошибка пробрасывается', async () => {
    const { toggleGoal } = useGoals()
    db.fail = true
    await expect(toggleGoal(goal())).rejects.toBeTruthy()
    expect(got).toEqual([])
  })
})
