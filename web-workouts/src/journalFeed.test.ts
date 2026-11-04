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
  it('календарь: точки у дней с записями, тап показывает только день, повторный тап снимает', async () => {
    const w = mount(JournalList, { props: { entries: [en('1', '2026-10-01', 50), en('2', '2026-10-08', 55)], exercises: [ex] } })
    expect(w.findAll('[data-testid="journal-cal-dot"]')).toHaveLength(2)
    const cell = (d: string) => w.get(`[data-testid="journal-cal-day"][data-date="${d}"]`)
    await cell('2026-10-01').trigger('click')
    expect(w.findAll('[data-testid="journal-day"]')).toHaveLength(1)
    await cell('2026-10-01').trigger('click')
    expect(w.findAll('[data-testid="journal-day"]')).toHaveLength(2)
    await cell('2026-10-05').trigger('click') // день без записей не кликается
    expect(w.findAll('[data-testid="journal-day"]')).toHaveLength(2)
  })
  it('длительность тренировки показана в заголовке дня, без сессий её нет', async () => {
    const entries = [en('1', '2026-10-08', 55)]
    const sessions = [{ id: 's', user_id: 'u', name: null, date: '2026-10-08', started_at: '2026-10-08T10:00:00Z', finished_at: '2026-10-08T10:47:00Z', routine_id: null, notes: null, source: 'live' as const }]
    const w = mount(JournalList, { props: { entries, exercises: [ex], sessions } })
    expect(w.get('[data-testid="journal-duration"]').text()).toContain('47')
    const bare = mount(JournalList, { props: { entries, exercises: [ex] } })
    expect(bare.find('[data-testid="journal-duration"]').exists()).toBe(false)
  })
  it('фильтр по рутине: список только при наличии тренировок по рутинам, выбор оставляет её дни', async () => {
    const mk = (id: string, date: string, session_id: string) => ({ ...en(id, date, 55), session_id }) as WorkoutEntry
    const ses = (id: string, routine_id: string | null, date: string) => ({ id, user_id: 'u', name: null, date, started_at: `${date}T10:00:00Z`, finished_at: `${date}T11:00:00Z`, routine_id, notes: null, source: 'live' as const })
    const props = { entries: [mk('1', '2026-10-01', 's1'), mk('2', '2026-10-08', 's2')], exercises: [ex], sessions: [ses('s1', 'r1', '2026-10-01'), ses('s2', 'r2', '2026-10-08')], routines: [{ id: 'r1', name: 'Грудь' }, { id: 'r2', name: 'Ноги' }] }
    const w = mount(JournalList, { props })
    await w.get('[data-testid="journal-routine"]').setValue('r2')
    const days = w.findAll('[data-testid="journal-day"]')
    expect(days).toHaveLength(1)
    expect(days[0].get('[data-testid="journal-date"]').text()).toContain('8')
    expect(mount(JournalList, { props: { ...props, sessions: [] } }).find('[data-testid="journal-routine"]').exists()).toBe(false)
  })
  it('«По тренировкам»: день с двумя тренировками — две карточки с названием рутины и своей длительностью', async () => {
    const mk = (id: string, session_id: string) => ({ ...en(id, '2026-10-08', 55), session_id }) as WorkoutEntry
    const ses = (id: string, routine_id: string | null, start: string, end: string) => ({ id, user_id: 'u', name: null, date: '2026-10-08', started_at: start, finished_at: end, routine_id, notes: null, source: 'live' as const })
    const sessions = [ses('s1', 'r1', '2026-10-08T08:00:00Z', '2026-10-08T08:40:00Z'), ses('s2', null, '2026-10-08T18:00:00Z', '2026-10-08T18:25:00Z')]
    const w = mount(JournalList, { props: { entries: [mk('1', 's1'), mk('2', 's2')], exercises: [ex], sessions, routines: [{ id: 'r1', name: 'Грудь' }] } })
    expect(w.findAll('[data-testid="journal-day"]')).toHaveLength(1)
    expect(w.get('[data-testid="journal-duration"]').text()).toContain('65')
    await w.get('[data-testid="journal-view-workouts"]').trigger('click')
    const cards = w.findAll('[data-testid="journal-day"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].get('[data-testid="journal-duration"]').text()).toContain('25')
    expect(cards[1].get('[data-testid="journal-workout-title"]').text()).toBe('Грудь')
    expect(cards[1].get('[data-testid="journal-duration"]').text()).toContain('40')
    await w.get('[data-testid="journal-view-days"]').trigger('click')
    expect(w.findAll('[data-testid="journal-day"]')).toHaveLength(1)
    expect(mount(JournalList, { props: { entries: [en('1', '2026-10-08', 55)], exercises: [ex] } }).find('[data-testid="journal-view"]').exists()).toBe(false)
  })
  it('меню карточки: «Повторить», «В рутину» и «Удалить» отдают записи именно этой карточки', async () => {
    const mk = (id: string, session_id: string) => ({ ...en(id, '2026-10-08', 55), session_id }) as WorkoutEntry
    const ses = (id: string, name: string | null, start: string) => ({ id, user_id: 'u', name, date: '2026-10-08', started_at: start, finished_at: null, routine_id: null, notes: null, source: 'live' as const })
    const sessions = [ses('s1', 'Грудь', '2026-10-08T08:00:00Z'), ses('s2', null, '2026-10-08T18:00:00Z')]
    const w = mount(JournalList, { props: { entries: [mk('1', 's1'), mk('2', 's2')], exercises: [ex], sessions } })
    await w.get('[data-testid="journal-view-workouts"]').trigger('click')
    const cards = w.findAll('[data-testid="journal-day"]')
    expect(cards).toHaveLength(2)
    await cards[1].get('[data-testid="journal-repeat"]').trigger('click')
    expect((w.emitted('repeat')![0][0] as WorkoutEntry[]).map((e) => e.id)).toEqual(['1'])
    await cards[1].get('[data-testid="journal-to-routine"]').trigger('click')
    expect(w.emitted('save-routine')![0][1]).toBe('Грудь')
    await cards[0].get('[data-testid="journal-to-routine"]').trigger('click')
    expect(typeof w.emitted('save-routine')![1][1]).toBe('string')
    expect((w.emitted('save-routine')![1][1] as string).length).toBeGreaterThan(0)
    await cards[0].get('[data-testid="journal-delete"]').trigger('click')
    expect((w.emitted('delete')![0][0] as WorkoutEntry[]).map((e) => e.id)).toEqual(['2'])
  })
  it('в режиме «По дням» меню отдаёт все записи дня', async () => {
    const w = mount(JournalList, { props: { entries: [en('1', '2026-10-08', 55), { ...en('2', '2026-10-08', 60) }], exercises: [ex] } })
    await w.get('[data-testid="journal-delete"]').trigger('click')
    expect((w.emitted('delete')![0][0] as WorkoutEntry[]).map((e) => e.id).sort()).toEqual(['1', '2'])
  })
  it('правка тренировки: «Изменить» только у карточки с сессией, форма отдаёт название и заметку, заметка видна на карточке', async () => {
    const mk = (id: string, session_id: string | null) => ({ ...en(id, '2026-10-08', 55), session_id }) as WorkoutEntry
    const sessions = [{ id: 's1', user_id: 'u', name: 'Грудь', date: '2026-10-08', started_at: '2026-10-08T08:00:00Z', finished_at: null, routine_id: null, notes: 'тяжело', source: 'live' as const }]
    const w = mount(JournalList, { props: { entries: [mk('1', 's1'), mk('2', null)], exercises: [ex], sessions } })
    expect(w.find('[data-testid="journal-edit"]').exists()).toBe(false) // «по дням»: карточка дня — не тренировка
    await w.get('[data-testid="journal-view-workouts"]').trigger('click')
    const cards = w.findAll('[data-testid="journal-day"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].get('[data-testid="journal-notes"]').text()).toBe('тяжело')
    expect(cards[1].find('[data-testid="journal-edit"]').exists()).toBe(false) // неявная тренировка — без сессии
    await cards[0].get('[data-testid="journal-edit"]').trigger('click')
    expect((w.get('[data-testid="journal-edit-name"]').element as HTMLInputElement).value).toBe('Грудь')
    await w.get('[data-testid="journal-edit-name"]').setValue('  Грудь + трицепс ')
    await w.get('[data-testid="journal-edit-notes"]').setValue('')
    await w.get('[data-testid="journal-edit-save"]').trigger('click')
    expect(w.emitted('edit-session')![0]).toEqual(['s1', { name: 'Грудь + трицепс', notes: null }])
    expect(w.find('[data-testid="journal-edit-form"]').exists()).toBe(false)
  })
  it('правка: «Отмена» ничего не отправляет', async () => {
    const mk = (id: string) => ({ ...en(id, '2026-10-08', 55), session_id: 's1' }) as WorkoutEntry
    const sessions = [{ id: 's1', user_id: 'u', name: null, date: '2026-10-08', started_at: '2026-10-08T08:00:00Z', finished_at: null, routine_id: null, notes: null, source: 'live' as const }]
    const w = mount(JournalList, { props: { entries: [mk('1')], exercises: [ex], sessions } })
    await w.get('[data-testid="journal-view-workouts"]').trigger('click')
    await w.get('[data-testid="journal-edit"]').trigger('click')
    await w.get('[data-testid="journal-edit-cancel"]').trigger('click')
    expect(w.emitted('edit-session')).toBeUndefined()
    expect(w.find('[data-testid="journal-edit-form"]').exists()).toBe(false)
  })
})
