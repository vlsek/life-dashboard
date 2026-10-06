import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import { frameRing, FRAME_RING_KEYS } from './lib/frameRing'
import AvatarProgress from './components/AvatarProgress.vue'

// BACKLOG раздел 43, 9:40: кольцо прогресса дня вокруг аватарки на Дашборде рисуется стилем выбранной рамки.
const ring = { basePct: 50, bonusPct: 0, totalPct: 50, title: 't' } as never

describe('таблица цветов дуги = таблица рамок', () => {
  const frames: string = readFileSync('../web-customization/src/lib/frames.ts', 'utf-8')
  const shadowKeys = [...frames.matchAll(/^\s+(frame_\w+): '0 0 0 2px/gm)].map((m) => m[1]) // только таблица FRAME_SHADOWS (не FRAME_ANIMATIONS)
  it('для каждой рамки есть цвета дуги и наоборот (добавили рамку — добавь строку в frameRing.ts)', () => {
    expect(shadowKeys.length).toBeGreaterThan(0)
    expect([...FRAME_RING_KEYS].sort()).toEqual([...shadowKeys].sort())
  })
  it('основной цвет рамки (кольцо 4px в box-shadow) входит в цвета дуги', () => {
    for (const k of shadowKeys) {
      const line = frames.split('\n').find((l) => l.includes(`${k}: '`))!
      const main = line.match(/0 0 0 4px (#[0-9a-f]{6})/i)![1].toLowerCase()
      expect(frameRing(k)!.stops.map((c) => c.toLowerCase()), k).toContain(main)
    }
  })
  it('нет рамки или неизвестный ключ — null', () => {
    expect(frameRing(null)).toBeNull()
    expect(frameRing(undefined)).toBeNull()
    expect(frameRing('frame_removed')).toBeNull()
  })
})

describe('AvatarProgress: проп frame', () => {
  it('без рамки дуга в акценте, без градиента — как было', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring } })
    const arc = w.find('[data-test="avatar-ring-arc"]')
    expect(arc.attributes('stroke')).toBe('var(--accent)')
    expect(w.find('[data-test="avatar-ring"]').attributes('data-frame')).toBeUndefined()
    expect(w.find('linearGradient').exists()).toBe(false)
  })
  it('сплошная рамка (золото): дуга её цвета и со свечением', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring, frame: 'frame_gold' } })
    const arc = w.find('[data-test="avatar-ring-arc"]')
    expect(arc.attributes('stroke')).toBe('#e0b23c')
    expect(arc.attributes('style')).toContain('drop-shadow')
    expect(w.find('[data-test="avatar-ring"]').attributes('data-frame')).toBe('frame_gold')
  })
  it('многоцветная рамка (аврора): градиент вдоль дуги', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring, frame: 'frame_aurora' } })
    expect(w.find('[data-test="avatar-ring-arc"]').attributes('stroke')).toBe('url(#avatar-ring-grad)')
    expect(w.findAll('stop')).toHaveLength(2)
  })
  it('рамку сняли — кольцо снова обычное; неизвестный ключ тоже обычное', async () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring, frame: 'frame_neon' } })
    expect(w.find('[data-test="avatar-ring-arc"]').attributes('stroke')).toBe('#ff4fa3')
    await w.setProps({ frame: null })
    await flushPromises()
    expect(w.find('[data-test="avatar-ring-arc"]').attributes('stroke')).toBe('var(--accent)')
    await w.setProps({ frame: 'frame_unknown' })
    expect(w.find('[data-test="avatar-ring-arc"]').attributes('stroke')).toBe('var(--accent)')
  })
  it('кольца нет (настройка выключена) — рамка ничего не рисует', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring: null, frame: 'frame_gold' } })
    expect(w.find('[data-test="avatar-ring"]').exists()).toBe(false)
  })
})
