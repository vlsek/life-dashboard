import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { addToNextDay, canPostpone, entryForNextDay } from './lib/planPostpone'
import { useRowSwipe } from './lib/useRowSwipe'
import { addDaysIso, todayStr } from './lib/date'

// Свайп по строке плана и «отложить на завтра» (BACKLOG 75.9, срез 2)
const h = vi.hoisted(() => ({ store: {} as Record<string, any[]>, writes: [] as { date: string; list: any[] }[], failWriteFor: null as string | null, failReadFor: null as string | null }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let date = ''
      const chain: any = {
        select: () => chain,
        eq: (col: string, v: string) => ((col === 'date' && (date = v)), chain),
        gte: () => chain,
        lt: () => chain,
        order: () => chain,
        maybeSingle: () =>
          Promise.resolve(
            table === 'daily_notes'
              ? h.failReadFor === date
                ? { data: null, error: { message: 'read boom' } }
                : { data: h.store[date] ? { planned_goals: h.store[date] } : null, error: null }
              : { data: null, error: null },
          ),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (row: { date: string; planned_goals: any[] }) => {
          if (h.failWriteFor === row.date) return Promise.resolve({ error: { message: 'write boom' } })
          h.writes.push({ date: row.date, list: row.planned_goals })
          h.store[row.date] = row.planned_goals
          return Promise.resolve({ error: null })
        },
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import PlannedSection from './components/PlannedSection.vue'

const TODAY = todayStr()
const TOMORROW = addDaysIso(TODAY, 1)

describe('planPostpone: правила', () => {
  it('откладывать можно только свои невыполненные пункты без повтора', () => {
    expect(canPostpone({ type: 'custom', text: 'Дело' })).toBe(true)
    expect(canPostpone({ text: 'Без типа' })).toBe(true)
    expect(canPostpone({ type: 'goal', text: 'Цель' })).toBe(false)
    expect(canPostpone({ type: 'custom', text: 'Готово', done: true })).toBe(false)
    expect(canPostpone({ type: 'custom', text: 'Повтор', repeat: 'r1' })).toBe(false)
    expect(canPostpone({ type: 'custom', text: '   ' })).toBe(false)
    expect(canPostpone(undefined)).toBe(false)
  })
  it('в завтрашний план пункт уходит чистым: время напоминания и бонус остаются, отметка о выполнении — нет', () => {
    expect(entryForNextDay({ type: 'custom', text: 'Врач', time: '18:30', bonus: true, doneAt: '10:00' })).toEqual({ type: 'custom', text: 'Врач', time: '18:30', bonus: true })
    expect(entryForNextDay({ text: 'Хлеб' })).toEqual({ type: 'custom', text: 'Хлеб' })
  })
  it('такой же пункт завтра уже есть — второй раз не добавляем; выполненный завтрашний дублем не считается', () => {
    const it = { type: 'custom', text: 'Врач', time: '18:30' }
    expect(addToNextDay([{ type: 'custom', text: 'Врач', time: '18:30' }], it).duplicate).toBe(true)
    expect(addToNextDay([{ type: 'custom', text: 'Врач', time: '09:00' }], it).duplicate).toBe(false) // другое время — другой пункт
    expect(addToNextDay([{ type: 'custom', text: 'Врач', time: '18:30', done: true }], it).duplicate).toBe(false)
    const r = addToNextDay([{ type: 'goal', text: 'Цель' }], it)
    expect(r.list).toEqual([{ type: 'goal', text: 'Цель' }, { type: 'custom', text: 'Врач', time: '18:30' }])
  })
})

describe('useRowSwipe: жест', () => {
  const ptr = (x: number, y: number, o: Record<string, unknown> = {}) => ({ button: 0, clientX: x, clientY: y, pointerId: 1, target: document.body, currentTarget: document.body, ...o }) as unknown as PointerEvent
  function make(over: Partial<Parameters<typeof useRowSwipe>[0]> = {}) {
    const calls = { right: [] as number[], left: [] as number[] }
    const sw = useRowSwipe({ canRight: () => true, canLeft: () => true, onRight: (i) => calls.right.push(i), onLeft: (i) => calls.left.push(i), vibrate: false, ...over })
    return { sw, calls, b: sw.bind(3) }
  }

  it('вправо дальше порога — «выполнить», влево — «отложить», с индексом строки', () => {
    const { b, calls } = make()
    b.onPointerdown(ptr(100, 50)); b.onPointermove(ptr(140, 52)); b.onPointermove(ptr(200, 52)); b.onPointerup()
    b.onPointerdown(ptr(200, 50)); b.onPointermove(ptr(120, 51)); b.onPointerup()
    expect(calls.right).toEqual([3])
    expect(calls.left).toEqual([3])
  })

  it('короткий свайп (меньше порога) возвращает строку и ничего не делает', () => {
    const { b, calls, sw } = make()
    b.onPointerdown(ptr(100, 50)); b.onPointermove(ptr(150, 50))
    expect(sw.styleFor(3)).toEqual({ transform: 'translateX(50px)', transition: 'none' })
    b.onPointerup()
    expect(calls.right).toHaveLength(0)
    expect(sw.styleFor(3)).toEqual({})
  })

  it('вертикальное движение — это скролл: жест не берётся', () => {
    const { b, calls, sw } = make()
    b.onPointerdown(ptr(100, 50)); b.onPointermove(ptr(108, 90)); b.onPointermove(ptr(200, 95)); b.onPointerup()
    expect(calls.right).toHaveLength(0)
    expect(sw.active.value).toBeNull()
  })

  it('недоступное направление не тянется и не срабатывает', () => {
    const { b, calls, sw } = make({ canLeft: () => false })
    b.onPointerdown(ptr(200, 50)); b.onPointermove(ptr(100, 51))
    expect(sw.styleFor(3)).toEqual({})
    b.onPointerup()
    expect(calls.left).toHaveLength(0)
  })

  it('подсказка направления появляется, когда порог достигнут', () => {
    const { b, sw } = make()
    b.onPointerdown(ptr(100, 50)); b.onPointermove(ptr(160, 50))
    expect(sw.hintFor(3)).toBeNull()
    b.onPointermove(ptr(190, 50))
    expect(sw.hintFor(3)).toBe('right')
  })

  it('на кнопках и полях ввода жест не начинается; pointercancel отменяет', () => {
    document.body.innerHTML = '<button id="b"></button><input type="time" id="t"><input type="checkbox" id="c">'
    const { b, calls, sw } = make()
    for (const id of ['b', 't']) {
      b.onPointerdown(ptr(100, 50, { target: document.getElementById(id) })); b.onPointermove(ptr(250, 50)); b.onPointerup()
    }
    expect(calls.right).toHaveLength(0)
    b.onPointerdown(ptr(100, 50, { target: document.getElementById('c') })); b.onPointermove(ptr(250, 50))
    expect(sw.active.value).not.toBeNull() // на чекбоксе жест можно начать
    b.onPointercancel()
    expect(sw.active.value).toBeNull()
    expect(calls.right).toHaveLength(0)
  })

  it('после сработавшего свайпа ближайший click глотается один раз', () => {
    const { b } = make()
    b.onPointerdown(ptr(100, 50)); b.onPointermove(ptr(250, 50)); b.onPointerup()
    const c1 = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as Event
    b.onClickCapture(c1)
    expect(c1.preventDefault).toHaveBeenCalled()
    const c2 = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as Event
    b.onClickCapture(c2)
    expect(c2.preventDefault).not.toHaveBeenCalled()
  })
})

describe('PlannedSection: свайп и «на завтра»', () => {
  let w: VueWrapper | null = null
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
    h.writes = []
    h.failWriteFor = null
    h.failReadFor = null
    h.store = {
      [TODAY]: [
        { type: 'custom', text: 'Врач', time: '18:30' },
        { type: 'goal', text: 'Цель' },
        { type: 'custom', text: 'Хлеб', done: true },
        { type: 'custom', text: 'Позвонить' },
        { type: 'custom', text: 'Зарядка', repeat: 'r1' },
      ],
    }
  })
  afterEach(() => {
    w?.unmount()
    w = null
    document.body.innerHTML = ''
  })
  async function mountSection() {
    w = mount(PlannedSection, { props: { userId: 'u1', date: TODAY }, attachTo: document.body })
    await flushPromises()
  }
  const rows = () => w!.findAll('[data-test="item"]')
  async function swipe(i: number, dx: number) {
    const tr = rows()[i]
    await tr.trigger('pointerdown', { button: 0, clientX: 200, clientY: 40, pointerId: 1 })
    await tr.trigger('pointermove', { clientX: 200 + dx / 2, clientY: 42, pointerId: 1 })
    await tr.trigger('pointermove', { clientX: 200 + dx, clientY: 42, pointerId: 1 })
    await tr.trigger('pointerup', { pointerId: 1 })
    await flushPromises()
  }

  it('кнопка «на завтра» есть только у своих невыполненных пунктов без повтора', async () => {
    await mountSection()
    const flags = rows().map((r) => r.find('[data-test="postpone"]').exists())
    expect(flags).toEqual([true, false, false, true, false]) // Врач, цель, Хлеб(готово), Позвонить, Зарядка(повтор)
  })

  it('кнопка переносит пункт в план завтра (с временем) и снимает с сегодняшнего', async () => {
    await mountSection()
    await rows()[0].get('[data-test="postpone"]').trigger('click')
    await flushPromises()
    expect(h.store[TOMORROW]).toEqual([{ type: 'custom', text: 'Врач', time: '18:30' }])
    expect(h.store[TODAY].map((x) => x.text)).toEqual(['Цель', 'Хлеб', 'Позвонить', 'Зарядка'])
    expect(w!.get('[data-test="notice"]').text()).toBe('Перенесено на завтра')
    // порядок записей: сначала завтра, потом сегодня
    expect(h.writes.map((x) => x.date)).toEqual([TOMORROW, TODAY])
  })

  it('свайп влево — то же самое, что кнопка', async () => {
    await mountSection()
    await swipe(3, -120)
    expect(h.store[TOMORROW]).toEqual([{ type: 'custom', text: 'Позвонить' }])
    expect(h.store[TODAY].map((x) => x.text)).not.toContain('Позвонить')
  })

  it('свайп вправо — выполнить пункт (с отметкой), остальные не тронуты', async () => {
    await mountSection()
    await swipe(3, 120)
    const saved = h.store[TODAY]
    expect(saved.find((x) => x.text === 'Позвонить')).toMatchObject({ done: true })
    expect(saved.find((x) => x.text === 'Врач').done).toBeUndefined()
    expect(h.store[TOMORROW]).toBeUndefined()
  })

  it('цель и выполненный пункт свайпом не двигаются; повторяющийся — можно выполнить, но не перенести', async () => {
    await mountSection()
    for (const i of [1, 2]) {
      await swipe(i, -120)
      await swipe(i, 120)
    }
    await swipe(4, -120) // «Зарядка» из повтора: переносить нельзя — завтра появится сама
    expect(h.writes).toHaveLength(0)
    await swipe(4, 120) // а выполнить можно
    expect(h.store[TODAY].find((x) => x.text === 'Зарядка')).toMatchObject({ done: true })
    expect(h.store[TOMORROW]).toBeUndefined()
  })

  it('короткий свайп и вертикальный скролл ничего не пишут', async () => {
    await mountSection()
    await swipe(0, 40)
    const tr = rows()[0]
    await tr.trigger('pointerdown', { button: 0, clientX: 200, clientY: 40 })
    await tr.trigger('pointermove', { clientX: 205, clientY: 100 })
    await tr.trigger('pointermove', { clientX: 400, clientY: 110 })
    await tr.trigger('pointerup')
    await flushPromises()
    expect(h.writes).toHaveLength(0)
  })

  it('такой же пункт завтра уже есть — не дублируем, но с сегодняшнего снимаем', async () => {
    h.store[TOMORROW] = [{ type: 'custom', text: 'Врач', time: '18:30' }]
    await mountSection()
    await rows()[0].get('[data-test="postpone"]').trigger('click')
    await flushPromises()
    expect(h.store[TOMORROW]).toHaveLength(1)
    expect(h.store[TODAY].map((x) => x.text)).not.toContain('Врач')
  })

  it('к плану завтра дописывается в конец, чужие пункты завтра не теряются', async () => {
    h.store[TOMORROW] = [{ type: 'goal', text: 'Цель завтра' }, { type: 'custom', text: 'Своё', done: true }]
    await mountSection()
    await rows()[3].get('[data-test="postpone"]').trigger('click')
    await flushPromises()
    expect(h.store[TOMORROW]).toEqual([{ type: 'goal', text: 'Цель завтра' }, { type: 'custom', text: 'Своё', done: true }, { type: 'custom', text: 'Позвонить' }])
  })

  it('не удалось записать завтра — пункт остаётся сегодня, видна ошибка, ничего не потеряно', async () => {
    h.failWriteFor = TOMORROW
    await mountSection()
    await rows()[0].get('[data-test="postpone"]').trigger('click')
    await flushPromises()
    expect(h.store[TODAY].map((x) => x.text)).toContain('Врач')
    expect(h.store[TOMORROW]).toBeUndefined()
    expect(w!.find('[data-test="notice"]').exists()).toBe(false)
    expect(w!.text()).toContain('Врач')
  })

  it('не удалось прочитать план завтра — пункт остаётся сегодня', async () => {
    h.failReadFor = TOMORROW
    await mountSection()
    await rows()[0].get('[data-test="postpone"]').trigger('click')
    await flushPromises()
    expect(h.store[TODAY].map((x) => x.text)).toContain('Врач')
    expect(h.writes).toHaveLength(0)
  })
})
