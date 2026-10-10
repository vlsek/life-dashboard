import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 44.17: смена аватара в «Аккаунте» — запись в profiles.avatar_url и сообщение в канал avatarEvents.
const h = vi.hoisted(() => ({
  upserts: [] as unknown[], uploads: [] as { path: string }[], failUpsert: false, failUpload: false,
  row: { avatar_url: null as string | null, customization: null as null | Record<string, unknown> }, user: { user_metadata: { picture: 'https://lh3.googleusercontent.com/a/me' } } as unknown,
}))
vi.mock('./supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain, eq: () => chain,
        maybeSingle: () => Promise.resolve({ data: h.row, error: null }),
        upsert: (row: unknown) => { h.upserts.push(row); return Promise.resolve({ error: h.failUpsert ? { message: 'boom' } : null }) },
      }
      return chain
    },
    auth: { getUser: () => Promise.resolve({ data: { user: h.user } }) },
    storage: {
      from: () => ({
        upload: (path: string) => { h.uploads.push({ path }); return Promise.resolve({ error: h.failUpload ? { message: 'boom' } : null }) },
        getPublicUrl: (path: string) => ({ data: { publicUrl: 'https://cdn.example/avatars/' + path } }),
      }),
    },
  },
}))

import { animalAvatarUrl } from './animalAvatars'
import { onAvatarChanged } from './avatarEvents'
import { notifyCustomizationChanged } from './customizationEvents'
import { effectScope } from 'vue'
import { avatarPath, googleAvatarOf, MAX_PHOTO_BYTES, useAvatar } from './useAvatar'

let seen: (string | null)[] = []
let off: () => void
beforeEach(() => {
  h.upserts = []; h.uploads = []; h.failUpsert = false; h.failUpload = false; h.row = { avatar_url: null, customization: null }
  seen = []
  off?.()
  off = onAvatarChanged((d) => seen.push(d.avatar_url))
})

async function ready() {
  const a = useAvatar()
  await a.load('u1')
  return a
}

describe('useAvatar', () => {
  it('load: текущий аватар из профиля и фото Google из аккаунта (только https)', async () => {
    h.row = { avatar_url: 'https://x/y.png', customization: null }
    const a = await ready()
    expect(a.avatarUrl.value).toBe('https://x/y.png')
    expect(a.googleAvatar.value).toBe('https://lh3.googleusercontent.com/a/me')
    expect(googleAvatarOf({ user_metadata: { picture: 'http://insecure/p.png' } })).toBeNull()
    expect(googleAvatarOf(null)).toBeNull()
  })
  it('животное: пишет data-URI, обновляет аватар и сообщает каналу', async () => {
    const a = await ready()
    expect(await a.setAnimal('panda')).toBe(true)
    const url = animalAvatarUrl('panda')
    expect(h.upserts).toEqual([{ user_id: 'u1', avatar_url: url }])
    expect(a.avatarUrl.value).toBe(url)
    expect(seen).toEqual([url])
    expect(await a.setAnimal('dragon')).toBe(false)
    expect(h.upserts).toHaveLength(1)
  })
  it('фото Google: пишет ссылку Google; без Google-фото ничего не делает', async () => {
    const a = await ready()
    expect(await a.setGoogle()).toBe(true)
    expect(h.upserts).toEqual([{ user_id: 'u1', avatar_url: 'https://lh3.googleusercontent.com/a/me' }])
    h.user = null
    const b = await ready()
    expect(await b.setGoogle()).toBe(false)
    h.user = { user_metadata: { picture: 'https://lh3.googleusercontent.com/a/me' } }
  })
  it('своё фото: грузит в бакет, пишет публичный адрес с ?t=, сообщает каналу', async () => {
    const a = await ready()
    expect(await a.upload(new File(['x'], 'Me.PNG', { type: 'image/png' }))).toBe(true)
    expect(h.uploads).toEqual([{ path: 'u1/avatar.png' }])
    expect((h.upserts[0] as { avatar_url: string }).avatar_url).toMatch(/^https:\/\/cdn\.example\/avatars\/u1\/avatar\.png\?t=\d+$/)
    expect(seen).toHaveLength(1)
    expect(avatarPath('u1', 'noext')).toBe('u1/avatar.jpg')
    expect(avatarPath('u1', 'a.b/../x')).toBe('u1/avatar.jpg')
  })
  it('не картинка / больше 5 МБ — понятная ошибка, в сеть не ходим', async () => {
    const a = await ready()
    expect(await a.upload(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe(false)
    expect(a.error.value).toBeTruthy()
    const big = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: MAX_PHOTO_BYTES + 1 })
    expect(await a.upload(big)).toBe(false)
    expect(h.uploads).toEqual([])
    expect(seen).toEqual([])
  })
  it('сбой записи или загрузки — false, ошибка, канал молчит, прежний аватар остаётся', async () => {
    h.row = { avatar_url: 'https://x/old.png', customization: null }
    const a = await ready()
    h.failUpsert = true
    expect(await a.setAnimal('cat')).toBe(false)
    expect(a.error.value).toBeTruthy()
    expect(a.avatarUrl.value).toBe('https://x/old.png')
    h.failUpsert = false; h.failUpload = true
    expect(await a.upload(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(false)
    expect(seen).toEqual([])
  })
})

describe('useAvatar: рамка аватарки (BACKLOG 502)', () => {
  it('load берёт выбранную рамку из profiles.customization; неизвестный ключ и пусто — без рамки', async () => {
    h.row = { avatar_url: null, customization: { avatar_frame: 'frame_gold' } }
    expect((await ready()).frame.value).toBe('frame_gold')
    h.row = { avatar_url: null, customization: { avatar_frame: 'frame_removed' } }
    expect((await ready()).frame.value).toBeNull()
    h.row = { avatar_url: null, customization: null }
    expect((await ready()).frame.value).toBeNull()
  })
  it('надели / сняли рамку в «Кастомизации» — меняется сразу; после остановки области подписка снята', () => {
    const scope = effectScope()
    const a = scope.run(() => useAvatar())!
    notifyCustomizationChanged({ avatar_frame: 'frame_neon' })
    expect(a.frame.value).toBe('frame_neon')
    notifyCustomizationChanged({ avatar_frame: null })
    expect(a.frame.value).toBeNull()
    scope.stop()
    notifyCustomizationChanged({ avatar_frame: 'frame_neon' })
    expect(a.frame.value).toBeNull()
  })
})

