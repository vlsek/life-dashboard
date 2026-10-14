import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import AchievementToast from './components/AchievementToast.vue'
import { DATA_CHANGED } from './lib/events'
import { ACTION_DELAY_MS, ACTION_MIN_GAP_MS, BG_MSG_DONE, BG_MSG_NEW, CHECK_EVERY_MS, WATCH_SKIP, YOUNG_ACCOUNT_DAYS, YOUNG_CHECK_EVERY_MS, checkEveryMs, isCheckDue, isYoungAccount, parseWatchMessage, startAchievementWatcher } from './lib/achievementWatcher'

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

// BACKLOG 58.12: у нового аккаунта проверка новых достижений чаще, иначе поздравление не приходило в первые минуты
describe('isYoungAccount / checkEveryMs', () => {
  const now = Date.parse('2026-10-11T12:00:00Z')
  const ago = (ms: number) => new Date(now - ms).toISOString()
  const DAY = 24 * 3600 * 1000
  it('младше 14 дней — новый; ровно 14 дней и старше — нет', () => {
    expect(isYoungAccount(ago(0), now)).toBe(true)
    expect(isYoungAccount(ago(YOUNG_ACCOUNT_DAYS * DAY - 1000), now)).toBe(true)
    expect(isYoungAccount(ago(YOUNG_ACCOUNT_DAYS * DAY), now)).toBe(false)
    expect(isYoungAccount(ago(100 * DAY), now)).toBe(false)
  })
  it('небольшая разница часов (создан «в будущем» до минуты) терпим, больше — нет; нет даты / мусор — старый аккаунт', () => {
    expect(isYoungAccount(ago(-30_000), now)).toBe(true)
    expect(isYoungAccount(ago(-5 * 60_000), now)).toBe(false)
    for (const bad of [null, undefined, '', 'вчера', 'NaN']) expect(isYoungAccount(bad as string | null | undefined, now)).toBe(false)
  })
  it('интервал: новый аккаунт — 90 с, остальные и без даты — 10 минут', () => {
    expect(checkEveryMs(ago(DAY), now)).toBe(YOUNG_CHECK_EVERY_MS)
    expect(checkEveryMs(ago(30 * DAY), now)).toBe(CHECK_EVERY_MS)
    expect(checkEveryMs(null, now)).toBe(CHECK_EVERY_MS)
    expect(YOUNG_CHECK_EVERY_MS).toBeLessThan(CHECK_EVERY_MS)
    expect(YOUNG_CHECK_EVERY_MS).toBeLessThanOrEqual(3 * 60_000) // абсолютная граница: новый человек получает поздравление не позже чем через ~3 минуты
  })
})

