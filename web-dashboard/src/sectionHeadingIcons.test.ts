import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionHeading from './components/SectionHeading.vue'

// BACKLOG 58.9: заголовки блоков Дашборда со значком (как на остальных страницах) — без stripEmoji в :title у SectionHeading.
describe('заголовки блоков Дашборда: значок', () => {
  it('SectionHeading рисует значок SVG перед текстом', () => {
    const w = mount(SectionHeading, { props: { title: '📅 Ежедневные метрики', storageKey: 'x-test' } })
    expect(w.find('h2 svg').exists()).toBe(true)
    expect(w.find('h2').text()).toContain('Ежедневные метрики')
  })
})
