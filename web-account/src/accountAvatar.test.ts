import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 44.17: карточка «Аватарка» в «Аккаунте» открывает окно выбора; выбор животного сохраняется и закрывает окно.
const h = vi.hoisted(() => ({ upserts: [] as unknown[] }))
vi.mock('./lib/useAuth', () => ({ useAuth: () => ({ auth: ref({ status: 'ready', userId: 'u1', userEmail: 'anna@b.c' }) }) }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain, eq: () => chain,
        maybeSingle: async () => ({ data: { is_admin: false, avatar_url: null, customization: { avatar_frame: 'frame_flame' } }, error: null }),
        upsert: (row: unknown) => { h.upserts.push(row); return Promise.resolve({ error: null }) },
      }
      return chain
    },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
    auth: {
      getUserIdentities: async () => ({ data: { identities: [] }, error: null }),
      getUser: async () => ({ data: { user: { identities: [], user_metadata: {} } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))
import App from './App.vue'
import { animalAvatarUrl } from './lib/animalAvatars'

describe('Аккаунт: смена аватарки', () => {
  it('без аватара — круг с буквой почты; кнопка открывает окно; выбор животного сохраняет и закрывает', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}), text: async () => '' })))
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="avatar-initial"]').text()).toBe('A')
    expect(w.find('[data-test="avatar-modal"]').exists()).toBe(false)
    await w.find('[data-test="open-avatar"]').trigger('click')
    expect(w.find('[data-test="avatar-modal"]').exists()).toBe(true)
    await w.find('[data-test="avatar-fox"]').trigger('click')
    await flushPromises()
    expect(h.upserts).toEqual([{ user_id: 'u1', avatar_url: animalAvatarUrl('fox') }])
    expect(w.find('[data-test="avatar-modal"]').exists()).toBe(false)
    expect(w.find('[data-test="avatar-current"]').attributes('src')).toBe(animalAvatarUrl('fox'))
  })
  it('выбранная рамка рисуется на карточке (в т.ч. анимированная), на кругу с буквой тоже', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}), text: async () => '' })))
    const w = mount(App)
    await flushPromises()
    const el = w.find('[data-test="avatar-initial"]')
    expect(el.classes()).toContain('cust-frame-flame')
    expect(el.attributes('style')).toContain('box-shadow')
  })
})
