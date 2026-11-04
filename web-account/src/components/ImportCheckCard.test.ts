import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ db: {} as Record<string, Record<string, unknown>[]>, writes: 0 }))
vi.mock('../lib/supabase', () => ({
  sb: {
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          const res = () => Promise.resolve({ data: h.db[table] ?? [], error: null })
          return { order: () => ({ range: res }), range: res }
        },
      }),
      upsert: () => { h.writes++; return Promise.resolve({ error: null }) },
      insert: () => { h.writes++; return Promise.resolve({ error: null }) },
      update: () => { h.writes++; return Promise.resolve({ error: null }) },
      delete: () => { h.writes++; return Promise.resolve({ error: null }) },
    }),
  },
}))
import ImportCheckCard from './ImportCheckCard.vue'
import { buildJson } from '../lib/dataExport'

const fileOf = (text: string, name = 'backup.json') => new File([text], name, { type: 'application/json' })
async function pick(w: ReturnType<typeof mount>, file: File) {
  const input = w.get('[data-test="import-file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}
const exp = (tables: Record<string, Record<string, unknown>[]>, userId = 'u1') => buildJson({ exportedAt: '2026-10-30T10:00:00.000Z', userId, tables, skipped: {} })

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.db = {}
  h.writes = 0
})

describe('ImportCheckCard (79.3, срез 1)', () => {
  it('свой файл: итог по таблицам, новые и уже имеющиеся значения; в базу ничего не пишется', async () => {
    h.db = { daily_values: [{ metric_id: 'm1', date: '2026-10-01' }], metrics: [{ id: 'm1' }], daily_notes: [] }
    const w = mount(ImportCheckCard, { props: { userId: 'u1' } })
    await pick(w, fileOf(exp({ metrics: [{ id: 'm1' }], daily_values: [{ metric_id: 'm1', date: '2026-10-01' }, { metric_id: 'm1', date: '2026-10-02' }] })))
    expect(w.find('[data-test="import-error"]').exists()).toBe(false)
    expect(w.get('[data-test="import-filename"]').text()).toBe('backup.json')
    expect(w.findAll('[data-test="import-line"]')).toHaveLength(2)
    expect(w.get('[data-test="import-values"]').text()).toMatch(/1.*1/)
    expect(w.find('[data-test="import-nochange"]').exists()).toBe(true)
    expect(h.writes).toBe(0)
    w.unmount()
  })
  it('чужой аккаунт: таблицы показаны, сравнения с базой нет, объяснение почему', async () => {
    const w = mount(ImportCheckCard, { props: { userId: 'u1' } })
    await pick(w, fileOf(exp({ metrics: [{ id: 'm9' }] }, 'someone-else')))
    expect(w.find('[data-test="import-summary"]').exists()).toBe(true)
    expect(w.find('[data-test="import-preview"]').exists()).toBe(false)
    expect(w.find('[data-test="import-note"]').exists()).toBe(true)
    expect(h.writes).toBe(0)
    w.unmount()
  })
  it('значения без метрики показываются предупреждением', async () => {
    const w = mount(ImportCheckCard, { props: { userId: 'u1' } })
    await pick(w, fileOf(exp({ daily_values: [{ metric_id: 'ghost', date: '2026-10-01' }] })))
    expect(w.find('[data-test="import-orphans"]').exists()).toBe(true)
    w.unmount()
  })
  it('битые файлы: не JSON, чужой формат, пустой — сообщение, без итога', async () => {
    const w = mount(ImportCheckCard, { props: { userId: 'u1' } })
    for (const text of ['{oops', JSON.stringify({ a: 1 }), '']) {
      await pick(w, fileOf(text))
      expect(w.find('[data-test="import-error"]').exists()).toBe(true)
      expect(w.find('[data-test="import-summary"]').exists()).toBe(false)
    }
    w.unmount()
  })
  it('успешный файл после ошибки убирает сообщение', async () => {
    const w = mount(ImportCheckCard, { props: { userId: 'u1' } })
    await pick(w, fileOf('{oops'))
    expect(w.find('[data-test="import-error"]').exists()).toBe(true)
    await pick(w, fileOf(exp({})))
    expect(w.find('[data-test="import-error"]').exists()).toBe(false)
    expect(w.find('[data-test="import-summary"]').exists()).toBe(true)
    w.unmount()
  })
})
