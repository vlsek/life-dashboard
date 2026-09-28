import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Подмена клиента Supabase: from() — универсальная «цепочка», rpc() пишет вызовы.
const h = vi.hoisted(() => ({
  rpcAvailable: true,
  calls: [] as { fn: string; args: unknown }[],
}))

vi.mock('./lib/supabase', () => {
  const profileRows = [
    { user_id: 'bob', display_name: 'Bob', avatar_url: null },
    { user_id: 'zed', display_name: 'Zed', avatar_url: null },
  ]
  function chain(table: string) {
    let single = false
    const p: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) => {
              if (table === 'profiles') return resolve({ data: single ? { onboarded: true, display_name: 'Me', leaderboard_visible: true } : profileRows, error: null })
              if (table === 'follows') return resolve({ data: [{ followed_id: 'zed' }], error: null })
              return resolve({ data: [], error: null })
            }
          }
          if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
          return () => p
        },
      },
    )
    return p
  }
  const sb = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) },
    from: (table: string) => chain(table),
    async rpc(fn: string, args?: unknown) {
      h.calls.push({ fn, args })
      if (!h.rpcAvailable && /friend/.test(fn)) return { data: null, error: { message: 'Could not find the function' } }
      switch (fn) {
        case 'get_friend_ids':
          return { data: ['bob'], error: null }
        case 'get_friend_requests':
          return {
            data: [
              { id: 'r1', other_user_id: 'ann', display_name: 'Ann', avatar_url: null, direction: 'incoming', created_at: '2026-09-28T10:00:00Z' },
              { id: 'r2', other_user_id: 'cat', display_name: 'Cat', avatar_url: null, direction: 'outgoing', created_at: '2026-09-28T09:00:00Z' },
            ],
            error: null,
          }
        case 'find_user_by_name':
          return { data: (args as { lookup_name: string }).lookup_name === 'nobody' ? null : 'ann', error: null }
        case 'send_friend_request':
          return { data: { status: 'pending' }, error: null }
        default:
          return { data: [], error: null }
      }
    },
  }
  return { sb }
})

import App from './App.vue'

async function mountApp() {
  const wrapper = mount(App, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
const buttonWith = (w: ReturnType<typeof mount>, text: string) => w.findAll('button').find((b) => b.text().includes(text))

describe('Community: friends UI', () => {
  beforeEach(() => {
    h.calls.length = 0
    h.rpcAvailable = true
  })

  it('without migration 029: no requests, no sub-headings, no "Add friend"; follow works as before', async () => {
    h.rpcAvailable = false
    const w = await mountApp()
    const text = w.text()
    expect(text).toContain('Zed')
    expect(text).not.toContain('Bob')
    expect(text).not.toContain('Ann')
    expect(text).not.toContain('Заявки в друзья')
    expect(text).not.toContain('Friend requests')
    expect(buttonWith(w, 'В друзья') ?? buttonWith(w, 'Add friend')).toBeUndefined()
    w.unmount()
  })

  it('with migration 029: shows requests, friends and follows in separate sections', async () => {
    const w = await mountApp()
    const text = w.text()
    for (const name of ['Ann', 'Cat', 'Bob', 'Zed']) expect(text).toContain(name)
    expect(text).toMatch(/Заявки в друзья|Friend requests/)
    expect(text).toMatch(/хочет дружить|wants to be friends/)
    expect(text).toMatch(/заявка отправлена|request sent/)
    expect(buttonWith(w, 'В друзья') ?? buttonWith(w, 'Add friend')).toBeDefined()
    w.unmount()
  })

  it('accept / decline call respond_friend_request with the right arguments', async () => {
    const w = await mountApp()
    await (buttonWith(w, 'Принять') ?? buttonWith(w, 'Accept'))!.trigger('click')
    await flushPromises()
    expect(h.calls.find((c) => c.fn === 'respond_friend_request')?.args).toEqual({ request_id: 'r1', accept: true })
    await (buttonWith(w, 'Отклонить') ?? buttonWith(w, 'Decline'))!.trigger('click')
    await flushPromises()
    expect(h.calls.filter((c) => c.fn === 'respond_friend_request').at(-1)?.args).toEqual({ request_id: 'r1', accept: false })
    w.unmount()
  })

  it('cancel outgoing / remove friend call remove_friend with the other user id', async () => {
    const w = await mountApp()
    await w.find('button[title="Отменить заявку"], button[title="Cancel request"]').trigger('click')
    await flushPromises()
    expect(h.calls.find((c) => c.fn === 'remove_friend')?.args).toEqual({ other: 'cat' })
    await w.find('button[title="Убрать из друзей"], button[title="Remove from friends"]').trigger('click')
    await flushPromises()
    expect(h.calls.filter((c) => c.fn === 'remove_friend').at(-1)?.args).toEqual({ other: 'bob' })
    w.unmount()
  })

  it('"Add friend" resolves the user via lookup and calls send_friend_request', async () => {
    const w = await mountApp()
    await w.find('input[type="text"]').setValue('ann')
    await (buttonWith(w, 'В друзья') ?? buttonWith(w, 'Add friend'))!.trigger('click')
    await flushPromises()
    expect(h.calls.find((c) => c.fn === 'send_friend_request')?.args).toEqual({ target: 'ann' })
    expect(w.text()).toMatch(/Заявка отправлена|Friend request sent/)
    w.unmount()
  })

  it('"Add friend" for an unknown nickname shows "not found" and sends nothing', async () => {
    const w = await mountApp()
    await w.find('input[type="text"]').setValue('nobody')
    await (buttonWith(w, 'В друзья') ?? buttonWith(w, 'Add friend'))!.trigger('click')
    await flushPromises()
    expect(h.calls.some((c) => c.fn === 'send_friend_request')).toBe(false)
    expect(w.text()).toMatch(/не найден|No user found/)
    w.unmount()
  })
})
