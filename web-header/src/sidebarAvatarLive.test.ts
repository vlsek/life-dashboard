import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { notifyAvatarChanged } from './lib/avatarEvents'

// BACKLOG 44.17: аватар в левом меню меняется сразу, когда его сменили в «Аккаунте» или на Дашборде.
vi.mock('./lib/supabase', () => ({ sb: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) } }))
import { useSidebarProfile } from './lib/sidebarProfile'

let scope: ReturnType<typeof effectScope> | null = null
afterEach(() => {
  scope?.stop()
  scope = null
})

describe('useSidebarProfile: аватар вживую', () => {
  it('новый аватар появляется сразу, null — убирает, мусор игнорируется', () => {
    scope = effectScope()
    const p = scope.run(() => useSidebarProfile())!
    expect(p.avatarUrl.value).toBeNull()
    notifyAvatarChanged({ avatar_url: 'https://x/a.png' })
    expect(p.avatarUrl.value).toBe('https://x/a.png')
    window.dispatchEvent(new CustomEvent('avatar:changed', { detail: { avatar_url: 'javascript:alert(1)' } }))
    expect(p.avatarUrl.value).toBe('https://x/a.png')
    notifyAvatarChanged({ avatar_url: null })
    expect(p.avatarUrl.value).toBeNull()
  })
  it('после остановки области подписка снимается', () => {
    scope = effectScope()
    const p = scope.run(() => useSidebarProfile())!
    scope.stop()
    scope = null
    notifyAvatarChanged({ avatar_url: 'https://x/a.png' })
    expect(p.avatarUrl.value).toBeNull()
  })
})
