import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { HORIZON_DAYS, MAX_DEADLINES, MAX_PLANS, buildToday, daysBetween, dueKind, type GoalRow } from './lib/todaySummary'
import TodayCard from './components/TodayCard.vue'
import { defaultShow, parseShow, serializeShow } from './lib/calendarShow'
import type { PlannedItem } from './lib/types'

// BACKLOG 44.8, срез 4: карточка «Сегодня» над сеткой «Календаря».
const TODAY = '2026-10-20'
const plan = (n: number, doneCount = 0): PlannedItem[] => Array.from({ length: n }, (_, i) => ({ type: 'custom', text: 'Дело ' + (i + 1), done: i < doneCount }))
const goal = (id: string, deadline: string | null, done = false, name = 'Цель ' + id): GoalRow => ({ id, name, done, deadline })

describe('даты и срок', () => {
  it('daysBetween: календарные дни, через границу месяца и перевод часов', () => {
    expect(daysBetween('2026-10-20', '2026-10-20')).toBe(0)
    expect(daysBetween('2026-10-20', '2026-10-21')).toBe(1)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
    expect(daysBetween('2026-10-20', '2026-10-19')).toBe(-1)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // перевод часов в Европе
  })
  it('dueKind: просрочено / сегодня / завтра / позже', () => {
    expect([-3, 0, 1, 5].map(dueKind)).toEqual(['overdue', 'today', 'tomorrow', 'soon'])
  })
})

describe('buildToday', () => {
  it('планы: счёт n из m, первые MAX_PLANS и «ещё n»', () => {
    const s = buildToday(TODAY, plan(6, 2), [])
    expect(s.plannedTotal).toBe(6)
    expect(s.plannedDone).toBe(2)
    expect(s.plans).toHaveLength(MAX_PLANS)
    expect(s.planMore).toBe(2)
    expect(buildToday(TODAY, [], []).plans).toEqual([])
  })
  it('сроки: невыполненные в горизонте; просроченные первыми, затем по дате; выполненные и без срока и дальше горизонта не входят', () => {
    const far = '2026-11-10'
    const s = buildToday(TODAY, [], [
      goal('far', far),
      goal('later', '2026-10-25'),
      goal('done', '2026-10-21', true),
      goal('none', null),
      goal('old', '2026-10-17'),
      goal('tom', '2026-10-21'),
      goal('today', TODAY),
    ])
    expect(s.upcoming.map((g) => g.id)).toEqual(['old', 'today', 'tom'])
    expect(s.upcoming[0]).toMatchObject({ daysLeft: -3, kind: 'overdue' })
    expect(s.upcomingMore).toBe(1) // later не поместилась
    expect(buildToday(TODAY, [], [goal('edge', '2026-11-03')]).upcoming).toHaveLength(1) // ровно HORIZON_DAYS = 14
    expect(HORIZON_DAYS).toBe(14)
    expect(MAX_DEADLINES).toBe(3)
  })
})

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('TodayCard', () => {
  const mountCard = (plans: PlannedItem[], goals: GoalRow[]) => mount(TodayCard, { props: { summary: buildToday(TODAY, plans, goals), date: TODAY } })
  it('есть планы: заголовок с датой, «Планы: 1 из 3», пункты с отметками, кнопка «Открыть день»', () => {
    const w = mountCard(plan(3, 1), [])
    expect(w.find('[data-test="today-title"]').text()).toContain('Сегодня')
    expect(w.find('[data-test="today-title"]').text()).toContain('20')
    expect(w.find('[data-test="today-progress"]').text()).toBe('Планы: 1 из 3')
    expect(w.findAll('[data-test="today-plans"] li').map((l) => l.text()[0])).toEqual(['✓', '○', '○'])
    expect(w.find('[data-test="today-open"]').text()).toBe('Открыть день')
    expect(w.find('[data-test="today-none"]').exists()).toBe(false)
  })
  it('нет планов: подсказка и кнопка «Запланировать день»; кнопка шлёт open с датой', async () => {
    const w = mountCard([], [])
    expect(w.find('[data-test="today-none"]').exists()).toBe(true)
    expect(w.find('[data-test="today-open"]').text()).toBe('Запланировать день')
    expect(w.find('[data-test="today-deadlines"]').exists()).toBe(false)
    await w.find('[data-test="today-open"]').trigger('click')
    expect(w.emitted('open')).toEqual([[TODAY]])
  })
  it('сроки: подписи «просрочено на 3 дн.», «срок сегодня», «срок завтра», «через 5 дн.»', () => {
    const w = mountCard([], [goal('a', '2026-10-17'), goal('b', TODAY), goal('c', '2026-10-21'), goal('d', '2026-10-25')])
    expect(w.find('[data-test="today-due-a"]').text()).toContain('просрочено на 3 дн.')
    expect(w.find('[data-test="today-due-a"]').attributes('data-kind')).toBe('overdue')
    expect(w.find('[data-test="today-due-b"]').text()).toContain('срок сегодня')
    expect(w.find('[data-test="today-due-c"]').text()).toContain('срок завтра')
    expect(w.text()).toContain('ещё 1') // четвёртая не поместилась
  })
})

describe('настройка «Карточка «Сегодня»»', () => {
  it('включена по умолчанию; выключенная запоминается и читается обратно', () => {
    expect(defaultShow().today).toBe(true)
    const off = { ...defaultShow(), today: false }
    expect(serializeShow(off)).toBe('{"today":false}')
    expect(parseShow('{"today":false}').today).toBe(false)
    expect(parseShow(null).today).toBe(true)
  })
})
