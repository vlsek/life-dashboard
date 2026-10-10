import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricStreakBadge from './components/MetricStreakBadge.vue'

const live = (w: ReturnType<typeof mount>) => w.find('[data-test="streak-flame-live"]')

describe('MetricStreakBadge: живое пламя у метрики со стриком (BACKLOG 18, хвост)', () => {
  it('меньше 7 дней — статичный огонёк', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 6, todayCounted: true } } })
    expect(live(w).exists()).toBe(false)
    expect(w.find('.n').text()).toBe('6')
  })
  it('7+ дней и засчитано сегодня — живое пламя меньшего размера, число на месте', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 7, todayCounted: true } } })
    expect(live(w).exists()).toBe(true)
    expect(live(w).attributes('width')).toBe('16')
    expect(w.find('.n').text()).toBe('7')
  })
  it('не засчитано сегодня или недельная серия — без живого пламени', () => {
    expect(live(mount(MetricStreakBadge, { props: { info: { streak: 30, todayCounted: false } } })).exists()).toBe(false)
    expect(live(mount(MetricStreakBadge, { props: { info: { streak: 30, unit: 'w', todayCounted: true } } })).exists()).toBe(false)
  })
})
