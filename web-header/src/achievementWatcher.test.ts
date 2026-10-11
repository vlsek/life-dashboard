import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AchievementToast from './components/AchievementToast.vue'
import { BG_MSG_DONE, BG_MSG_NEW, CHECK_EVERY_MS, WATCH_SKIP, isCheckDue, parseWatchMessage, startAchievementWatcher } from './lib/achievementWatcher'

// BACKLOG 52.1 срез 2: поздравление о новом достижении на любой странице.
describe('isCheckDue', () => {
  it('нет отметки / давно / из будущего — пора; недавно — нет', () => {
    const now = 1_000_000_000
    expect(isCheckDue(null, now)).toBe(true)
    expect(isCheckDue(Number.NaN, now)).toBe(true)
    expect(isCheckDue(now - CHECK_EVERY_MS, now)).toBe(true)
    expect(isCheckDue(now - CHECK_EVERY_MS + 1, now)).toBe(false)
    expect(isCheckDue(now + 5000, now)).toBe(true)
  })
})

describe('parseWatchMessage', () => {
  it('принимает наш протокол, чужое отбрасывает', () => {
    expect(parseWatchMessage({ type: BG_MSG_DONE })).toEqual({ type: BG_MSG_DONE })
    expect(parseWatchMessage({ type: BG_MSG_NEW, items: [{ key: 'a', title: 'A', reward: '+50' }, { key: 1 }, null, { key: 'b', title: 'B' }] })).toEqual({
      type: BG_MSG_NEW,
      items: [{ key: 'a', title: 'A', reward: '+50' }, { key: 'b', title: 'B', reward: null }],
    })
    expect(parseWatchMessage({ type: BG_MSG_NEW, items: [] })).toBeNull()
    expect(parseWatchMessage({ type: 'other' })).toBeNull()
    expect(parseWatchMessage('x')).toBeNull()
    expect(parseWatchMessage(null)).toBeNull()
  })
  it('страницы без проверки: вход, онбординг, админка, сама «Достижения»', () => {
    for (const p of ['/login/', '/onboarding/', '/admin.html', '/achievements/', '/achievements']) expect(WATCH_SKIP.test(p)).toBe(true)
    for (const p of ['/', '/dashboard/', '/goals/', '/workouts.html']) expect(WATCH_SKIP.test(p)).toBe(false)
  })
})

describe('AchievementToast', () => {
  it('одно достижение: название и награда; несколько — заголовок во множественном числе', () => {
    const one = mount(AchievementToast, { props: { items: [{ key: 'a', title: 'Первая цель', reward: '+50 монет' }] } })
    expect(one.findAll('[data-test="ach-toast-item"]')).toHaveLength(1)
    expect(one.text()).toContain('Первая цель')
    expect(one.text()).toContain('+50 монет')
    expect(one.find('[data-test="ach-toast-open"]').attributes('href')).toBe('/achievements/')
    const many = mount(AchievementToast, { props: { items: [{ key: 'a', title: 'A', reward: null }, { key: 'b', title: 'B', reward: null }] } })
    expect(many.findAll('[data-test="ach-toast-item"]')).toHaveLength(2)
    expect(many.text()).not.toContain('null')
    expect(many.text()).not.toBe(one.text())
  })
  it('крестик закрывает', async () => {
    const w = mount(AchievementToast, { props: { items: [{ key: 'a', title: 'A', reward: null }] } })
    await w.find('[data-test="ach-toast-close"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})

describe('startAchievementWatcher', () => {
  beforeEach(() => {
    // не даём happy-dom реально грузить страницу в iframe (шум в логе)
    ;(window as unknown as { happyDOM?: { settings: { disableIframePageLoading: boolean } } }).happyDOM!.settings.disableIframePageLoading = true
    vi.spyOn(console, 'error').mockImplementation(() => {}) // happy-dom ругается на отключённую загрузку iframe
    vi.useFakeTimers()
    localStorage.clear()
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('через 4 с создаёт скрытый iframe, получает новое от него и убирает его по «готово»', () => {
    const got: unknown[] = []
    const stop = startAchievementWatcher((items) => got.push(items))
    expect(document.querySelector('iframe')).toBeNull()
    vi.advanceTimersByTime(4100)
    const frame = document.querySelector('iframe') as HTMLIFrameElement
    expect(frame.src).toContain('/achievements/?bg=1')
    expect(frame.getAttribute('aria-hidden')).toBe('true')
    const post = (data: unknown, source: unknown = frame.contentWindow) => window.dispatchEvent(new MessageEvent('message', { data, origin: window.location.origin, source: source as Window }))
    post({ type: BG_MSG_NEW, items: [{ key: 'a', title: 'A', reward: null }] }, window) // чужой источник — игнор
    expect(got).toHaveLength(0)
    post({ type: BG_MSG_NEW, items: [{ key: 'a', title: 'A', reward: null }] })
    expect(got).toHaveLength(1)
    post({ type: BG_MSG_DONE })
    expect(document.querySelector('iframe')).toBeNull()
    stop()
  })

  it('не проверяет чаще раза в 10 минут и не стартует при свежей отметке', () => {
    localStorage.setItem('gh_ach_check', String(Date.now()))
    const stop = startAchievementWatcher(() => {})
    vi.advanceTimersByTime(5000)
    expect(document.querySelector('iframe')).toBeNull()
    vi.advanceTimersByTime(CHECK_EVERY_MS)
    expect(document.querySelector('iframe')).not.toBeNull()
    stop()
    expect(document.querySelector('iframe')).toBeNull()
  })
})
