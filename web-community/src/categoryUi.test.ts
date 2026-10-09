import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// «Сравнение по активности» (BACKLOG 44.13, срез 2): категория открыта сразу, одно главное значение, «вы на N месте», подсказка режима.
const h = vi.hoisted(() => ({ rpcCalls: [] as { fn: string; args: Record<string, unknown> }[] }))
vi.mock('./lib/supabase', () => {
  const cats = [{ id: 'c1', key: 'pushups', label_ru: 'Отжимания', label_en: 'Push-ups' }, { id: 'c2', key: 'water', label_ru: 'Вода', label_en: 'Water' }]
  function chain(table: string) {
    let single = false
    let eqKey = ''
    const p: unknown = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => {
            if (table === 'metric_categories') return resolve({ data: single ? cats.find((c) => c.key === eqKey) ?? null : cats, error: null })
            return resolve({ data: [], error: null })
          }
        }
        if (prop === 'eq') return (col: string, v: string) => { if (col === 'key') eqKey = v; return p }
        if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
        return () => p
      },
    })
    return p
  }
  const sb = {
    from: (table: string) => chain(table),
    async rpc(fn: string, args: Record<string, unknown>) {
      h.rpcCalls.push({ fn, args })
      if (fn === 'get_category_leaderboard') {
        return { data: [
          { user_id: 'u1', display_name: 'Anna', avatar_url: null, total_value: 100, category_points: 5, category_streak: 2, leaderboard_visible: true },
          { user_id: 'me', display_name: 'Me', avatar_url: null, total_value: 80, category_points: 9, category_streak: 6, leaderboard_visible: true },
          { user_id: 'u3', display_name: 'Clara', avatar_url: null, total_value: 10, category_points: 1, category_streak: 0, leaderboard_visible: true },
        ], error: null }
      }
      return { data: [], error: null }
    },
  }
  return { sb, logout: vi.fn() }
})

import CategorySection from './components/CategorySection.vue'

const mountIt = () => mount(CategorySection, { props: { userId: 'me', scope: 'everyone', friendIds: new Set<string>() } })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.rpcCalls = []
})

describe('сравнение по активности', () => {
  it('первая категория открыта сразу и загружена, без «выбери категорию выше»', async () => {
    const w = mountIt()
    await flushPromises()
    expect((w.find('[data-testid="category-select"]').element as HTMLSelectElement).value).toBe('pushups')
    expect(h.rpcCalls.find((c) => c.fn === 'get_category_leaderboard')?.args).toMatchObject({ cat_key: 'pushups' })
    expect(w.findAll('[data-testid="category-row"]')).toHaveLength(3)
    expect(w.text()).not.toContain('Выбери категорию выше')
    w.unmount()
  })

  it('запомненная категория открывается при следующем заходе', async () => {
    const w = mountIt()
    await flushPromises()
    await w.find('[data-testid="category-select"]').setValue('water')
    await flushPromises()
    expect(localStorage.getItem('community_category')).toBe('water')
    w.unmount()
    h.rpcCalls = []
    const w2 = mountIt()
    await flushPromises()
    expect(h.rpcCalls.find((c) => c.fn === 'get_category_leaderboard')?.args).toMatchObject({ cat_key: 'water' })
    w2.unmount()
  })

  it('одно главное значение по режиму и сортировка по нему; «Вы на N месте из M»', async () => {
    const w = mountIt()
    await flushPromises()
    const mains = () => w.findAll('[data-testid="category-main-value"]').map((x) => x.text())
    expect(mains()).toEqual(['100', '80', '10']) // по сумме
    expect(w.find('[data-testid="category-my-place"]').text()).toBe('Вы на 2 месте из 3')
    await w.findAll('[data-testid="category-modes"] button')[1].trigger('click') // по баллам
    expect(mains()).toEqual(['9', '5', '1'])
    expect(w.find('[data-testid="category-my-place"]').text()).toBe('Вы на 1 месте из 3')
    await w.findAll('[data-testid="category-modes"] button')[2].trigger('click') // по серии
    expect(mains()).toEqual(['6 дн.', '2 дн.', '—'])
    w.unmount()
  })

  it('подсказка объясняет выбранный режим', async () => {
    const w = mountIt()
    await flushPromises()
    expect(w.find('[data-testid="category-mode-hint"]').text()).toContain('Сумма всех значений')
    await w.findAll('[data-testid="category-modes"] button')[2].trigger('click')
    expect(w.find('[data-testid="category-mode-hint"]').text()).toContain('дней подряд')
    w.unmount()
  })
})
