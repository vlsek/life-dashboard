import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { notifyCustomizationChanged } from './lib/customizationEvents'

// BACKLOG раздел 43, 9:41: рамка в левом меню меняется сразу, когда её надели/сняли на странице «Кастомизация».
vi.mock('./lib/supabase', () => ({ sb: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) } }))
import { useSidebarProfile } from './lib/sidebarProfile'

let scope: ReturnType<typeof effectScope> | null = null
afterEach(() => {
  scope?.stop()
  scope = null
})

describe('useSidebarProfile: рамка вживую', () => {
  it('надели — появляется, сняли — исчезает, неизвестный ключ — без рамки', () => {
    scope = effectScope()
    const p = scope.run(() => useSidebarProfile())!
    expect(p.avatarFrame.value).toBeNull()
    notifyCustomizationChanged({ avatar_frame: 'frame_gold' })
    expect(p.avatarFrame.value).toBe('frame_gold')
    notifyCustomizationChanged({ avatar_frame: null })
    expect(p.avatarFrame.value).toBeNull()
    notifyCustomizationChanged({ avatar_frame: 'frame_removed' })
    expect(p.avatarFrame.value).toBeNull()
  })
  it('после остановки области подписка снимается (нет утечки слушателей)', () => {
    scope = effectScope()
    const p = scope.run(() => useSidebarProfile())!
    scope.stop()
    scope = null
    notifyCustomizationChanged({ avatar_frame: 'frame_gold' })
    expect(p.avatarFrame.value).toBeNull()
  })
})
