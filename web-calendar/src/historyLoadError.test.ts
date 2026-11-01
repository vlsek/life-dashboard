import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 74.3 (срез 4): ошибка загрузки «Истории» — LoadError с «Повторить»; повтор настоящего composable сбрасывает старую ошибку.
const h = vi.hoisted(() => ({ fail: true }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, range: () => chain, not: () => chain, neq: () => chain, is: () => chain, in: () => chain, gte: () => chain, lte: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(h.fail && table === 'metrics' ? { data: null, error: { message: 'Failed to fetch' } } : { data: [], error: null }).then(res, rej),
      }
      return chain
    },
  },
}))
import { useAuthAndData } from './lib/useHistoryData'
import HistoryView from './components/HistoryView.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.fail = true
})

describe('useAuthAndData: reload', () => {
  it('после сбоя — error и пустой ctx; после повтора — данные есть, error сброшен', async () => {
    const d = useAuthAndData()
    for (let i = 0; i < 12; i++) await flushPromises()
    expect(d.error.value).toBeTruthy()
    expect(d.ctx.value).toBeNull()
    h.fail = false
    await d.reload()
    expect(d.error.value).toBeNull()
    expect(d.ctx.value).not.toBeNull()
  })
})

describe('HistoryView: ошибка загрузки', () => {
  it('сообщение с «Повторить» (role=alert); повтор вызывает reload и убирает ошибку', async () => {
    h.fail = true
    const w = mount(HistoryView, { props: { show: { summary: true, progress: true, weekcol: true, stats: true, chart: true, weeks: true } as never, mode: 'history' as never } })
    for (let i = 0; i < 12; i++) await flushPromises()
    const box = w.find('[data-testid="load-error"]')
    expect(box.exists()).toBe(true)
    expect(box.attributes('role')).toBe('alert')
    h.fail = false
    await w.find('[data-testid="load-retry"]').trigger('click')
    for (let i = 0; i < 12; i++) await flushPromises()
    expect(w.find('[data-testid="load-error"]').exists()).toBe(false)
    w.unmount()
  })
})
