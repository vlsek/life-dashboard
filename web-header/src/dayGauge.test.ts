import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DayWeekBadge from './components/DayWeekBadge.vue'
import { dayGaugeStyle } from './lib/useDayGauge'

// BACKLOG 53.2 срез 2: бейдж дня в шапке рисует выбранный в «Кастомизации» вид кольца.
const PROPS = { kind: 'day' as const, basePct: 0.5, bonusPct: 0, totalPct: 50, title: 'День' }
describe('DayWeekBadge: вид кольца дня', () => {
  beforeEach(() => (dayGaugeStyle.value = 'ring'))
  it('обычное кольцо: две окружности, без штрихов', () => {
    const w = mount(DayWeekBadge, { props: PROPS })
    expect(w.findAll('circle')).toHaveLength(2)
    expect(w.findAll('[data-test="day-seg"]')).toHaveLength(0)
  })
  it('пунктирное: 20 штрихов, половина закрашена', () => {
    dayGaugeStyle.value = 'dashed'
    const w = mount(DayWeekBadge, { props: PROPS })
    const segs = w.findAll('[data-test="day-seg"]')
    expect(segs).toHaveLength(20)
    expect(segs.filter((g) => g.findAll('path').length === 2)).toHaveLength(10)
  })
  it('со свечением: дуга получает filter', () => {
    dayGaugeStyle.value = 'glow'
    const w = mount(DayWeekBadge, { props: PROPS })
    expect(w.findAll('circle')[1].attributes('style')).toContain('drop-shadow')
  })
  it('неделя не меняется от вида дня', () => {
    dayGaugeStyle.value = 'dashed'
    const w = mount(DayWeekBadge, { props: { ...PROPS, kind: 'week' as const } })
    expect(w.findAll('[data-test="day-seg"]')).toHaveLength(0)
  })

  it('циферблат: 12 штрихов, горит половина; градиент: defs с градиентом', async () => {
    dayGaugeStyle.value = 'ticks'
    const w = mount(DayWeekBadge, { props: PROPS })
    const ticks = w.findAll('[data-test="day-ticks"] line')
    expect(ticks).toHaveLength(12)
    expect(ticks.filter((l) => l.attributes('stroke')?.includes('accent'))).toHaveLength(6)
    dayGaugeStyle.value = 'gradient'
    const g = mount(DayWeekBadge, { props: PROPS })
    expect(g.find('linearGradient').exists()).toBe(true)
    expect(g.find('[data-test="day-ticks"]').exists()).toBe(false)
  })
})
