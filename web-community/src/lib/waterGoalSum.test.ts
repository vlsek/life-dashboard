import { describe, expect, it } from 'vitest'
import { defaultGoalSum } from './category'
import { applyWaterGoal } from './waterGoal'

// «Сумма целей» для линии цели на сравнении — у воды с пустой нормой считается по эффективной норме (BACKLOG 14, «остаток после v1.92»).
const m = (o: Record<string, unknown>) => ({ id: 'x', type: 'number', name: 'Вода', icon: 'svg:droplet', goal_value: null as number | null, position: 1, ...o })

describe('defaultGoalSum с эффективной нормой воды', () => {
  it('вода без нормы: 0 в сумме (было) → 2400 после подстановки; вместе с другой метрикой — суммируются', () => {
    const list = [m({}), m({ id: 'y', name: 'Бег', icon: '🏃', goal_value: 5000, position: 2 })]
    expect(defaultGoalSum(list)).toBe(5000)
    expect(defaultGoalSum(applyWaterGoal(list, 2400))).toBe(7400)
  })
  it('ручная норма воды не перетирается', () => {
    expect(defaultGoalSum(applyWaterGoal([m({ goal_value: 1500 })], 2400))).toBe(1500)
  })
})
