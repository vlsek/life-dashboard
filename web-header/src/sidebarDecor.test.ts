import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('./lib/supabase', () => ({ sb: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) }, from: () => ({}) } }))
import SidebarTop from './components/SidebarTop.vue'

// BACKLOG 44.18з: аватар в левом меню у рамки-орнамента обёрнут в слой с SVG; у остальных рамок разметка прежняя.
const mountTop = (avatarFrame: string | null, avatarUrl: string | null) =>
  mount(SidebarTop, { props: { displayName: 'Анна', email: 'a@x.com', avatarUrl, avatarFrame, showProgress: false, day: null, week: null }, global: { stubs: { AccountSwitcher: true, DayWeekBadge: true } } })

describe('левое меню: рамки-орнаменты', () => {
  it('«Лианы»: обёртка с SVG внутри ссылки профиля, аватар (картинка или инициал) остаётся внутри', () => {
    const img = mountTop('frame_vines', 'https://x/a.png')
    expect(img.find('[data-test="sidebar-user"] [data-test="frame-decor-wrap"] [data-test="sidebar-avatar"]').exists()).toBe(true)
    expect(img.find('[data-test="sidebar-user"] svg[data-test="frame-decor"]').exists()).toBe(true)
    const ini = mountTop('frame_vines', null)
    expect(ini.find('[data-test="frame-decor-wrap"] [data-test="sidebar-initial"]').exists()).toBe(true)
    expect(ini.find('[data-test="sidebar-initial"]').attributes('style')).toContain('box-shadow')
  })
  it('обычная рамка и без рамки: ни обёртки, ни SVG, аватар на месте', () => {
    for (const frame of ['frame_gold', null]) {
      const w = mountTop(frame, null)
      expect(w.find('[data-test="frame-decor-wrap"]').exists(), String(frame)).toBe(false)
      expect(w.find('[data-test="sidebar-user"] svg').exists(), String(frame)).toBe(false)
      expect(w.find('[data-test="sidebar-initial"]').exists(), String(frame)).toBe(true)
    }
  })
})
