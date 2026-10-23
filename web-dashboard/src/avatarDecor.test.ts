import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarProgress from './components/AvatarProgress.vue'

// BACKLOG 44.18з (срез 2): рамка-орнамент на Дашборде — слой ПОД кольцом прогресса, бокс = кольцо 52px; у обычных рамок и без рамки слоя нет.
const ring = { basePct: 40, bonusPct: 0, title: '40%' } as never
const mountAv = (frame: string | null | undefined) => mount(AvatarProgress, { props: { avatarUrl: null, ring, frame } })

describe('AvatarProgress: рамки-орнаменты', () => {
  it('у «Шины» и «Штурвала» есть SVG-слой под кольцом, в боксе кольца 52px, рисунок выходит за бокс', () => {
    for (const frame of ['frame_wreath', 'frame_tyre', 'frame_helm', 'frame_ferris', 'frame_baroque']) {
      const w = mountAv(frame)
      const d = w.get('svg[data-test="avatar-decor"]')
      expect(d.attributes('width')).toBe('52')
      expect(d.attributes('viewBox')).toBe('0 0 100 100')
      expect(d.attributes('style')).toContain('overflow: visible')
      expect(d.attributes('data-frame')).toBe(frame)
      expect(d.html().length).toBeGreaterThan(300)
      // слой идёт РАНЬШЕ кольца прогресса — дуга рисуется поверх орнамента
      const html = w.html()
      expect(html.indexOf('data-test="avatar-decor"')).toBeLessThan(html.indexOf('data-test="avatar-ring"'))
      expect(w.find('svg[data-test="avatar-ring"]').exists()).toBe(true)
    }
  })
  it('обычная рамка, без рамки и неизвестная: слоя нет, кольцо на месте', () => {
    for (const frame of ['frame_neon', null, undefined, 'bogus']) {
      const w = mountAv(frame)
      expect(w.find('[data-test="avatar-decor"]').exists(), String(frame)).toBe(false)
      expect(w.find('svg[data-test="avatar-ring"]').exists(), String(frame)).toBe(true)
    }
  })
})
