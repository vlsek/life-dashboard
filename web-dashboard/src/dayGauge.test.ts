import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarProgress from './components/AvatarProgress.vue'
import { dayGaugeStyle } from './lib/useDayGauge'

// BACKLOG 53.2 срез 2: кольцо дня вокруг аватарки рисует выбранный в «Кастомизации» вид.
const RING = { basePct: 0.5, bonusPct: 0, totalPct: 50, title: 'День' } as never
describe('AvatarProgress: вид кольца дня', () => {
  beforeEach(() => (dayGaugeStyle.value = 'ring'))
  it('обычное кольцо: дуга прогресса одна', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring: RING } })
    expect(w.findAll('[data-test="avatar-ring-arc"]')).toHaveLength(1)
    expect(w.findAll('[data-test="avatar-ring-seg"]')).toHaveLength(0)
  })
  it('пунктирное: 20 штрихов, 10 закрашены', () => {
    dayGaugeStyle.value = 'dashed'
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring: RING } })
    expect(w.findAll('[data-test="avatar-ring-seg"]')).toHaveLength(20)
    expect(w.findAll('[data-test="avatar-ring-arc"]')).toHaveLength(10)
  })
  it('со свечением: у дуги filter; рамка со своим свечением главнее', () => {
    dayGaugeStyle.value = 'glow'
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring: RING } })
    expect(w.find('[data-test="avatar-ring-arc"]').attributes('style')).toContain('drop-shadow')
  })

  it('циферблат: 12 штрихов, горит половина; градиент: defs с градиентом', async () => {
    dayGaugeStyle.value = 'ticks'
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring: RING } })
    const ticks = w.findAll('[data-test="day-ticks"] line')
    expect(ticks).toHaveLength(12)
    expect(ticks.filter((l) => l.attributes('stroke')?.includes('accent'))).toHaveLength(6)
    dayGaugeStyle.value = 'gradient'
    const g = mount(AvatarProgress, { props: { avatarUrl: null, ring: RING } })
    expect(g.find('linearGradient').exists()).toBe(true)
    expect(g.find('[data-test="day-ticks"]').exists()).toBe(false)
  })
})
