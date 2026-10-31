import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

// Аватар в левом меню «то есть, то нет»: при сбое запроса профиля показывалась буква. Теперь последнее известное берётся с устройства.
const state = { fail: false, row: { display_name: 'Аня', avatar_url: 'https://x/a.png' } as { display_name: string; avatar_url: string } | null }
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({
      select: (cols: string) => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve(
              state.fail
                ? { data: null, error: { message: 'Failed to fetch' } }
                : cols.includes('customization')
                  ? { data: { customization: {} }, error: null }
                  : { data: state.row, error: null },
            ),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}))
import { useSidebarProfile, readSidebarCache, SIDEBAR_CACHE_KEY } from './lib/sidebarProfile'

const run = async (uid: string) => {
  const scope = effectScope()
  const p = scope.run(() => useSidebarProfile())!
  await p.load(uid, null)
  scope.stop()
  return p
}

beforeEach(() => {
  localStorage.clear()
  state.fail = false
  state.row = { display_name: 'Аня', avatar_url: 'https://x/a.png' }
})

describe('кэш блока профиля в меню', () => {
  it('успешная загрузка пишет кэш; следующая при сбое сети всё равно показывает фото и имя', async () => {
    await run('u1')
    expect(readSidebarCache('u1')?.avatarUrl).toBe('https://x/a.png')
    state.fail = true
    const p = await run('u1')
    expect(p.avatarUrl.value).toBe('https://x/a.png')
    expect(p.displayName.value).toBe('Аня')
  })
  it('кэш другого пользователя не подставляется', async () => {
    await run('u1')
    state.fail = true
    const p = await run('u2')
    expect(p.avatarUrl.value).toBeNull()
    expect(readSidebarCache('u2')).toBeNull()
  })
  it('убрали аватар на сервере — кэш обновляется, фото не «залипает»', async () => {
    await run('u1')
    state.row = { display_name: 'Аня', avatar_url: '' }
    const p = await run('u1')
    expect(p.avatarUrl.value).toBeNull()
    expect(readSidebarCache('u1')?.avatarUrl).toBeNull()
  })
  it('битый кэш не ломает загрузку', async () => {
    localStorage.setItem(SIDEBAR_CACHE_KEY, '{oops')
    const p = await run('u1')
    expect(p.avatarUrl.value).toBe('https://x/a.png')
  })
})
