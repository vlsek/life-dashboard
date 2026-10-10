import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarProgress from './components/AvatarProgress.vue'
import { dayGaugeStyle } from './lib/useDayGauge'

// BACKLOG 53.2 срез 2: кольцо дня вокруг аватарки рисует выбранный в «Кастомизации» вид.
const ring = { basePct: 0.5, bonusPct: 0, totalPct: 50, title: 'День' } as never
describe('AvatarProgress: вид кольца дня', () => {
  beforeEach(() => (dayGaugeStyle.value = 'ring'))
  it('обычное кольцо: дуга прогресса одна', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring } })
    expect(w.findAll('[data-test="avatar-ring-arc"]')).toHaveLength(1)
    expect(w.findAll('[data-test="avatar-ring-seg"]')).toHaveLength(0)
  })
  it('пунктирное: 20 штрихов, 10 закрашены', () => {
    dayGaugeStyle.value = 'dashed'
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring } })
    expect(w.findAll('[data-test="avatar-ring-seg"]')).toHaveLength(20)
    expect(w.findAll('[data-test="avatar-ring-arc"]')).toHaveLength(10)
  })
  it('со свечением: у дуги filter; рамка со своим свечением главнее', () => {
    dayGaugeStyle.value = 'glow'
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring } })
    expect(w.find('[data-test="avatar-ring-arc"]').attributes('style')).toContain('drop-shadow')
  })
})
