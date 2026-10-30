import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 74.3/73.5 срез 3: «Пока никого» нельзя показывать, пока рейтинг/«сегодня»/лента ещё грузятся (ложная пустота).
const h = vi.hoisted(() => ({ gate: null as null | Promise<void>, release: null as null | (() => void), fail: false }))
vi.mock('./lib/supabase', () => {
  function chain(table: string) {
    let single = false
    const p: unknown = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(h.fail && table !== 'profiles' ? { data: null, error: { message: 'Failed to fetch' } } : { data: table === 'profiles' ? (single ? { onboarded: true, display_name: 'Me', leaderboard_visible: true, customization: {} } : []) : [], error: null })
        if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
        return () => p
      },
    })
    return p
  }
  const row = (id: string, name: string, pts: number) => ({ user_id: id, display_name: name, avatar_url: null, total_points: pts, perfect_streak: 0, leaderboard_visible: true })
  const sb = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) },
    from: (table: string) => chain(table),
    async rpc(fn: string) {
      if (fn === 'get_leaderboard_period' || fn === 'get_leaderboard') {
        if (h.gate) await h.gate
        return h.fail ? { data: null, error: { message: 'Failed to fetch' } } : { data: [row('u1', 'Anna', 90), row('me', 'Me', 10)], error: null }
      }
      if (h.fail && fn === 'get_today_activity') return { data: null, error: { message: 'Failed to fetch' } }
      return { data: [], error: null }
    },
  }
  return { sb }
})
import App from './App.vue'
import { t } from './lib/i18n'

const settle = async () => { for (let i = 0; i < 10; i++) await flushPromises() }
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  h.fail = false
  h.gate = new Promise<void>((r) => (h.release = r))
})

describe('Сообщество: загрузка и пустота', () => {
  it('пока рейтинг грузится — «Загрузка…» в рейтинге, «сегодня» и ленте; «Пока никого» нет нигде', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    expect(w.find('[data-testid="comm-loading"]').text()).toBe('Загрузка…')
    expect(w.find('[data-testid="comm-today-loading"]').text()).toBe('Загрузка…')
    expect(w.find('[data-testid="feed-loading"]').exists()).toBe(true)
    expect(w.find('[data-testid="feed-empty"]').exists()).toBe(false)
    expect(w.text()).not.toContain(t('comm_empty'))
  })

  it('данные пришли — загрузка ушла, рейтинг показан', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    h.release!()
    await settle()
    expect(w.find('[data-testid="comm-loading"]').exists()).toBe(false)
    expect(w.find('[data-testid="comm-today-loading"]').exists()).toBe(false)
    expect(w.find('[data-testid="feed-loading"]').exists()).toBe(false)
    expect(w.text()).toContain('Anna')
  })

  it('ошибка рейтинга — ошибка с «Повторить», а не «Загрузка…» и не «Пока никого»; во время повтора кнопка занята', async () => {
    h.fail = true
    const w = mount(App, { attachTo: document.body })
    await settle()
    h.release!()
    await settle()
    const errs = w.findAll('[data-testid="load-error"]')
    expect(errs.length).toBeGreaterThan(0)
    expect(w.find('[data-testid="comm-loading"]').exists()).toBe(false)
    expect(w.text()).not.toContain(t('comm_empty').replace(/\s+/g, ' ')) // рейтинг: ошибка вместо пустоты
    h.fail = false
    h.gate = new Promise<void>((r) => (h.release = r))
    await errs[0].find('[data-testid="load-retry"]').trigger('click')
    await flushPromises()
    // пока идёт повтор, старая ошибка остаётся, а кнопка занята — «пока никого» всё равно не мелькает
    expect(errs[0].find('[data-testid="load-retry"]').attributes('disabled')).toBeDefined()
    expect(w.text()).not.toContain(t('comm_empty'))
    h.release!()
    await settle()
    expect(w.text()).toContain('Anna')
  })
})
