import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 75.3: загрузка/запись оценки и заметки дня; без миграции 114 блок скрыт и ничего не пишется.
const h = vi.hoisted(() => ({ row: null as { mood: number | null; notes: string | null } | null, error: null as { code?: string; message?: string } | null, upserts: [] as unknown[][], upsertError: null as unknown }))
vi.mock('./lib/supabase', () => ({
  sb: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: h.row, error: h.error }) }) }) }) }) },
}))
vi.mock('./lib/outboxClient', () => ({
  qUpsert: (...a: unknown[]) => {
    h.upserts.push(a)
    return Promise.resolve({ error: h.upsertError, queued: false })
  },
}))
import { useDayReflection } from './lib/useDayReflection'
import DayReflection from './components/DayReflection.vue'

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.row = null
  h.error = null
  h.upserts = []
  h.upsertError = null
})

describe('useDayReflection', () => {
  it('грузит оценку и заметку дня', async () => {
    h.row = { mood: 4, notes: 'хороший день' }
    const r = useDayReflection()
    await r.load('u', '2026-10-30')
    expect(r.mood.value).toBe(4)
    expect(r.note.value).toBe('хороший день')
    expect(r.supported.value).toBe(true)
  })
  it('нет колонки → блок скрыт (supported=false) и «Сохранить день» ничего не пишет; обычный сбой сети блок не прячет', async () => {
    h.error = { code: '42703' }
    const r = useDayReflection()
    await r.load('u', '2026-10-30')
    expect(r.supported.value).toBe(false)
    r.mood.value = 3
    expect(await r.save('u', '2026-10-30')).toBe(true)
    expect(h.upserts).toHaveLength(0)
    h.error = { message: 'Failed to fetch' }
    const r2 = useDayReflection()
    await r2.load('u', '2026-10-30')
    expect(r2.supported.value).toBe(true)
  })
  it('запись: свои колонки, заметка очищена, ключ по дню', async () => {
    const r = useDayReflection()
    await r.load('u', '2026-10-30')
    r.mood.value = 5
    r.note.value = '  отлично  '
    expect(await r.save('u', '2026-10-30')).toBe(true)
    expect(h.upserts).toHaveLength(1)
    expect(h.upserts[0].slice(1)).toEqual(['daily_notes', 'daily_notes:2026-10-30:reflection', { user_id: 'u', date: '2026-10-30', mood: 5, notes: 'отлично' }, 'user_id,date'])
  })
  it('пустой день без прошлого не плодит строк; снятие прежней оценки — пишет null', async () => {
    const r = useDayReflection()
    await r.load('u', '2026-10-30')
    expect(await r.save('u', '2026-10-30')).toBe(true)
    expect(h.upserts).toHaveLength(0)
    h.row = { mood: 2, notes: null }
    const r2 = useDayReflection()
    await r2.load('u', '2026-10-30')
    r2.mood.value = null
    await r2.save('u', '2026-10-30')
    expect(h.upserts[0][3]).toEqual({ user_id: 'u', date: '2026-10-30', mood: null, notes: null })
  })
  it('ошибка записи возвращает false', async () => {
    h.upsertError = { message: 'boom' }
    const r = useDayReflection()
    await r.load('u', '2026-10-30')
    r.mood.value = 3
    expect(await r.save('u', '2026-10-30')).toBe(false)
  })
})

describe('DayReflection (форма)', () => {
  it('кнопки 1–5, повторное нажатие снимает оценку, подпись настроения', async () => {
    const mood = ref<number | null>(null)
    const w = mount(DayReflection, { props: { mood: null, note: '', 'onUpdate:mood': (v: number | null) => (mood.value = v) } as never })
    expect(w.findAll('[data-test="mood-btn"]')).toHaveLength(5)
    await w.find('[data-mood="4"]').trigger('click')
    expect(mood.value).toBe(4)
    await w.setProps({ mood: 4 })
    expect(w.find('[data-test="mood-caption"]').text()).toBe('хорошо')
    await w.find('[data-mood="4"]').trigger('click')
    expect(mood.value).toBeNull()
  })
})
