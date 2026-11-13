import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import IntervalTimer from './IntervalTimer.vue'
import { INTERVAL_STORE_KEY } from '../lib/intervalTimer'
import { t } from '../lib/i18n'

const mountIt = () => mount(IntervalTimer, { attachTo: document.body })
const id = (w: ReturnType<typeof mountIt>, s: string) => w.find(`[data-testid="${s}"]`)

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-13T10:00:00Z')); localStorage.clear() })
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

describe('IntervalTimer — интервалы', () => {
  it('настройки: шаги ±, итоговое время, сохранение', async () => {
    const w = mountIt()
    expect(id(w, 'timer-val-work').text()).toBe('30')
    await id(w, 'timer-inc-work').trigger('click')
    expect(id(w, 'timer-val-work').text()).toBe('35')
    await id(w, 'timer-dec-rounds').trigger('click')
    expect(id(w, 'timer-val-rounds').text()).toBe('7')
    // 5 разминка + 7×35 работы + 6×15 отдыха = 340 с = 5:40
    expect(id(w, 'timer-total').text()).toContain('5:40')
    expect(JSON.parse(localStorage.getItem(INTERVAL_STORE_KEY) as string)).toEqual({ work: 35, rest: 15, rounds: 7 })
    w.unmount()
  })

  it('старт: разминка → работа → отдых → … → готово; пауза замораживает время', async () => {
    localStorage.setItem(INTERVAL_STORE_KEY, JSON.stringify({ work: 10, rest: 5, rounds: 2 }))
    const w = mountIt()
    await id(w, 'timer-start').trigger('click')
    expect(id(w, 'timer-run').attributes('data-phase')).toBe('warmup')
    expect(id(w, 'timer-left').text()).toBe('0:05')
    await vi.advanceTimersByTimeAsync(5_200)
    expect(id(w, 'timer-run').attributes('data-phase')).toBe('work')
    expect(id(w, 'timer-round').text()).toBe(t('timer_round_of').replace('{n}', '1').replace('{m}', '2'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(id(w, 'timer-run').attributes('data-phase')).toBe('rest')
    await id(w, 'timer-pause').trigger('click')
    const frozen = id(w, 'timer-left').text()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(id(w, 'timer-left').text()).toBe(frozen)
    await id(w, 'timer-start').trigger('click')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(id(w, 'timer-run').attributes('data-phase')).toBe('done')
    expect(id(w, 'timer-phase').text()).toBe(t('timer_phase_done'))
    w.unmount()
  })

  it('сброс возвращает к настройкам; во время работы ± недоступны', async () => {
    const w = mountIt()
    await id(w, 'timer-start').trigger('click')
    expect(id(w, 'timer-setup').exists()).toBe(false)
    await id(w, 'timer-reset').trigger('click')
    expect(id(w, 'timer-setup').exists()).toBe(true)
    w.unmount()
  })

  it('сигнал и вибрация на смене фазы', async () => {
    const vib = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vib, configurable: true })
    localStorage.setItem(INTERVAL_STORE_KEY, JSON.stringify({ work: 10, rest: 5, rounds: 2 }))
    const w = mountIt()
    await id(w, 'timer-start').trigger('click')
    await vi.advanceTimersByTimeAsync(5_400)
    expect(vib).toHaveBeenCalledWith(200)
    w.unmount()
  })
})

describe('IntervalTimer — секундомер', () => {
  it('идёт, круги считают разницу, сброс обнуляет', async () => {
    const w = mountIt()
    await id(w, 'timer-tab-stopwatch').trigger('click')
    expect(id(w, 'timer-sw-value').text()).toBe('0:00.0')
    await id(w, 'timer-start').trigger('click')
    await vi.advanceTimersByTimeAsync(3_000)
    await id(w, 'timer-lap-btn').trigger('click')
    await vi.advanceTimersByTimeAsync(2_000)
    await id(w, 'timer-lap-btn').trigger('click')
    const laps = w.findAll('[data-testid="timer-lap"]')
    expect(laps.length).toBe(2)
    expect(laps[0].text()).toContain('0:02.0') // последний круг сверху
    expect(laps[1].text()).toContain('0:03.0')
    await id(w, 'timer-reset').trigger('click')
    expect(id(w, 'timer-sw-value').text()).toBe('0:00.0')
    expect(w.findAll('[data-testid="timer-lap"]').length).toBe(0)
    w.unmount()
  })
})
