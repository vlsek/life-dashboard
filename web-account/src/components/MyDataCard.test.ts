import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Каждая таблица отдаёт одну строку; vocabulary «не существует» (миграция не применена)
vi.mock('../lib/supabase', () => ({
  sb: {
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          const res = () => Promise.resolve(table === 'vocabulary' ? { data: null, error: { message: 'relation "vocabulary" does not exist' } } : { data: [{ id: 1, user_id: 'u1', t: table }], error: null })
          return { order: () => ({ range: res }), range: res }
        },
      }),
    }),
  },
}))

import MyDataCard from './MyDataCard.vue'

const saved: { name: string; type: string }[] = []
beforeEach(() => {
  saved.length = 0
  localStorage.setItem('site_lang', 'ru')
  globalThis.URL.createObjectURL = vi.fn((b: Blob) => { saved.push({ name: '', type: b.type }); return 'blob:x' })
  globalThis.URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { saved[saved.length - 1].name = this.download })
})

describe('MyDataCard (79.2)', () => {
  it('JSON: собирает данные, скачивает файл с датой в имени, показывает итог и число невыгруженных таблиц', async () => {
    const w = mount(MyDataCard, { props: { userId: 'u1' } })
    await w.get('[data-test="export-json"]').trigger('click')
    await flushPromises()
    expect(saved.length).toBe(1)
    expect(saved[0].type).toContain('application/json')
    expect(saved[0].name).toMatch(/^life-dashboard-data-\d{4}-\d{2}-\d{2}\.json$/)
    const done = w.get('[data-test="export-done"]').text()
    expect(done).toContain('Готово')
    expect(done).toContain('Не выгружено: 1') // vocabulary
  })
  it('CSV: скачивает .zip', async () => {
    const w = mount(MyDataCard, { props: { userId: 'u1' } })
    await w.get('[data-test="export-zip"]').trigger('click')
    await flushPromises()
    expect(saved[0].type).toBe('application/zip')
    expect(saved[0].name.endsWith('.zip')).toBe(true)
  })
  it('пока идёт сбор, кнопки заблокированы', async () => {
    const w = mount(MyDataCard, { props: { userId: 'u1' } })
    const p = w.get('[data-test="export-json"]').trigger('click')
    await Promise.resolve()
    expect((w.get('[data-test="export-zip"]').element as HTMLButtonElement).disabled).toBe(true)
    await p
    await flushPromises()
    expect((w.get('[data-test="export-zip"]').element as HTMLButtonElement).disabled).toBe(false)
  })
})
