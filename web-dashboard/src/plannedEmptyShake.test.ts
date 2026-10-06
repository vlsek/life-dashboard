import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import rawSource from './components/PlannedSection.vue?raw'

// BACKLOG 38 (апд37): «Добавить» без заполненного плана — поле подсвечивается, получает фокус и слегка встряхивается.
const h = vi.hoisted(() => ({ writes: [] as unknown[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (p: unknown) => (h.writes.push(p), Promise.resolve({ error: null })),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'

beforeEach(() => {
  h.writes = []
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

async function mountPlanned() {
  const w = mount(PlannedSection, { props: { userId: 'u1', date: '2026-10-02' }, attachTo: document.body })
  await flushPromises()
  return w
}

describe('«Планы»: «Добавить» с пустым планом', () => {
  it('пустое поле: красная подсветка, фокус в поле, встряска, ничего не записывается', async () => {
    const w = await mountPlanned()
    const input = w.find('[data-test="custom-input"]')
    expect(input.classes()).not.toContain('plan-invalid')
    await w.find('[data-test="add-custom"]').trigger('click')
    await flushPromises()
    expect(input.classes()).toContain('plan-invalid')
    expect(input.classes()).toContain('plan-shake')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input.element)
    expect(h.writes).toEqual([])
    w.unmount()
  })

  it('только пробелы — тоже «пусто»', async () => {
    const w = await mountPlanned()
    await w.find('[data-test="custom-input"]').setValue('    ')
    await w.find('[data-test="add-custom"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="custom-input"]').classes()).toContain('plan-invalid')
    expect(h.writes).toEqual([])
    w.unmount()
  })

  it('Enter в пустом поле ведёт себя так же, как кнопка', async () => {
    const w = await mountPlanned()
    await w.find('[data-test="custom-input"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.find('[data-test="custom-input"]').classes()).toContain('plan-invalid')
    w.unmount()
  })

  it('как только человек начинает печатать, подсветка уходит', async () => {
    const w = await mountPlanned()
    await w.find('[data-test="add-custom"]').trigger('click')
    await flushPromises()
    await w.find('[data-test="custom-input"]').setValue('Позвонить')
    const input = w.find('[data-test="custom-input"]')
    expect(input.classes()).not.toContain('plan-invalid')
    expect(input.attributes('aria-invalid')).toBeUndefined()
    w.unmount()
  })

  it('встряска короткая: класс plan-shake снимается сам, подсветка остаётся до ввода', async () => {
    vi.useFakeTimers()
    try {
      const w = await mountPlanned()
      await w.find('[data-test="add-custom"]').trigger('click')
      await flushPromises()
      expect(w.find('[data-test="custom-input"]').classes()).toContain('plan-shake')
      vi.advanceTimersByTime(400)
      await flushPromises()
      const input = w.find('[data-test="custom-input"]')
      expect(input.classes()).not.toContain('plan-shake')
      expect(input.classes()).toContain('plan-invalid')
      w.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('заполненный план по-прежнему добавляется, без подсветки', async () => {
    const w = await mountPlanned()
    await w.find('[data-test="custom-input"]').setValue('Купить воду')
    await w.find('[data-test="add-custom"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="custom-input"]').classes()).not.toContain('plan-invalid')
    expect((w.find('[data-test="custom-input"]').element as HTMLInputElement).value).toBe('')
    expect(h.writes.length).toBeGreaterThan(0)
    w.unmount()
  })
})

describe('стили встряски (страж): в анимации нет движения при «уменьшить движение» и «отключить анимации»', () => {
  it('в компоненте есть keyframes, подсветка и два отключения встряски', () => {
    expect(rawSource).toContain('@keyframes plan-shake')
    expect(rawSource).toMatch(/\.plan-invalid \{[^}]*border-color/)
    expect(rawSource).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.plan-shake \{ animation: none; \}/)
    expect(rawSource).toContain(":global(html[data-motion='off']) .plan-shake")
  })
})
