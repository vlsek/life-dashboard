import { describe, expect, it, vi } from 'vitest'
import { CARD_H, CARD_STEP, cardMids, overlayTop, reorderVisible, useBlockDrag } from './blockDrag'
import type { LayoutItem } from './layout'

const L = (): LayoutItem[] => [
  { key: 'profile', visible: true },
  { key: 'charts', visible: true },
  { key: 'daily', visible: true },
]
const keys = (l: LayoutItem[]) => l.map((i) => i.key)

describe('overlayTop / cardMids', () => {
  it('карточка стартует под пальцем, пока список помещается в окно', () => {
    const top = overlayTop(400, 1, 3, 800)
    expect(top + 1 * CARD_STEP + CARD_H / 2).toBe(400)
  })
  it('у верхнего и нижнего края окна список прижимается и не уходит за экран', () => {
    expect(overlayTop(5, 0, 3, 800)).toBe(8)
    const total = 3 * CARD_STEP - 8
    expect(overlayTop(790, 2, 3, 800)).toBe(800 - 8 - total)
  })
  it('середины карточек идут с шагом карточка+зазор', () => {
    expect(cardMids(10, 3)).toEqual([10 + CARD_H / 2, 10 + CARD_STEP + CARD_H / 2, 10 + 2 * CARD_STEP + CARD_H / 2])
  })
})

describe('reorderVisible', () => {
  it('переставляет видимые блоки', () => {
    expect(keys(reorderVisible(L(), 0, 2))).toEqual(['charts', 'daily', 'profile'])
    expect(keys(reorderVisible(L(), 2, 0))).toEqual(['daily', 'profile', 'charts'])
  })
  it('скрытый блок остаётся на своём месте, переставляются только видимые', () => {
    const l: LayoutItem[] = [
      { key: 'profile', visible: true },
      { key: 'charts', visible: false },
      { key: 'daily', visible: true },
    ]
    const next = reorderVisible(l, 0, 1) // профиль ↔ ежедневные; charts (скрыт) на индексе 1
    expect(next).toEqual([
      { key: 'daily', visible: true },
      { key: 'charts', visible: false },
      { key: 'profile', visible: true },
    ])
  })
  it('исходный массив не меняется; выход за границы или тот же индекс — копия без изменений', () => {
    const l = L()
    reorderVisible(l, 0, 2)
    expect(keys(l)).toEqual(['profile', 'charts', 'daily'])
    expect(keys(reorderVisible(l, 1, 1))).toEqual(keys(l))
    expect(keys(reorderVisible(l, 0, 9))).toEqual(keys(l))
  })
})

// pointer-событие без DOM-кнопки: currentTarget подменяем минимальным стабом ручки
const ev = (y: number, extra: Record<string, unknown> = {}) =>
  ({ clientY: y, button: 0, pointerId: 1, currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() }, ...extra }) as unknown as PointerEvent

describe('useBlockDrag', () => {
  function setup(layout: LayoutItem[] = L()) {
    const commit = vi.fn()
    const g = useBlockDrag(() => layout, commit, () => 800)
    return { g, commit }
  }

  it('тянем верхний блок вниз на две карточки — он становится последним, commit получает новый порядок', () => {
    const { g, commit } = setup()
    g.onDown(ev(100), 'profile')
    expect(g.drag.value?.from).toBe(0)
    g.onMove(ev(100 + 2 * CARD_STEP + 1)) // середина соседней карточки «ещё не пройдена», нужно чуть дальше
    expect(g.drag.value?.to).toBe(2)
    g.onUp()
    expect(g.drag.value).toBeNull()
    expect(keys(commit.mock.calls[0][0])).toEqual(['charts', 'daily', 'profile'])
  })

  it('небольшой сдвиг (меньше половины карточки) — порядок не меняется и commit не вызывается', () => {
    const { g, commit } = setup()
    g.onDown(ev(300), 'charts')
    g.onMove(ev(300 + 10))
    g.onUp()
    expect(commit).not.toHaveBeenCalled()
  })

  it('тянем вверх', () => {
    const { g, commit } = setup()
    g.onDown(ev(400), 'daily')
    g.onMove(ev(400 - CARD_STEP - 5))
    g.onUp()
    expect(keys(commit.mock.calls[0][0])).toEqual(['profile', 'daily', 'charts'])
  })

  it('отмена жеста (pointercancel) ничего не меняет', () => {
    const { g, commit } = setup()
    g.onDown(ev(100), 'profile')
    g.onMove(ev(400))
    g.onCancel()
    expect(g.drag.value).toBeNull()
    expect(commit).not.toHaveBeenCalled()
  })

  it('скрытые блоки не участвуют: тянем между двумя видимыми, скрытый стоит на месте', () => {
    const layout: LayoutItem[] = [
      { key: 'profile', visible: true },
      { key: 'charts', visible: false },
      { key: 'daily', visible: true },
    ]
    const { g, commit } = setup(layout)
    g.onDown(ev(100), 'profile')
    g.onMove(ev(100 + CARD_STEP + 1))
    g.onUp()
    expect(commit.mock.calls[0][0]).toEqual([
      { key: 'daily', visible: true },
      { key: 'charts', visible: false },
      { key: 'profile', visible: true },
    ])
  })

  it('один видимый блок — жест не начинается; правая кнопка мыши — тоже', () => {
    const one = setup([{ key: 'profile', visible: true }, { key: 'charts', visible: false }, { key: 'daily', visible: false }])
    one.g.onDown(ev(100), 'profile')
    expect(one.g.drag.value).toBeNull()
    const { g } = setup()
    g.onDown(ev(100, { button: 2 }), 'profile')
    expect(g.drag.value).toBeNull()
  })

  it('стрелки на ручке двигают блок на одну позицию; на краю — ничего', () => {
    const { g, commit } = setup()
    const key = (k: string) => ({ key: k, preventDefault: vi.fn() }) as unknown as KeyboardEvent
    g.onKey(key('ArrowDown'), 'profile')
    expect(keys(commit.mock.calls[0][0])).toEqual(['charts', 'profile', 'daily'])
    g.onKey(key('ArrowUp'), 'profile') // profile первый — выше некуда
    expect(commit).toHaveBeenCalledTimes(1)
    g.onKey(key('Enter'), 'charts')
    expect(commit).toHaveBeenCalledTimes(1)
  })
})
