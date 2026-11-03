import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import JournalList from './components/JournalList.vue'
import { t } from './lib/i18n'
import type { Exercise, WorkoutEntry } from './lib/types'

// Лента истории (69.11 срез 1): в карточке дня у упражнения видно лучший подход и ★ рекорда
const ex = { id: 'a', name: 'жим', category: 'upper', tracks_weight: true } as unknown as Exercise
const en = (id: string, date: string, weight: number): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id: 'a', date, notes: null, sets: [{ reps: 5, weight, time: null, duration: null, side: null }] }) as unknown as WorkoutEntry

describe('JournalList: лучший подход и рекорд', () => {
  it('показывает лучший подход; ★ только у записи, побившей прошлое', () => {
    const w = mount(JournalList, { props: { entries: [en('1', '2026-10-01', 50), en('2', '2026-10-08', 55)], exercises: [ex] } })
    const best = w.findAll('[data-testid="journal-best"]')
    expect(best).toHaveLength(2)
    expect(best[0].text()).toContain('55')
    const rec = w.findAll('[data-testid="journal-record"]')
    expect(rec).toHaveLength(1)
    expect(w.findAll('[data-testid="journal-day"]')[0].find('[data-testid="journal-record"]').exists()).toBe(true)
  })
  it('объём дня виден; выбор месяца скрывает остальные дни', async () => {
    const w = mount(JournalList, { props: { entries: [en('1', '2026-09-20', 50), en('2', '2026-10-08', 55)], exercises: [ex] } })
    expect(w.findAll('[data-testid="journal-volume"]')[0].text()).toContain('275')
    await w.get('[data-testid="journal-month"]').setValue('2026-09')
    const days = w.findAll('[data-testid="journal-day"]')
    expect(days).toHaveLength(1)
    expect(days[0].text()).toContain('250')
  })
  it('поиск скрывает несовпадающие, при пустом результате — «Ничего не найдено»', async () => {
    const w = mount(JournalList, { props: { entries: [en('1', '2026-10-08', 55)], exercises: [ex] } })
    await w.get('[data-testid="journal-search"]').setValue('жим')
    expect(w.findAll('[data-testid="journal-row"]')).toHaveLength(1)
    await w.get('[data-testid="journal-search"]').setValue('zzz')
    expect(w.findAll('[data-testid="journal-row"]')).toHaveLength(0)
    expect(w.get('[data-testid="journal-empty"]').text()).toBe(t('workouts_journal_nothing'))
  })
})
