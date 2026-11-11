import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Быстрый пункт в план на сегодня из шапки (BACKLOG 79.6, срез 1): палитра и клавиша «n»
const db = vi.hoisted(() => ({ row: null as any, writes: [] as any[], readError: false, writeError: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const c: any = {
        select: () => c,
        eq: () => c,
        maybeSingle: () => Promise.resolve(db.readError ? { data: null, error: { message: 'boom' } } : { data: table === 'daily_notes' ? db.row : null, error: null }),
        upsert: (row: any) => {
          if (db.writeError) return Promise.resolve({ error: { message: 'boom' } })
          db.writes.push(row)
          db.row = { planned_goals: row.planned_goals }
          return Promise.resolve({ error: null })
        },
      }
      return c
    },
  },
}))
import { PLAN_ADD, addPlanItemToday, cleanPlanText, cleanPlanTime, type PlanAddDetail } from './lib/planQuickAdd'
import QuickPlanModal from './components/QuickPlanModal.vue'
import { PALETTE_ITEMS, filterPalette } from './lib/palette'
import { createHotkeyHandler, quickPlanOpen } from './lib/hotkeys'
import { DATA_CHANGED } from './lib/events'

const TODAY = '2026-11-06'
const deps = (over: Record<string, unknown> = {}) => ({ today: () => TODAY, online: () => true, dispatch: () => undefined, ...over })

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  db.row = null
  db.writes = []
  db.readError = false
  db.writeError = false
  quickPlanOpen.value = false
  document.body.innerHTML = ''
})
afterEach(() => vi.useRealTimers())

describe('cleanPlanText / cleanPlanTime', () => {
  it('текст: без лишних пробелов, 1–120 символов', () => {
    expect(cleanPlanText('  Купить   хлеб ')).toBe('Купить хлеб')
    expect(cleanPlanText('   ')).toBeNull()
    expect(cleanPlanText('я'.repeat(121))).toBeNull()
    expect(cleanPlanText('я'.repeat(120))).toHaveLength(120)
  })
  it('время: пусто — без времени, «ЧЧ:ММ» — время, остальное — ошибка', () => {
    expect(cleanPlanTime('')).toBeNull()
    expect(cleanPlanTime(' 09:30 ')).toBe('09:30')
    expect(cleanPlanTime('9:30')).toBeUndefined()
    expect(cleanPlanTime('25:00')).toBeUndefined()
    expect(cleanPlanTime('abc')).toBeUndefined()
  })
})

describe('addPlanItemToday: через блок «Планы» на странице', () => {
  it('блок принял событие (handled) — шапка сама ничего не пишет', async () => {
    const seen: PlanAddDetail[] = []
    const r = await addPlanItemToday('u1', 'Позвонить', '10:00', deps({ dispatch: (d: PlanAddDetail) => { seen.push({ ...d }); d.handled = true } }))
    expect(r).toEqual({ ok: true, via: 'page', duplicate: false })
    expect(seen).toEqual([{ date: TODAY, text: 'Позвонить', time: '10:00', handled: false }])
    expect(db.writes).toHaveLength(0)
  })
  it('событие уходит под тем же именем, что у web-dashboard, и на сегодняшнюю дату', async () => {
    const got: PlanAddDetail[] = []
    const on = (e: Event) => got.push((e as CustomEvent<PlanAddDetail>).detail)
    window.addEventListener(PLAN_ADD, on)
    await addPlanItemToday('u1', 'Хлеб', '', { today: () => TODAY, online: () => true, client: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }), upsert: () => Promise.resolve({ error: null }) }) } })
    window.removeEventListener(PLAN_ADD, on)
    expect(PLAN_ADD).toBe('dashboard:plan-add')
    expect(got[0]).toMatchObject({ date: TODAY, text: 'Хлеб', time: null })
  })
})

