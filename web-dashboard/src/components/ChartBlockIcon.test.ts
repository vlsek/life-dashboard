import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartBlock from './ChartBlock.vue'

const points = [{ date: '2026-01-01', y: 10 }, { date: '2026-01-02', y: 12 }]

describe('ChartBlock: иконка метрики в заголовке (BACKLOG 10)', () => {
  it('svg-иконка рисуется перед названием', () => {
    const w = mount(ChartBlock, { props: { title: 'Отжимания', icon: 'svg:pushup', points } })
    const h4 = w.find('h4')
    expect(h4.find('svg').exists()).toBe(true)
    expect(h4.text()).toBe('Отжимания')
    w.unmount()
  })

  it('эмодзи без svg-аналога показывается как текст перед названием', () => {
    const w = mount(ChartBlock, { props: { title: 'Жир', icon: '🧈', points } })
    expect(w.find('h4').text()).toBe('🧈Жир')
    w.unmount()
  })

  it('без иконки — только название, без svg в заголовке', () => {
    const w = mount(ChartBlock, { props: { title: 'Талия', points } })
    expect(w.find('h4').find('svg').exists()).toBe(false)
    expect(w.find('h4').text()).toBe('Талия')
    w.unmount()
  })
})
