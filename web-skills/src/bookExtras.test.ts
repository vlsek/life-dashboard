import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { normalizeNotes, normalizeRating, stars } from './lib/bookExtras'
import BookForm from './components/BookForm.vue'

// BACKLOG 77.8: оценка 1–5 и заметка у книги (миграция 123).
const db = vi.hoisted(() => ({ updates: [] as Record<string, unknown>[], hasCols: true }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: db.hasCols ? [{ id: 'b1', title: 'Т', author: null, points: 10, status: 'to_read', done_date: null, rating: null, notes: null, created_at: '2026-01-01' }] : [{ id: 'b1', title: 'Т', author: null, points: 10, status: 'to_read', done_date: null, created_at: '2026-01-01' }], error: null }) }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          db.updates.push(patch)
          return { error: null }
        },
      }),
    }),
    auth: { getSession: async () => ({ data: { session: null } }) },
  },
}))
import { useBooks } from './lib/useBooks'

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  db.updates = []
  db.hasCols = true
})

describe('нормализация', () => {
  it('оценка: целое 1..5, иначе null', () => {
    expect([normalizeRating(3), normalizeRating('4'), normalizeRating(0), normalizeRating(6), normalizeRating(2.5), normalizeRating(''), normalizeRating(null)]).toEqual([3, 4, null, null, null, null, null])
  })
  it('заметка: обрезка, лимит 1000, пустая — null', () => {
    expect(normalizeNotes('  мысль ')).toBe('мысль')
    expect(normalizeNotes('   ')).toBeNull()
    expect(normalizeNotes('x'.repeat(1500))).toHaveLength(1000)
  })
  it('звёзды', () => {
    expect(stars(3)).toBe('★★★☆☆')
    expect(stars(null)).toBe('')
  })
})

describe('запись', () => {
  it('колонки есть — оценка и заметка уходят в update', async () => {
    const b = useBooks()
    await b.load('u')
    expect(b.hasExtras.value).toBe(true)
    await b.updateBook('b1', { title: 'Т', author: '', points: 10, rating: 4, notes: ' класс ' })
    expect(db.updates[0]).toMatchObject({ rating: 4, notes: 'класс' })
  })
  it('колонок нет — не пишем (иначе запись упала бы)', async () => {
    db.hasCols = false
    const b = useBooks()
    await b.load('u')
    expect(b.hasExtras.value).toBe(false)
    await b.updateBook('b1', { title: 'Т', author: '', points: 10, rating: 4, notes: 'x' })
    expect(db.updates[0]).not.toHaveProperty('rating')
    expect(db.updates[0]).not.toHaveProperty('notes')
  })
})

describe('форма книги', () => {
  const initial = { title: 'Т', author: '', points: 10, rating: 2, notes: 'было' }
  it('без колонок полей нет; с колонками — подставлены и уходят в save', async () => {
    const off = mount(BookForm, { props: { isEdit: true, initial } })
    expect(off.find('[data-test="book-rating"]').exists()).toBe(false)
    const w = mount(BookForm, { props: { isEdit: true, initial, extras: true } })
    expect((w.get('[data-test="book-rating"]').element as HTMLSelectElement).value).toBe('2')
    await w.get('[data-test="book-rating"]').setValue('5')
    await w.get('[data-test="book-notes"]').setValue('шедевр')
    await w.get('form').trigger('submit')
    expect(w.emitted('save')![0][0]).toMatchObject({ rating: 5, notes: 'шедевр' })
  })
})
