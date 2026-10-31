import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WeeklyRitual from './components/WeeklyRitual.vue'
import { MIN_TREND_DAYS, buildWeeklyReview, dismissWeekly, isWeeklyDismissed, loadWeeklyNote, reviewWeekStart, saveWeeklyNote } from './lib/weeklyReview'
import { addDaysIso } from './lib/date'
import type { YearGridData } from './lib/yearGrid'
import type { Metric } from './lib/types'

// Недельный ритуал (BACKLOG 75.6)
function metric(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Зарядка', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}
const SUN = new Date(2026, 10, 1) // воскресенье 2026-11-01 → неделя пн 2026-10-26 … вс 2026-11-01
const MON = new Date(2026, 10, 2) // понедельник 2026-11-02 → та же неделя
const WED = new Date(2026, 9, 28)
const WS = '2026-10-26'
const d = (n: number) => addDaysIso(WS, n) // n=0 пн … 6 вс

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('reviewWeekStart', () => {
  it('воскресенье — текущая неделя, понедельник — только что закончившаяся, в остальные дни ритуала нет', () => {
    expect(reviewWeekStart(SUN)).toBe(WS)
    expect(reviewWeekStart(MON)).toBe(WS)
    expect(reviewWeekStart(WED)).toBeNull()
    expect(reviewWeekStart(new Date(2026, 10, 3))).toBeNull() // вторник
  })
})

describe('buildWeeklyReview', () => {
  const a = metric({ id: 'a', name: 'Зарядка' })
  const b = metric({ id: 'b', name: 'Вода', position: 1 })

  it('считает выполненные отметки из нужных по расписанию', () => {
    const byDay = { [d(0)]: { a: true, b: true }, [d(1)]: { a: true, b: false }, [d(2)]: { a: false, b: false } }
    const r = buildWeeklyReview([a, b], byDay, WS, SUN)!
    // пн–вс: данные только пн–ср, но четверг–воскресенье тоже «нужны», а записей нет → пропуски
    expect(r.total).toBe(14)
    expect(r.done).toBe(3)
  })

  it('лучший день: наибольшая доля; нужен хотя бы 1 выполненный и 2 метрики в день', () => {
    const byDay = { [d(0)]: { a: true, b: false }, [d(1)]: { a: true, b: true }, [d(2)]: { a: true, b: false } }
    expect(buildWeeklyReview([a, b], byDay, WS, SUN)!.bestDay).toEqual({ date: d(1), done: 2, total: 2 })
  })

  it('день без единого выполнения «лучшим» не бывает', () => {
    const byDay = { [d(0)]: { a: false, b: false } }
    expect(buildWeeklyReview([a, b], byDay, WS, SUN)!.bestDay).toBeNull()
  })

  it('дни до первой записи не считаются пропусками (73.5)', () => {
    const byDay = { [d(4)]: { a: true, b: true }, [d(5)]: { a: true, b: true } } // начал вести в пятницу
    const r = buildWeeklyReview([a, b], byDay, WS, SUN)!
    expect(r.total).toBe(6) // пт, сб, вс × 2 метрики
    expect(r.done).toBe(4)
  })

  it('нет ни одной записи — ритуала нет', () => {
    expect(buildWeeklyReview([a, b], {}, WS, SUN)).toBeNull()
  })

  it('дни после сегодняшнего (понедельник разбирает прошлую неделю целиком, воскресенье — до сегодня включительно)', () => {
    const byDay = { [d(0)]: { a: true } }
    expect(buildWeeklyReview([a], byDay, WS, new Date(2026, 9, 28))!.total).toBe(3) // среда: пн, вт, ср
  })

  it('«N раз в неделю», «не больше N» и метрики без «считать серию» в итог не входят', () => {
    const weekly = metric({ id: 'w', schedule: { type: 'weekly', min: 3 } })
    const noStreak = metric({ id: 'x', count_streak: false })
    const byDay = { [d(0)]: { a: true, w: true, x: true } }
    expect(buildWeeklyReview([a, weekly, noStreak], byDay, WS, SUN)!.total).toBe(7) // только «a»
  })

  describe('метрика с лучшей динамикой', () => {
    const week = (start: string, flags: boolean[], id = 'a') => Object.fromEntries(flags.map((f, i) => [addDaysIso(start, i), { [id]: f }]))
    it('рост доли выполнения к прошлой неделе; показываем только при достаточных данных в обеих неделях', () => {
      const prev = week(addDaysIso(WS, -7), [true, false, false, false, false, false, false])
      const cur = week(WS, [true, true, true, true, true, true, false])
      const r = buildWeeklyReview([a], { ...prev, ...cur }, WS, SUN)!
      expect(r.bestMetric).toMatchObject({ id: 'a', thisDone: 6, thisTotal: 7, prevDone: 1, prevTotal: 7 })
    })
    it('если прошлой недели почти нет (меньше MIN_TREND_DAYS дней) — динамики нет', () => {
      expect(MIN_TREND_DAYS).toBe(3)
      const prev = { [addDaysIso(WS, -1)]: { a: false }, [addDaysIso(WS, -2)]: { a: false } } // 2 дня
      const cur = week(WS, [true, true, true, true, true, true, true])
      expect(buildWeeklyReview([a], { ...prev, ...cur }, WS, SUN)!.bestMetric).toBeNull()
    })
    it('без заметного роста (меньше порога) или при падении — динамики нет', () => {
      const prev = week(addDaysIso(WS, -7), [true, true, true, true, false, false, false])
      const cur = week(WS, [true, true, true, true, true, false, false])
      expect(buildWeeklyReview([a], { ...prev, ...cur }, WS, SUN)!.bestMetric).toBeNull() // 4/7 → 5/7 = +0,14 < 0,15
      const worse = week(WS, [true, false, false, false, false, false, false])
      expect(buildWeeklyReview([a], { ...prev, ...worse }, WS, SUN)!.bestMetric).toBeNull()
    })
  })
})

describe('заметка и скрытие на устройстве', () => {
  it('заметка сохраняется на неделю, пустая стирается, длина ограничена', () => {
    saveWeeklyNote(WS, '  Раньше ложиться  ')
    expect(loadWeeklyNote(WS)).toBe('Раньше ложиться')
    expect(loadWeeklyNote(addDaysIso(WS, 7))).toBe('')
    saveWeeklyNote(WS, '')
    expect(loadWeeklyNote(WS)).toBe('')
    saveWeeklyNote(WS, 'я'.repeat(500))
    expect(loadWeeklyNote(WS)).toHaveLength(280)
  })
  it('скрытие — на конкретную неделю', () => {
    dismissWeekly(WS)
    expect(isWeeklyDismissed(WS)).toBe(true)
    expect(isWeeklyDismissed(addDaysIso(WS, 7))).toBe(false)
  })
})

describe('WeeklyRitual.vue', () => {
  const a = metric({ id: 'a', name: 'Зарядка' })
  const b = metric({ id: 'b', name: 'Вода', position: 1 })
  const data = (today = SUN): YearGridData => ({
    metrics: [a, b],
    byDay: { [d(0)]: { a: true, b: true }, [d(1)]: { a: true, b: false } },
    notes: {},
    today,
  })

  it('в воскресенье и понедельник показывает итог, лучший день и поле заметки', () => {
    for (const day of [SUN, MON]) {
      const w = mount(WeeklyRitual, { props: { data: data(day) } })
      expect(w.find('[data-test="weekly-ritual"]').exists()).toBe(true)
      expect(w.get('[data-test="wr-done"]').text()).toMatch(/Выполнено \d+ из \d+ отметок по метрикам/)
      expect(w.get('[data-test="wr-best-day"]').text()).toContain('Лучший день')
      expect(w.find('[data-test="wr-note"]').exists()).toBe(true)
    }
  })

  it('в остальные дни и без данных карточки нет, наверх уходит visible=false', () => {
    const w = mount(WeeklyRitual, { props: { data: data(WED) } })
    expect(w.find('[data-test="weekly-ritual"]').exists()).toBe(false)
    expect(w.emitted('visible')?.[0]).toEqual([false])
    expect(mount(WeeklyRitual, { props: { data: null } }).find('[data-test="weekly-ritual"]').exists()).toBe(false)
  })

  it('сообщает наверх о видимости, чтобы в воскресенье не дублировать старый баннер', () => {
    const w = mount(WeeklyRitual, { props: { data: data() } })
    expect(w.emitted('visible')?.[0]).toEqual([true])
  })

  it('«Записать» сохраняет заметку (и по Enter), показывает «Записано»', async () => {
    const w = mount(WeeklyRitual, { props: { data: data() } })
    await w.get('[data-test="wr-note"]').setValue('Раньше ложиться')
    expect(w.find('[data-test="wr-saved"]').exists()).toBe(false)
    await w.get('[data-test="wr-save"]').trigger('click')
    expect(loadWeeklyNote(WS)).toBe('Раньше ложиться')
    expect(w.get('[data-test="wr-saved"]').text()).toBe('Записано')
    await w.get('[data-test="wr-note"]').setValue('Пить воду')
    await w.get('[data-test="wr-note"]').trigger('keydown', { key: 'Enter' })
    expect(loadWeeklyNote(WS)).toBe('Пить воду')
  })

  it('ранее записанная заметка подставляется в поле', () => {
    saveWeeklyNote(WS, 'Раньше ложиться')
    const w = mount(WeeklyRitual, { props: { data: data() } })
    expect((w.get('[data-test="wr-note"]').element as HTMLInputElement).value).toBe('Раньше ложиться')
  })

  it('«×» скрывает карточку на эту неделю: в воскресенье и в понедельник она не вернётся', async () => {
    const w = mount(WeeklyRitual, { props: { data: data() } })
    await w.get('[data-test="wr-dismiss"]').trigger('click')
    expect(w.find('[data-test="weekly-ritual"]').exists()).toBe(false)
    expect(w.emitted('visible')?.pop()).toEqual([false])
    expect(mount(WeeklyRitual, { props: { data: data(MON) } }).find('[data-test="weekly-ritual"]').exists()).toBe(false)
  })
})
