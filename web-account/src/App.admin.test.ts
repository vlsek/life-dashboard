import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

let profileRow: { is_admin: boolean | null } | null = null
let profileError = false

vi.mock('./lib/useAuth', () => ({
  useAuth: () => ({ auth: ref({ status: 'ready', userId: 'u1', userEmail: 'a@b.c' }) }),
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (profileError) throw new Error('column is_admin does not exist')
            return { data: profileRow, error: null }
          },
        }),
      }),
    }),
    auth: {
      getUserIdentities: async () => ({ data: { identities: [] }, error: null }),
      getUser: async () => ({ data: { user: { identities: [] } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

import App from './App.vue'

async function render() {
  const w = mount(App)
  await flushPromises()
  return w
}

describe('Account: admin link', () => {
  beforeEach(() => {
    // AppShell сам ходит за version.json — глушим сеть, чтобы тест был герметичным.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}), text: async () => '' })))
    profileRow = null
    profileError = false
  })

  it('is shown for an admin and points to the admin page', async () => {
    profileRow = { is_admin: true }
    const w = await render()
    const link = w.find('[data-testid="admin-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/admin.html')
  })

  it('is hidden for a regular user', async () => {
    profileRow = { is_admin: false }
    expect((await render()).find('[data-testid="admin-link"]').exists()).toBe(false)
  })

  it('is hidden when the flag is missing or the column is unavailable', async () => {
    profileRow = null
    expect((await render()).find('[data-testid="admin-link"]').exists()).toBe(false)
    profileError = true
    expect((await render()).find('[data-testid="admin-link"]').exists()).toBe(false)
  })
})
