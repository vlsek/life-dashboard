import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StreakFlame from './StreakFlame.vue'

describe('StreakFlame', () => {
  it('lit: renders the two-tone flame with the animated .streak-flame class', () => {
    const w = mount(StreakFlame, { props: { lit: true } })
    const svg = w.find('svg')
    expect(svg.classes()).toContain('streak-flame')
    expect(w.find('.fl-outer').exists()).toBe(true)
    expect(w.find('.fl-inner').exists()).toBe(true)
    w.unmount()
  })

  it('unlit: renders the dashed outline, no fill classes, no animated class', () => {
    const w = mount(StreakFlame, { props: { lit: false } })
    const svg = w.find('svg')
    expect(svg.classes()).not.toContain('streak-flame')
    expect(svg.attributes('stroke-dasharray')).toBe('2.6 2.2')
    expect(w.find('.fl-outer').exists()).toBe(false)
    w.unmount()
  })
})
