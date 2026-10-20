import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Avatar from './components/Avatar.vue'

// BACKLOG 44.18з: аватар в Сообществе у рамки-орнамента обёрнут в слой с SVG; у обычных рамок и без рамки разметка прежняя.
describe('Avatar: рамки-орнаменты', () => {
  it('картинка и круг с инициалами: у «Лаврового венка» есть обёртка с SVG, тень-кольцо сохранена', () => {
    for (const url of ['https://x/a.png', null]) {
      const w = mount(Avatar, { props: { name: 'Анна Волкова', url, size: 40, frame: 'frame_wreath' } })
      expect(w.find('[data-test="frame-decor-wrap"]').exists(), String(url)).toBe(true)
      expect(w.find('svg[data-test="frame-decor"]').exists(), String(url)).toBe(true)
      const av = w.find(url ? 'img' : 'span.rounded-full')
      expect(av.exists(), String(url)).toBe(true)
      expect(av.attributes('style')).toContain('box-shadow')
      expect(av.attributes('style')).toContain('width: 40px')
    }
  })
  it('обычная рамка, без рамки и неизвестная рамка: обёртки и SVG нет, аватар как раньше', () => {
    for (const frame of ['frame_neon', null, undefined, 'bogus_frame']) {
      const w = mount(Avatar, { props: { name: 'Анна', url: null, frame } })
      expect(w.find('[data-test="frame-decor-wrap"]').exists(), String(frame)).toBe(false)
      expect(w.find('svg').exists(), String(frame)).toBe(false)
      expect(w.text()).toContain('А')
    }
  })
})
