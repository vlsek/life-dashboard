import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressRing from './ProgressRing.vue'

const ring = (percent: number) => mount(ProgressRing, { props: { percent } })
const arc = (w: ReturnType<typeof ring>) => w.find('.arc').attributes('stroke-dasharray')!.split(' ').map(Number)

describe('ProgressRing', () => {
  it('процент округляется, ограничивается 0–100 и попадает в подпись и длину дуги', () => {
    expect(ring(37.6).find('text').text()).toBe('38%')
    expect(ring(250).attributes('data-percent')).toBe('100')
    expect(ring(-5).attributes('data-percent')).toBe('0')
    expect(ring(NaN).attributes('data-percent')).toBe('0')
    const [on, total] = arc(ring(50))
    expect(on / total).toBeCloseTo(0.5, 5)
    expect(arc(ring(0))[0]).toBe(0)
  })
})