describe('startAchievementWatcher: новый и старый аккаунт', () => {
  beforeEach(() => {
    ;(window as unknown as { happyDOM?: { settings: { disableIframePageLoading: boolean } } }).happyDOM!.settings.disableIframePageLoading = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    localStorage.clear()
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  const finish = () => {
    const frame = document.querySelector('iframe') as HTMLIFrameElement
    window.dispatchEvent(new MessageEvent('message', { data: { type: BG_MSG_DONE }, origin: window.location.origin, source: frame.contentWindow as Window }))
  }

  it('новый аккаунт: следующая проверка примерно через 1,5–2 минуты, а не через 10 (первые действия не остаются без поздравления)', () => {
    const created = new Date(Date.now() - 3600 * 1000).toISOString()
    const stop = startAchievementWatcher(() => {}, { createdAt: created })
    vi.advanceTimersByTime(4100)
    expect(document.querySelector('iframe')).not.toBeNull() // первая проверка
    finish()
    expect(document.querySelector('iframe')).toBeNull()
    const wait = waitForFrame(20 * 60_000)
    expect(wait).toBeGreaterThanOrEqual(YOUNG_CHECK_EVERY_MS - 30_000)
    expect(wait).toBeLessThanOrEqual(YOUNG_CHECK_EVERY_MS + 60_000)
    expect(wait).toBeLessThanOrEqual(3 * 60_000 + 30_000) // и в любом случае не дольше ~3,5 минуты (а не 10)
    stop()
  })

  // Шагаем по 30 с до появления iframe и возвращаем, сколько прошло (мс); нужна, чтобы не гадать с таймаутом самого iframe (90 с)
  const waitForFrame = (maxMs: number): number => {
    let elapsed = 0
    while (elapsed < maxMs && !document.querySelector('iframe')) {
      vi.advanceTimersByTime(30_000)
      elapsed += 30_000
    }
    return document.querySelector('iframe') ? elapsed : -1
  }

  it.each([
    ['старый аккаунт (60 дней)', () => new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()],
    ['аккаунт без даты', () => null],
  ])('%s: следующая проверка не раньше чем через 10 минут', (_name, mkCreated) => {
    const stop = startAchievementWatcher(() => {}, { createdAt: mkCreated() })
    vi.advanceTimersByTime(4100)
    expect(document.querySelector('iframe')).not.toBeNull() // первая проверка
    finish()
    const wait = waitForFrame(20 * 60_000)
    expect(wait).toBeGreaterThanOrEqual(CHECK_EVERY_MS - 10_000) // не раньше ~10 минут
    expect(wait).toBeLessThanOrEqual(CHECK_EVERY_MS + 60_000) // но и не «никогда»
    stop()
  })

  it('пока предыдущая проверка не завершилась, вторую не запускаем (даже у нового аккаунта)', () => {
    const created = new Date(Date.now() - 3600 * 1000).toISOString()
    const stop = startAchievementWatcher(() => {}, { createdAt: created })
    vi.advanceTimersByTime(4100)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    vi.advanceTimersByTime(80_000) // iframe ещё не ответил (таймаут 90 с)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    stop()
  })
})

describe('проверка сразу после действия (52.1)', () => {
  beforeEach(() => {
    ;(window as unknown as { happyDOM?: { settings: { disableIframePageLoading: boolean } } }).happyDOM!.settings.disableIframePageLoading = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    localStorage.clear()
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  const old = () => new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
  const finish = () => {
    const frame = document.querySelector('iframe') as HTMLIFrameElement
    window.dispatchEvent(new MessageEvent('message', { data: { type: BG_MSG_DONE }, origin: window.location.origin, source: frame.contentWindow as Window }))
  }
  const act = () => window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: { metricId: 'm', date: '2026-10-14', value: 1 } }))

  it('действие запускает проверку через ~5 с, хотя обычный интервал (10 мин) не прошёл', () => {
    const stop = startAchievementWatcher(() => {}, { createdAt: old() })
    vi.advanceTimersByTime(4100)
    finish() // первая плановая проверка прошла
    vi.advanceTimersByTime(ACTION_MIN_GAP_MS + 1000)
    expect(document.querySelector('iframe')).toBeNull()
    act()
    vi.advanceTimersByTime(ACTION_DELAY_MS - 100)
    expect(document.querySelector('iframe')).toBeNull() // ждём 5 с
    vi.advanceTimersByTime(200)
    expect(document.querySelector('iframe')).not.toBeNull()
    stop()
  })
  it('пачка действий — одна проверка; чаще раза в 30 с не проверяем', () => {
    const stop = startAchievementWatcher(() => {}, { createdAt: old() })
    vi.advanceTimersByTime(4100)
    finish()
    vi.advanceTimersByTime(ACTION_MIN_GAP_MS + 1000)
    act(); act(); act()
    vi.advanceTimersByTime(ACTION_DELAY_MS + 100)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    finish()
    act() // сразу после проверки
    vi.advanceTimersByTime(ACTION_DELAY_MS + 100)
    expect(document.querySelector('iframe')).toBeNull() // с прошлой проверки < 30 с
    stop()
  })
  it('после остановки наблюдателя действия ничего не запускают', () => {
    const stop = startAchievementWatcher(() => {}, { createdAt: old() })
    vi.advanceTimersByTime(4100)
    finish()
    vi.advanceTimersByTime(ACTION_MIN_GAP_MS + 1000)
    act()
    stop()
    vi.advanceTimersByTime(ACTION_DELAY_MS + 100)
    expect(document.querySelector('iframe')).toBeNull()
  })
})

describe('main.ts передаёт дату создания аккаунта наблюдателю', () => {
  it('без неё все аккаунты считались бы «старыми» и новый снова ждал бы по 10 минут', () => {
    const src: string = readFileSync('src/main.ts', 'utf-8')
    expect(src).toMatch(/startAchievementWatcher\(showAchievementToast, \{ createdAt: data\.session\.user\.created_at/)
  })
})
