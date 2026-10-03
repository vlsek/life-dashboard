import { beforeEach, describe, expect, it } from 'vitest'
import { isCloseSwipe, isLeftSwipe, isOpenSwipe, isOpenSwipeFrom, isSwipeBlockedTarget, isWideLeftSwipe, openZonePx, startsInOpenZone, swipeZone } from './edgeSwipe'

const W = 400

describe('зона начала жеста (BACKLOG 18.1)', () => {
  it('зона = 20% ширины, не уже 28 и не шире 96 px', () => {
    expect(openZonePx(400)).toBe(80)
    expect(openZonePx(320)).toBe(64)
    expect(openZonePx(100)).toBe(28)
    expect(openZonePx(1920)).toBe(96)
  })
  it('жест можно начинать не только у самого края: 60 px от края — внутри зоны на 400-px экране, 100 px — снаружи', () => {
    expect(startsInOpenZone({ x: 399, y: 300 }, W)).toBe(true)
    expect(startsInOpenZone({ x: 340, y: 300 }, W)).toBe(true)
    expect(startsInOpenZone({ x: 300, y: 300 }, W)).toBe(false)
  })
})

describe('isLeftSwipe / isOpenSwipe', () => {
  it('влево на 56+ px почти горизонтально → да', () => {
    expect(isLeftSwipe({ x: 350, y: 300 }, { x: 290, y: 320 })).toBe(true)
  })
  it('короче порога, вправо или слишком вертикально → нет', () => {
    expect(isLeftSwipe({ x: 350, y: 300 }, { x: 310, y: 300 })).toBe(false)
    expect(isLeftSwipe({ x: 350, y: 300 }, { x: 380, y: 300 })).toBe(false)
    expect(isLeftSwipe({ x: 350, y: 300 }, { x: 290, y: 380 })).toBe(false)
  })
  it('открытие = старт в зоне + свайп влево', () => {
    expect(isOpenSwipe({ x: 345, y: 300 }, { x: 250, y: 310 }, W)).toBe(true)
    expect(isOpenSwipe({ x: 150, y: 300 }, { x: 40, y: 300 }, W)).toBe(false) // старт в левой половине — не наш
    expect(isOpenSwipe({ x: 395, y: 300 }, { x: 370, y: 300 }, W)).toBe(false) // короткий
  })
})

describe('isCloseSwipe', () => {
  it('вправо на 56+ px почти горизонтально → закрыть; влево, короткий, вертикальный → нет', () => {
    expect(isCloseSwipe({ x: 100, y: 300 }, { x: 200, y: 310 })).toBe(true)
    expect(isCloseSwipe({ x: 200, y: 300 }, { x: 100, y: 300 })).toBe(false)
    expect(isCloseSwipe({ x: 100, y: 300 }, { x: 130, y: 300 })).toBe(false)
    expect(isCloseSwipe({ x: 100, y: 300 }, { x: 170, y: 450 })).toBe(false)
  })
})

describe('isSwipeBlockedTarget', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  const scrollable = (overflowX: string) => {
    const el = document.createElement('div')
    el.style.overflowX = overflowX
    Object.defineProperty(el, 'scrollWidth', { value: 600, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
    document.body.appendChild(el)
    return el
  }

  it('обычный элемент не блокирует', () => {
    const el = document.createElement('p')
    document.body.appendChild(el)
    expect(isSwipeBlockedTarget(el)).toBe(false)
    expect(isSwipeBlockedTarget(null)).toBe(false)
  })
  it('ползунок, поля ввода и data-no-swipe (в т.ч. у предка) блокируют', () => {
    for (const type of ['range', 'text', 'number']) {
      const i = document.createElement('input')
      i.type = type
      document.body.appendChild(i)
      expect(isSwipeBlockedTarget(i)).toBe(true)
    }
    const wrap = document.createElement('div')
    wrap.setAttribute('data-no-swipe', '')
    const inner = document.createElement('span')
    wrap.appendChild(inner)
    document.body.appendChild(wrap)
    expect(isSwipeBlockedTarget(inner)).toBe(true)
  })
  it('горизонтально прокручиваемый предок блокирует, а переполненный без прокрутки (overflow: visible/hidden) — нет', () => {
    const sc = scrollable('auto')
    const child = document.createElement('i')
    sc.appendChild(child)
    expect(isSwipeBlockedTarget(child)).toBe(true)
    expect(isSwipeBlockedTarget(scrollable('scroll'))).toBe(true)
    expect(isSwipeBlockedTarget(scrollable('hidden'))).toBe(false)
    expect(isSwipeBlockedTarget(scrollable('visible'))).toBe(false)
  })
})

describe('свайп с середины экрана (BACKLOG 07:52)', () => {
  it('зоны: у края — edge, правая половина — wide, левая половина — не наш', () => {
    expect(swipeZone({ x: 390, y: 0 }, W)).toBe('edge')
    expect(swipeZone({ x: 200, y: 0 }, W)).toBe('wide') // ровно середина
    expect(swipeZone({ x: 250, y: 0 }, W)).toBe('wide')
    expect(swipeZone({ x: 199, y: 0 }, W)).toBeNull()
  })

  it('в «широкой» зоне жест строже: путь ≥ 84 px и почти строго горизонтально (наклон ≤ 0.4)', () => {
    expect(isWideLeftSwipe({ x: 300, y: 300 }, { x: 200, y: 320 })).toBe(true)
    expect(isWideLeftSwipe({ x: 300, y: 300 }, { x: 230, y: 300 })).toBe(false) // 70 px — мало
    expect(isWideLeftSwipe({ x: 300, y: 300 }, { x: 200, y: 345 })).toBe(false) // наклон 0.45
    expect(isWideLeftSwipe({ x: 300, y: 300 }, { x: 400, y: 300 })).toBe(false) // вправо
  })

  it('isOpenSwipeFrom выбирает пороги по зоне: тот же жест в 60 px у края открывает, а с середины — нет', () => {
    const start = { x: 390, y: 300 }
    expect(isOpenSwipeFrom('edge', start, { x: 330, y: 300 })).toBe(true)
    expect(isOpenSwipeFrom('wide', { x: 300, y: 300 }, { x: 240, y: 300 })).toBe(false)
    expect(isOpenSwipeFrom('wide', { x: 300, y: 300 }, { x: 200, y: 300 })).toBe(true)
    expect(isOpenSwipeFrom(null, start, { x: 0, y: 300 })).toBe(false)
  })

  it('isOpenSwipe для старта с середины экрана', () => {
    expect(isOpenSwipe({ x: 250, y: 300 }, { x: 140, y: 310 }, W)).toBe(true)
    expect(isOpenSwipe({ x: 250, y: 300 }, { x: 200, y: 300 }, W)).toBe(false)
  })

  it('canvas (график) жест блокирует', () => {
    const c = document.createElement('canvas')
    document.body.appendChild(c)
    expect(isSwipeBlockedTarget(c)).toBe(true)
  })
})
