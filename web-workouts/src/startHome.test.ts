import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { dayKind, recentCards, RECENT_LIMIT } from './lib/startHome'
import StartFocus from './components/StartFocus.vue'
import RecentWorkouts from './components/RecentWorkouts.vue'
import type { Exercise, WorkoutEntry } from './lib/types'
import type { WorkoutSession } from './lib/sessionContract'

// BACKLOG 69.17, срез 2: главная «Тренировок» — «Сегодня можно тренировать» и «Недавние тренировки»
const TODAY = '2026-10-30'
const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: 'кг', suggested_scheme: null, created_at: '2026-01-01' })
const bench = ex('e1', 'Жим лёжа')
const row = ex('e2', 'Тяга штанги')
const squat = ex('e3', 'Приседания')
const sets = (w: number, r: number, n: number) => Array.from({ length: n }, () => ({ reps: r, weight: w, time: '18:30' }))
const en = (id: string, exercise_id: string, date: string, n: number, session_id: string | null = null, w = 60): WorkoutEntry => ({ id, user_id: 'u', exercise_id, date, sets: sets(w, 8, n), notes: null, session_id } as WorkoutEntry)
const ses = (id: string, date: string, name: string | null, mins: number, startHour = 18): WorkoutSession => {
  const start = `${date}T${String(startHour).padStart(2, '0')}:00:00.000Z`
  return { id, user_id: 'u', name, date, started_at: start, finished_at: new Date(Date.parse(start) + mins * 60000).toISOString(), routine_id: null, notes: null, source: 'live' }
}

const NOW = Date.parse('2026-10-30T12:00:00Z')

describe('dayKind', () => {
  it('сегодня, вчера, иначе дата; граница месяца и года', () => {
    expect(dayKind('2026-10-30', '2026-10-30')).toBe('today')
    expect(dayKind('2026-10-29', '2026-10-30')).toBe('yesterday')
    expect(dayKind('2026-10-28', '2026-10-30')).toBe('date')
    expect(dayKind('2026-09-30', '2026-10-01')).toBe('yesterday')
    expect(dayKind('2025-12-31', '2026-01-01')).toBe('yesterday')
  })
})

describe('recentCards', () => {
  const sessions = [ses('s1', '2026-10-29', 'Верх A', 58), ses('s2', '2026-10-26', null, 49), ses('s3', '2026-10-20', 'Старая', 30)]
  const entries = [en('n1', 'e1', '2026-10-29', 3, 's1', 62.5), en('n2', 'e2', '2026-10-29', 3, 's1', 70), en('n3', 'e3', '2026-10-26', 4, 's2', 90), en('n4', 'e1', '2026-10-20', 2, 's3')]
  const exs = [bench, row, squat]
  it('последние тренировки сверху, не больше лимита; поля карточки', () => {
    const c = recentCards(entries, exs, sessions, NOW)
    expect(c).toHaveLength(RECENT_LIMIT)
    expect(c.map((x) => x.date)).toEqual(['2026-10-29', '2026-10-26'])
    expect(c[0]).toMatchObject({ name: 'Верх A', minutes: 58, sets: 6 })
    expect(c[0].volume).toBe(62.5 * 8 * 3 + 70 * 8 * 3)
    expect(c[0].top.map((t) => t.name)).toEqual(['Жим лёжа', 'Тяга штанги'])
    expect(c[1].name).toBeNull()
    expect(c[1].minutes).toBe(49)
  })
  it('день с двумя тренировками даёт две карточки; лимит не съедается одним днём', () => {
    const s = [ses('a', '2026-10-29', 'Утро', 30, 8), ses('b', '2026-10-29', 'Вечер', 40, 19)]
    const e = [en('1', 'e1', '2026-10-29', 2, 'a'), en('2', 'e2', '2026-10-29', 2, 'b'), en('3', 'e3', '2026-10-27', 2, null)]
    const c = recentCards(e, exs, s, NOW, 3)
    expect(c.map((x) => x.name)).toEqual(['Вечер', 'Утро', null])
  })
  it('нет записей или удалённые упражнения — пусто', () => {
    expect(recentCards([], exs, [], NOW)).toEqual([])
    expect(recentCards([en('1', 'gone', '2026-10-29', 2)], exs, [], NOW)).toEqual([])
  })
  it('рекорды считаются по упражнениям тренировки', () => {
    const c = recentCards(entries, exs, sessions, NOW)
    expect(c[0].records).toBeGreaterThan(0)
  })
})

describe('StartFocus', () => {
  const mk = (e: WorkoutEntry[], x: Exercise[]) => mount(StartFocus, { props: { entries: e, exercises: x, today: TODAY } })
  it('показывает группы с дефицитом и достаточным отдыхом; недавно тренированные не предлагаются', () => {
    const w = mk([en('1', 'e1', '2026-10-29', 3), en('2', 'e3', '2026-10-26', 4)], [bench, squat])
    const text = w.findAll('[data-testid="start-focus-chip"]').map((c) => c.text()).join(' ')
    expect(w.find('[data-testid="start-focus"]').exists()).toBe(true)
    expect(text).toMatch(/Квадрицепс|Quads/) // подпись группы зависит от языка интерфейса
    expect(text).not.toMatch(/Грудь|Chest/)
    w.unmount()
  })
  it('не больше трёх групп; без упражнений блока нет', () => {
    const many = mk([], [bench, row, squat, ex('e4', 'Жим стоя'), ex('e5', 'Подъём на бицепс')])
    expect(many.findAll('[data-testid="start-focus-chip"]').length).toBeLessThanOrEqual(3)
    expect(many.findAll('[data-testid="start-focus-chip"]').length).toBeGreaterThan(0)
    many.unmount()
    const none = mk([], [])
    expect(none.find('[data-testid="start-focus"]').exists()).toBe(false)
    none.unmount()
  })
})

describe('RecentWorkouts', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  const sessions = [ses('s1', '2026-10-29', 'Верх A', 58), ses('s2', '2026-10-26', null, 49)]
  const entries = [en('n1', 'e1', '2026-10-29', 3, 's1', 62.5), en('n3', 'e3', '2026-10-26', 4, 's2', 90)]
  const mk = (e = entries, s = sessions) => mount(RecentWorkouts, { props: { entries: e, exercises: [bench, squat], sessions: s, today: TODAY, nowMs: NOW } })
  it('карточки: название, когда и сколько, объём, подходы, лучшие подходы', () => {
    const w = mk()
    const cards = w.findAll('[data-testid="recent-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].get('[data-testid="recent-name"]').text()).toBe('Верх A')
    expect(cards[0].get('[data-testid="recent-when"]').text()).toContain('58')
    expect(cards[0].get('[data-testid="recent-stats"]').text()).toContain('3')
    expect(cards[0].get('[data-testid="recent-top"]').text()).toContain('Жим лёжа')
    expect(cards[0].get('[data-testid="recent-top"]').text()).toContain('62,5')
    expect(cards[1].get('[data-testid="recent-when"]').text()).toContain('26.10')
    w.unmount()
  })
  it('«Весь журнал» отдаёт событие; без записей блока нет', async () => {
    const w = mk()
    await w.get('[data-testid="recent-all"]').trigger('click')
    expect(w.emitted('open-journal')).toHaveLength(1)
    w.unmount()
    const e = mk([], [])
    expect(e.find('[data-testid="recent-workouts"]').exists()).toBe(false)
    e.unmount()
  })
})