describe('addPlanItemToday: шапка пишет сама (блока «Планы» на странице нет)', () => {
  it('читает свежий план дня и дописывает в конец; остальные пункты (цели, выполненные) не трогает', async () => {
    db.row = { planned_goals: [{ type: 'goal', text: 'Цель' }, { type: 'custom', text: 'Готово', done: true }] }
    const r = await addPlanItemToday('u1', '  Позвонить ', '09:30', deps())
    expect(r).toEqual({ ok: true, via: 'direct', duplicate: false })
    expect(db.writes).toEqual([{ user_id: 'u1', date: TODAY, planned_goals: [{ type: 'goal', text: 'Цель' }, { type: 'custom', text: 'Готово', done: true }, { type: 'custom', text: 'Позвонить', time: '09:30' }] }])
  })
  it('на пустой день создаёт план; без времени поля time нет', async () => {
    await addPlanItemToday('u1', 'Хлеб', '', deps())
    expect(db.writes[0].planned_goals).toEqual([{ type: 'custom', text: 'Хлеб' }])
  })
  it('такой же невыполненный пункт (текст и время) уже есть — не дублируем, пишем ничего; выполненный дублем не считается', async () => {
    db.row = { planned_goals: [{ type: 'custom', text: 'Хлеб', time: '10:00' }, { type: 'custom', text: 'Молоко', done: true }] }
    expect(await addPlanItemToday('u1', 'Хлеб', '10:00', deps())).toEqual({ ok: true, via: 'direct', duplicate: true })
    expect(db.writes).toHaveLength(0)
    expect(await addPlanItemToday('u1', 'Хлеб', '11:00', deps())).toMatchObject({ ok: true, duplicate: false }) // другое время — другой пункт
    expect(await addPlanItemToday('u1', 'Молоко', '', deps())).toMatchObject({ ok: true, duplicate: false })
  })
  it('успешная запись сообщает об изменении данных (кольца и серии пересчитаются)', async () => {
    const seen: unknown[] = []
    const on = (e: Event) => seen.push((e as CustomEvent).detail)
    window.addEventListener(DATA_CHANGED, on)
    await addPlanItemToday('u1', 'Хлеб', '', deps())
    window.removeEventListener(DATA_CHANGED, on)
    expect(seen).toEqual([{ source: 'plan', date: TODAY }])
  })
  it('нет сети — не пытаемся (офлайн-воспроизведение «целого списка» могло бы затереть новее), ничего не пишем', async () => {
    const r = await addPlanItemToday('u1', 'Хлеб', '', deps({ online: () => false }))
    expect(r).toEqual({ ok: false, reason: 'offline' })
    expect(db.writes).toHaveLength(0)
  })
  it('ошибка чтения, записи или исключение клиента — «other», без исключения', async () => {
    db.readError = true
    expect(await addPlanItemToday('u1', 'Хлеб', '', deps())).toEqual({ ok: false, reason: 'other' })
    db.readError = false
    db.writeError = true
    expect(await addPlanItemToday('u1', 'Хлеб', '', deps())).toEqual({ ok: false, reason: 'other' })
    expect(await addPlanItemToday('u1', 'Хлеб', '', deps({ client: { from: () => { throw new TypeError('x') } } }))).toEqual({ ok: false, reason: 'other' })
  })
  it('плохой текст или время — без запросов и без события', async () => {
    const dispatch = vi.fn()
    expect(await addPlanItemToday('u1', '   ', '', deps({ dispatch }))).toEqual({ ok: false, reason: 'text' })
    expect(await addPlanItemToday('u1', 'Хлеб', '25:99', deps({ dispatch }))).toEqual({ ok: false, reason: 'time' })
    expect(dispatch).not.toHaveBeenCalled()
    expect(db.writes).toHaveLength(0)
  })
})

