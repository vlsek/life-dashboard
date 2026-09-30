import { describe, expect, it } from 'vitest'
import { isCloseSwipe, isOpenSwipe } from './edgeSwipe'

const W = 400
describe('isOpenSwipe', () => {
  it('от правого края влево на 60+ px, почти горизонтально → открыть', () => {
    expect(isOpenSwipe({ x: 395, y: 300 }, { x: 300, y: 320 }, W)).toBe(true)
  })
  it('начало не у края → нет (это обычная прокрутка/другой жест)', () => {
    expect(isOpenSwipe({ x: 300, y: 300 }, { x: 150, y: 300 }, W)).toBe(false)
  })
  it('короткий свайп или вправо → нет', () => {
    expect(isOpenSwipe({ x: 395, y: 300 }, { x: 350, y: 300 }, W)).toBe(false)
    expect(isOpenSwipe({ x: 395, y: 300 }, { x: 399, y: 300 }, W)).toBe(false)
  })
  it('слишком вертикальный (прокрутка страницы) → нет', () => {
    expect(isOpenSwipe({ x: 395, y: 300 }, { x: 320, y: 420 }, W)).toBe(false)
  })
})

describe('isCloseSwipe', () => {
  it('вправо на 60+ px почти горизонтально → закрыть', () => {
    expect(isCloseSwipe({ x: 100, y: 300 }, { x: 200, y: 310 })).toBe(true)
  })
  it('влево, короткий или вертикальный → нет', () => {
    expect(isCloseSwipe({ x: 200, y: 300 }, { x: 100, y: 300 })).toBe(false)
    expect(isCloseSwipe({ x: 100, y: 300 }, { x: 130, y: 300 })).toBe(false)
    expect(isCloseSwipe({ x: 100, y: 300 }, { x: 170, y: 450 })).toBe(false)
  })
})
