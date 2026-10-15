import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import mainSrc from './main.ts?raw'
import { DOT_CLASS, UNSEEN_KEY, applyDot, clearUnseen, hasUnseen, markUnseen, removeDots, watchDot } from './lib/achievementDot'

// BACKLOG 52.1 срез 5: красная точка у пункта меню «Достижения».
const nav = () => {
  document.body.innerHTML = `
    <nav><a id="a" href="/achievements/">Достижения</a><a id="g" href="/goals/">Цели</a></nav>
    <div class="gh-secach"><a class="gh-secach-link" href="/achievements/">Все достижения →</a></div>
    <div id="gh-ach-toast"><a id="t" href="/achievements/">Открыть</a></div>`
}
const dots = () => document.querySelectorAll('.' + DOT_CLASS)

beforeEach(() => {
  localStorage.clear()
  nav()
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('точка у «Достижений»', () => {
  it('без новых достижений точки нет', () => {
    applyDot()
    expect(dots()).toHaveLength(0)
    expect(hasUnseen()).toBe(false)
  })
  it('markUnseen ставит точку ТОЛЬКО на пункт меню (не на «Все достижения →» и не на карточку), без дублей', () => {
    markUnseen()
    applyDot()
    expect(hasUnseen()).toBe(true)
    expect(dots()).toHaveLength(1)
    expect(document.querySelector('#a .' + DOT_CLASS)).not.toBeNull()
    expect(document.querySelector('#g .' + DOT_CLASS)).toBeNull()
  })
  it('clearUnseen снимает точку и признак', () => {
    markUnseen()
    clearUnseen()
    expect(dots()).toHaveLength(0)
    expect(localStorage.getItem(UNSEEN_KEY)).toBeNull()
    applyDot()
    expect(dots()).toHaveLength(0)
  })
  it('точка декоративная (aria-hidden); removeDots убирает все', () => {
    applyDot(document, true)
    expect(dots()[0].getAttribute('aria-hidden')).toBe('true')
    removeDots()
    expect(dots()).toHaveLength(0)
  })
})

describe('watchDot: меню перерисовали — точка возвращается; второй наблюдатель не создаётся', () => {
  it('после замены ссылок точка ставится снова', async () => {
    vi.useFakeTimers()
    markUnseen()
    const stop = watchDot()
    expect(watchDot()).toBe(stop)
    document.querySelector('nav')!.innerHTML = '<a id="a2" href="/achievements/">Достижения</a>'
    await vi.advanceTimersByTimeAsync(300)
    expect(document.querySelector('#a2 .' + DOT_CLASS)).not.toBeNull()
    stop()
    document.querySelector('nav')!.innerHTML = '<a id="a3" href="/achievements/">Достижения</a>'
    await vi.advanceTimersByTimeAsync(300)
    expect(document.querySelector('#a3 .' + DOT_CLASS)).toBeNull()
    vi.useRealTimers()
  })
})

describe('main.ts подключает точку', () => {
  it('карточка помечает «не открывал», на странице «Достижения» признак снимается', () => {
    const src: string = mainSrc
    expect(src).toMatch(/markUnseen\(\)/)
    expect(src).toMatch(/\/\^\\\/achievements[^\n]*clearUnseen\(\)/)
  })
})
