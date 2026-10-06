import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { notifyCustomizationChanged } from './lib/customizationEvents'

// BACKLOG раздел 43, 9:40 + 9:41: рамка для кольца читается отдельным запросом и меняется сразу, без обновления страницы.
const h = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }))
vi.mock('./lib/supabase', () => ({
  sb: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(h.result) }) }) }) },
}))
import { useAvatarFrame } from './lib/useAvatarFrame'

beforeEach(() => {
  h.result = { data: null, error: null }
})

describe('useAvatarFrame', () => {
  it('берёт avatar_frame из profiles.customization', async () => {
    h.result = { data: { customization: { avatar_frame: 'frame_gold' } }, error: null }
    const { frame, load } = useAvatarFrame()
    await load('u1')
    expect(frame.value).toBe('frame_gold')
  })
  it('нет колонки/ошибка, пустой выбор или неизвестная рамка — без рамки', async () => {
    const { frame, load } = useAvatarFrame()
    h.result = { data: null, error: { message: 'column customization does not exist' } }
    await load('u1')
    expect(frame.value).toBeNull()
    h.result = { data: { customization: {} }, error: null }
    await load('u1')
    expect(frame.value).toBeNull()
    h.result = { data: { customization: { avatar_frame: 'frame_removed' } }, error: null }
    await load('u1')
    expect(frame.value).toBeNull()
  })
  it('надели/сняли рамку на странице «Кастомизация» — меняется сразу, без запроса', async () => {
    const { frame } = useAvatarFrame()
    notifyCustomizationChanged({ avatar_frame: 'frame_neon' })
    await flushPromises()
    expect(frame.value).toBe('frame_neon')
    notifyCustomizationChanged({ avatar_frame: null })
    await flushPromises()
    expect(frame.value).toBeNull()
    notifyCustomizationChanged({ avatar_frame: 'frame_removed' })
    await flushPromises()
    expect(frame.value).toBeNull()
  })
})
