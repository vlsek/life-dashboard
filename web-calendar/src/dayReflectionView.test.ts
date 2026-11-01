import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DayDetailModal from './components/DayDetailModal.vue'
import { reflectionOf } from './lib/reflection'
import type { HistoryContext } from './lib/historyStats'

// BACKLOG 75.3 срез 2: оценка и заметка дня видны в окне дня истории.
const ctx = (notesByDate: HistoryContext['notesByDate']): HistoryContext =>
  ({ metrics: [], byDate: {}, notesByDate, goals: [], categories: {}, settings: { dayPlace: 'avatar', weekPlace: 'avatar' } as never, firstDate: '2026-10-01', today: '2026-10-31' }) as HistoryContext

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('reflectionOf', () => {
  it('нет записи / нет ни оценки, ни заметки → null', () => {
    expect(reflectionOf(undefined)).toBeNull()
    expect(reflectionOf({ mood: null, notes: '  ' })).toBeNull()
  })
  it('оценка только целая 1–5, заметка обрезается по краям', () => {
    expect(reflectionOf({ mood: 4, notes: ' ок ' })).toEqual({ mood: 4, note: 'ок' })
    expect(reflectionOf({ mood: 7, notes: 'x' })).toEqual({ mood: null, note: 'x' })
    expect(reflectionOf({ mood: 2.5, notes: null })).toBeNull()
  })
})

describe('окно дня: «Как прошёл день»', () => {
  it('показывает оценку с подписью и заметку', () => {
    const w = mount(DayDetailModal, { props: { ctx: ctx({ '2026-10-30': { date: '2026-10-30', mood: 5, notes: 'бегал утром' } }), dateStr: '2026-10-30' } })
    expect(w.text()).toContain('Как прошёл день')
    expect(w.find('[data-test="day-mood"]').text()).toContain('5 / 5')
    expect(w.find('[data-test="day-mood"]').text()).toContain('отлично')
    expect(w.find('[data-test="day-note"]').text()).toBe('бегал утром')
  })
  it('нет данных — блока нет', () => {
    const w = mount(DayDetailModal, { props: { ctx: ctx({}), dateStr: '2026-10-30' } })
    expect(w.text()).not.toContain('Как прошёл день')
  })
})
