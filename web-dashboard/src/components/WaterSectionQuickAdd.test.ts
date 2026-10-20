import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 67.1: блок «Вода» принимает запрос на добавление из напоминания и пишет воду обычным путём (addMl за сегодня).
const h = vi.hoisted(() => ({ addMl: vi.fn(async () => 200) }))
vi.mock('../lib/useWater', () => ({
  useWater: () => ({
    metric: ref({ id: 'w' }), normMl: ref(2000), autoNormMl: ref(null), weightKg: ref(null), heightCm: ref(null), saveHeight: vi.fn(), todayMl: ref(0), loaded: ref(true),
    error: ref(null), saveError: ref(null), init: vi.fn(), addMl: h.addMl, setTotal: vi.fn(), undoLast: vi.fn(), removeLogEntry: vi.fn(), canUndo: vi.fn(), dayLog: vi.fn(() => ({ rows: [], source: 'local' })),
    loadDayLog: vi.fn(), getMlForDate: vi.fn(async () => 0), saveGoal: vi.fn(), resetGoalToAuto: vi.fn(), createWaterMetric: vi.fn(),
  }),
}))
import WaterSection from './WaterSection.vue'
import { requestWaterAdd } from '../lib/waterQuickAdd'
import { todayStr } from '../lib/date'

describe('WaterSection: запрос из напоминания', () => {
  it('requestWaterAdd(200) → addMl(200, сегодня); после размонтирования не реагирует', async () => {
    const w = mount(WaterSection, { props: { userId: 'u1' } })
    requestWaterAdd(200)
    await Promise.resolve()
    expect(h.addMl).toHaveBeenCalledWith(200, todayStr(), undefined)
    w.unmount()
    h.addMl.mockClear()
    requestWaterAdd(200)
    expect(h.addMl).not.toHaveBeenCalled()
  })
})
