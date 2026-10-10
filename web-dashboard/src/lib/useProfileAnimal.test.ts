import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG раздел 29, срез 2: выбор животного пишет готовый data-URI в profiles.avatar_url (без Storage).
const h = vi.hoisted(() => ({ upserts: [] as unknown[], fail: false }))
vi.mock('./supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain, range: () => chain,
        maybeSingle: () => Promise.resolve({ data: { avatar_url: null, birthdate: null, goal_type: null }, error: null }),
        upsert: (row: unknown) => { h.upserts.push(row); return Promise.resolve({ error: h.fail ? { message: 'boom' } : null }) },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res, rej),
      }
      return chain
    },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
  },
}))
vi.mock('./loadBalance', () => ({ loadBalance: vi.fn(() => Promise.resolve({ ok: true, balance: 0 })) }))

import { animalAvatarUrl } from './animalAvatars'
import { onAvatarChanged } from './avatarEvents'
import { useProfile } from './useProfile'

describe('useProfile.setAnimalAvatar', () => {
  beforeEach(() => { h.upserts = []; h.fail = false })
  it('сохраняет data-URI выбранного животного', async () => {
    const p = useProfile()
    await p.init('u1')
    expect(await p.setAnimalAvatar('panda')).toBe(true)
    expect(h.upserts).toEqual([{ user_id: 'u1', avatar_url: animalAvatarUrl('panda') }])
  })
  it('сообщает левому меню новый аватар (и не сообщает при сбое)', async () => {
    const seen: (string | null)[] = []
    const off = onAvatarChanged((d) => seen.push(d.avatar_url))
    const p = useProfile()
    await p.init('u1')
    await p.setAnimalAvatar('fox')
    expect(seen).toEqual([animalAvatarUrl('fox')])
    h.fail = true
    await p.setAnimalAvatar('cat')
    expect(seen).toHaveLength(1)
    off()
  })
  it('неизвестный ключ ничего не пишет', async () => {
    const p = useProfile()
    await p.init('u1')
    expect(await p.setAnimalAvatar('dragon')).toBe(false)
    expect(h.upserts).toEqual([])
  })
  it('ошибка сохранения → false и текст ошибки', async () => {
    const p = useProfile()
    await p.init('u1')
    h.fail = true
    expect(await p.setAnimalAvatar('cat')).toBe(false)
    expect(p.error.value).toBeTruthy()
  })
})
