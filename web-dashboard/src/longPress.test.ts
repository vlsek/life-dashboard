import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLongPress, isLongPressIgnored, longPressBind } from './lib/longPress'

// Долгое нажатие (BACKLOG 75.9)
const ptr = (o: Partial<PointerEvent> & { target?: EventTarget | null } = {}) => ({ button: 0, clientX: 10, clientY: 10, target: document.body, ...o }) as unknown as PointerEvent
const ev = (target: EventTarget | null = document.body) => ({ target, preventDefault: vi.fn(), stopPropagation: vi.fn() }) as unknown as Event & { preventDefault: ReturnType<typeof vi.fn>; stopPropagation: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

describe('createLongPress', () => {
  it('срабатывает после удержания 500 мс, раньше — нет', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    lp.pointerdown(ptr())
    vi.advanceTimersByTime(499)
    expect(onTrigger).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2)
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('отпустили раньше — не срабатывает', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    lp.pointerdown(ptr())
    vi.advanceTimersByTime(300)
    lp.pointerup()
    vi.advanceTimersByTime(1000)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('сдвиг больше допуска (скролл) и pointercancel отменяют удержание; малый дрейф — нет', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    lp.pointerdown(ptr())
    lp.pointermove(ptr({ clientX: 14, clientY: 12 })) // дрейф пальца
    vi.advanceTimersByTime(600)
    expect(onTrigger).toHaveBeenCalledTimes(1)
    lp.pointerup()
    lp.pointerdown(ptr())
    lp.pointermove(ptr({ clientY: 40 })) // ушёл скроллить
    vi.advanceTimersByTime(600)
    expect(onTrigger).toHaveBeenCalledTimes(1)
    lp.pointerdown(ptr())
    lp.pointercancel()
    vi.advanceTimersByTime(600)
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('после удержания следующий click глотается один раз, обычный клик позже — проходит', () => {
    const lp = createLongPress({ onTrigger: vi.fn(), vibrate: false })
    lp.pointerdown(ptr())
    vi.advanceTimersByTime(600)
    lp.pointerup()
    const c1 = ev()
    lp.clickCapture(c1)
    expect(c1.preventDefault).toHaveBeenCalled()
    expect(c1.stopPropagation).toHaveBeenCalled()
    const c2 = ev()
    lp.clickCapture(c2)
    expect(c2.preventDefault).not.toHaveBeenCalled()
  })

  it('без удержания click не трогаем; запоздавший click (>350 мс) тоже', () => {
    const lp = createLongPress({ onTrigger: vi.fn(), vibrate: false })
    const c = ev()
    lp.clickCapture(c)
    expect(c.preventDefault).not.toHaveBeenCalled()
    lp.pointerdown(ptr())
    vi.advanceTimersByTime(600)
    lp.pointerup()
    vi.advanceTimersByTime(400)
    const late = ev()
    lp.clickCapture(late)
    expect(late.preventDefault).not.toHaveBeenCalled()
  })

  it('не включается на полях ввода, кнопках и ссылках, но работает на чекбоксе и подписи', () => {
    document.body.innerHTML = '<input type="text" id="t"><button id="b"></button><a href="#" id="a"></a><label id="l"><input type="checkbox" id="c"></label><textarea id="x"></textarea>'
    const get = (id: string) => document.getElementById(id)!
    for (const id of ['t', 'b', 'a', 'x']) expect(isLongPressIgnored(get(id))).toBe(true)
    for (const id of ['l', 'c']) expect(isLongPressIgnored(get(id))).toBe(false)
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    lp.pointerdown(ptr({ target: get('t') }))
    vi.advanceTimersByTime(600)
    expect(onTrigger).not.toHaveBeenCalled()
    lp.pointerdown(ptr({ target: get('c') }))
    vi.advanceTimersByTime(600)
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('правая кнопка мыши удержание не запускает; contextmenu открывает сразу и гасит родное меню', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    lp.pointerdown(ptr({ button: 2 }))
    vi.advanceTimersByTime(600)
    expect(onTrigger).not.toHaveBeenCalled()
    const e = ev()
    lp.contextmenu(e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('Android: долгое касание шлёт ещё и contextmenu — второй раз не открываем', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    lp.pointerdown(ptr())
    vi.advanceTimersByTime(520)
    const e = ev()
    lp.contextmenu(e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('в поле ввода contextmenu оставляет родное меню', () => {
    document.body.innerHTML = '<input type="text" id="t">'
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    const e = ev(document.getElementById('t'))
    lp.contextmenu(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('клавиатура: Shift+F10 и клавиша «меню» открывают, другие клавиши — нет', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress({ onTrigger, vibrate: false })
    const k = (key: string, shiftKey = false) => ({ key, shiftKey, target: document.body, preventDefault: vi.fn() }) as unknown as KeyboardEvent
    lp.keydown(k('F10', true))
    lp.keydown(k('ContextMenu'))
    lp.keydown(k('F10'))
    lp.keydown(k('Enter'))
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })

  it('вибро-отклик при срабатывании (можно выключить)', () => {
    const vib = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vib, configurable: true })
    const lp = createLongPress({ onTrigger: vi.fn() })
    lp.pointerdown(ptr())
    vi.advanceTimersByTime(600)
    expect(vib).toHaveBeenCalledWith(10)
    vib.mockClear()
    const quiet = createLongPress({ onTrigger: vi.fn(), vibrate: false })
    quiet.pointerdown(ptr())
    vi.advanceTimersByTime(600)
    expect(vib).not.toHaveBeenCalled()
  })

  it('longPressBind отдаёт все обработчики для v-bind', () => {
    const b = longPressBind(createLongPress({ onTrigger: vi.fn() }))
    expect(Object.keys(b).sort()).toEqual(['onClickCapture', 'onContextmenu', 'onKeydown', 'onPointercancel', 'onPointerdown', 'onPointermove', 'onPointerup'])
  })
})
