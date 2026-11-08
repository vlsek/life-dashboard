import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkoutSummary from './WorkoutSummary.vue'
import type { WorkoutSummaryData } from '../lib/summary'

const data = (muscles: string[]): WorkoutSummaryData => ({ minutes: 30, exerciseCount: 1, workingSets: 3, volume: 900, records: [], muscles })
const mountIt = (muscles: string[]) => mount(WorkoutSummary, { props: { data: data(muscles), exercises: [], unit: 'кг' } })

describe('WorkoutSummary: карта мышц (69.10)', () => {
  it('подсвечивает только задействованные мышцы', () => {
    const w = mountIt(['chest'])
    const done = w.findAll('[data-testid="sm-body"] [data-state="done"]')
    const idle = w.findAll('[data-testid="sm-body"] [data-state="idle"]')
    expect(done.length).toBeGreaterThan(0)
    expect(idle.length).toBeGreaterThan(0)
    expect(done.every((n) => n.attributes('data-muscle') === 'chest')).toBe(true)
  })
  it('без мышц блока нет', () => {
    expect(mountIt([]).find('[data-testid="sm-body"]').exists()).toBe(false)
  })
})
