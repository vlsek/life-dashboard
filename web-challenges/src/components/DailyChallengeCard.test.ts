import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DailyChallengeCard from './DailyChallengeCard.vue'
import { addDaysIso, todayStr } from '../lib/date'
import type { Challenge, ChallengeEntry } from '../lib/types'

// Старт — 3 дня назад, поэтому сегодня — день №4 (индекс 3) из 7; дни 5–7 — будущие.
const START = addDaysIso(todayStr(), -3)
const day = (i: number) => addDaysIso(START, i)
const ch = (over: Partial<Challenge> = {}): Challenge => ({
  id: 'c1', user_id: 'u', template_id: null, title: 'Отжимания', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: START,
  duration_days: 7, daily_target: 20, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '', ...over,
})
const en = (date: string, value: number): ChallengeEntry => ({ id: date, user_id: 'u', challenge_id: 'c1', date, value, note: null, created_at: '' })
const dot = (w: ReturnType<typeof mount>, i: number) => w.find(`[data-day="${day(i)}"]`)

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('DailyChallengeCard — прошлые дни', () => {
  it('по умолчанию выбран сегодняшний день: ввод за сегодня отдаёт сегодняшнюю дату', async () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch(), entries: [] } })
    expect(w.find('[data-testid="day-label"]').text()).toContain('Цель на сегодня')
    await w.find('[data-testid="day-value"]').setValue('25')
    await w.find('[data-testid="day-value"]').trigger('change')
    expect(w.emitted('setDay')?.[0]).toEqual(['c1', todayStr(), 25])
  })

  it('будущие дни недоступны, прошедшие и сегодняшний — доступны', () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch(), entries: [] } })
    for (const i of [0, 1, 2, 3]) expect(dot(w, i).attributes('disabled')).toBeUndefined()
    for (const i of [4, 5, 6]) expect(dot(w, i).attributes('disabled')).toBeDefined()
  })

  it('клик по прошедшему дню: подпись с датой, поле заполнено значением того дня, сохранение — за ту дату', async () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch(), entries: [en(day(1), 15)] } })
    await dot(w, 1).trigger('click')
    expect(dot(w, 1).attributes('data-selected')).toBe('true')
    expect(w.find('[data-testid="day-label"]').text()).toContain(`Цель на ${day(1).slice(8, 10)}.${day(1).slice(5, 7)}`)
    expect((w.find('[data-testid="day-value"]').element as HTMLInputElement).value).toBe('15')
    await w.find('[data-testid="day-value"]').setValue('22')
    await w.find('[data-testid="day-value"]').trigger('change')
    expect(w.emitted('setDay')?.[0]).toEqual(['c1', day(1), 22])
  })

  it('день без записи: поле пустое; очистка поля сохраняет 0', async () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch(), entries: [] } })
    await dot(w, 0).trigger('click')
    expect((w.find('[data-testid="day-value"]').element as HTMLInputElement).value).toBe('')
    await w.find('[data-testid="day-value"]').setValue('')
    await w.find('[data-testid="day-value"]').trigger('change')
    expect(w.emitted('setDay')?.[0]).toEqual(['c1', day(0), 0])
  })

  it('клик по будущему дню ничего не меняет (кружок отключён)', async () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch(), entries: [] } })
    await dot(w, 5).trigger('click')
    expect(dot(w, 3).attributes('data-selected')).toBe('true')
    expect(dot(w, 5).attributes('data-selected')).toBe('false')
  })

  it('boolean-челлендж: галочка за прошедший день отдаёт ту дату; за сегодня подпись «Сделано сегодня»', async () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch({ type: 'daily_boolean', unit: null, daily_target: null }), entries: [en(day(2), 1)] } })
    expect(w.find('[data-testid="day-label"]').text()).toBe('Сделано сегодня')
    await dot(w, 2).trigger('click')
    const cb = w.find('[data-testid="day-checkbox"]')
    expect((cb.element as HTMLInputElement).checked).toBe(true)
    await cb.setValue(false)
    expect(w.emitted('setDay')?.[0]).toEqual(['c1', day(2), 0])
    await dot(w, 1).trigger('click')
    expect(w.find('[data-testid="day-label"]').text()).toContain('Сделано')
    expect(w.find('[data-testid="day-label"]').text()).not.toContain('сегодня')
  })

  it('челлендж закончился: выбран последний день, ввод доступен, кнопка «завершить» на месте', () => {
    const over = ch({ start_date: addDaysIso(todayStr(), -10), duration_days: 5 })
    const w = mount(DailyChallengeCard, { props: { challenge: over, entries: [] } })
    expect(w.find('[data-testid="day-input"]').exists()).toBe(true)
    expect(w.find(`[data-day="${addDaysIso(over.start_date, 4)}"]`).attributes('data-selected')).toBe('true')
    expect(w.text()).toContain('Отметить завершённым')
  })

  it('не начавшийся челлендж: ввода нет (все дни будущие)', () => {
    const future = ch({ start_date: addDaysIso(todayStr(), 2) })
    const w = mount(DailyChallengeCard, { props: { challenge: future, entries: [] } })
    expect(w.find('[data-testid="day-input"]').exists()).toBe(false)
  })

  it('кнопка «Править» по-прежнему отдаёт челлендж', async () => {
    const c = ch()
    const w = mount(DailyChallengeCard, { props: { challenge: c, entries: [] } })
    await w.find('[data-testid="edit-challenge"]').trigger('click')
    expect(w.emitted('edit')?.[0]).toEqual([c])
  })
})