describe('QuickPlanModal', () => {
  const mk = () => mount(QuickPlanModal, { props: { userId: 'u1' }, attachTo: document.body })

  it('Enter добавляет пункт, показывает «Добавлено в план» и закрывается сам', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = mk()
    await w.get('[data-test="qp-text"]').setValue('Позвонить')
    await w.get('[data-test="qp-time"]').setValue('09:30')
    await w.get('[data-test="qp-text"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(db.writes[0].planned_goals).toEqual([{ type: 'custom', text: 'Позвонить', time: '09:30' }])
    expect(w.get('[data-test="qp-done"]').text()).toBe('Добавлено в план')
    expect(w.emitted('close')).toBeUndefined()
    vi.advanceTimersByTime(950)
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })
  it('пустой текст — подсказка, окно открыто, запись не идёт (плохое время через поле type=time получить нельзя: оно само отбрасывает невалидное; ветка проверена на функции)', async () => {
    const w = mk()
    await w.get('[data-test="qp-add"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-test="qp-problem"]').text()).toContain('Введи текст')
    expect(db.writes).toHaveLength(0)
    expect(w.emitted('close')).toBeUndefined()
    w.unmount()
  })
  it('нет сети — окно остаётся, введённый текст сохраняется, сообщение честное', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const w = mk()
    await w.get('[data-test="qp-text"]').setValue('Хлеб')
    await w.get('[data-test="qp-add"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-test="qp-problem"]').text()).toContain('Нет сети')
    expect((w.get('[data-test="qp-text"]').element as HTMLInputElement).value).toBe('Хлеб')
    expect(w.emitted('close')).toBeUndefined()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    w.unmount()
  })
  it('Esc, «Отмена» и фон закрывают без записи; фокус сразу в поле текста', async () => {
    const w = mk()
    await flushPromises()
    expect(document.activeElement).toBe(w.get('[data-test="qp-text"]').element)
    await w.get('[data-test="qp-cancel"]').trigger('click')
    await w.get('[data-test="quick-plan-modal"]').trigger('keydown', { key: 'Escape' })
    await w.get('.gh-backdrop').trigger('click')
    expect(w.emitted('close')).toHaveLength(3)
    expect(db.writes).toHaveLength(0)
    w.unmount()
  })
})

describe('палитра и клавиша «n»', () => {
  it('в палитре есть действие «План: добавить пункт на сегодня» (по-русски и по-английски, с подсказкой n)', () => {
    const it = PALETTE_ITEMS.find((x) => x.id === 'action:plan')!
    expect(it).toBeTruthy()
    expect(it.hint).toBe('n')
    expect(filterPalette(PALETTE_ITEMS, 'пункт').map((x) => x.id)).toContain('action:plan')
    expect(filterPalette(PALETTE_ITEMS, 'plan add').map((x) => x.id)).toContain('action:plan')
  })
  const key = (k: string, init: KeyboardEventInit = {}, target?: Element) => {
    const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })
    if (target) Object.defineProperty(ev, 'target', { value: target })
    return ev
  }
  const mkKeys = (over: { enabled?: () => boolean } = {}) => createHotkeyHandler({ navigate: vi.fn(), now: () => 1000, ...over })

  it('«n» открывает окно и гасит родное действие клавиши', () => {
    const e = key('n')
    mkKeys()(e)
    expect(quickPlanOpen.value).toBe(true)
    expect(e.defaultPrevented).toBe(true)
  })
  it('не срабатывает в поле ввода, с Ctrl/Cmd/Alt/Shift, при открытом диалоге и когда клавиши выключены', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    mkKeys()(key('n', {}, input))
    mkKeys()(key('n', { ctrlKey: true }))
    mkKeys()(key('n', { metaKey: true }))
    mkKeys()(key('n', { altKey: true }))
    mkKeys()(key('N', { shiftKey: true }))
    mkKeys({ enabled: () => false })(key('n'))
    expect(quickPlanOpen.value).toBe(false)
    const dlg = document.createElement('div')
    dlg.setAttribute('role', 'dialog')
    document.body.appendChild(dlg)
    mkKeys()(key('n'))
    expect(quickPlanOpen.value).toBe(false)
  })
  it('после «g» буква «n» — не страница: окно не открывается и переход не идёт', () => {
    const nav = vi.fn()
    const h = createHotkeyHandler({ navigate: nav, now: () => 1000 })
    h(key('g'))
    h(key('n'))
    expect(quickPlanOpen.value).toBe(false)
    expect(nav).not.toHaveBeenCalled()
  })
})
