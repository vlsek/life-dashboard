import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { addDaysIso, todayStr } from './lib/date'
import type { Metric } from './lib/types'

// Быстрые действия на плашке метрики (BACKLOG 75.9, срез 1)
const h = vi.hoisted(() => ({ state: null as any, updates: [] as any[], err: null as null | { message: string } }))
vi.mock('./lib/useDailyMetrics', () => ({ useDailyMetrics: () => h.state }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      // читающие запросы дочерних композаблов (рекорды и т.п.) получают пустой успешный ответ; запись update() — наша, с управляемой ошибкой
      const chain: any = new Proxy(() => undefined, {
        get: (_t, k) => {
          if (k === 'update') return (row: unknown) => (h.updates.push(row), { eq: () => Promise.resolve({ error: h.err }) })
          if (k === 'then') return (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res)
          if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: null, error: null })
          return () => chain
        },
      })
      return chain
    },
  },
}))
import { quickActions, skipMetricDay } from './lib/metricQuickActions'
import MetricQuickActions from './components/MetricQuickActions.vue'
import DailyMetricsSection from './components/DailyMetricsSection.vue'

const TODAY = todayStr()
const YEST = addDaysIso(TODAY, -1)
const met = (o: Partial<Metric> & Record<string, unknown> = {}): Metric =>
  ({ id: 'b1', user_id: 'u', name: 'Читать', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, skipped_days: [], ...o }) as Metric
const ctx = (o: Record<string, unknown> = {}) => ({ date: TODAY, today: TODAY, yesterday: YEST, value: undefined as never, ...o })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.updates = []
  h.err = null
})

describe('quickActions', () => {
  it('невыполненная метрика сегодня или вчера — можно пропустить день', () => {
    expect(quickActions(met(), ctx())).toEqual(['skip'])
    expect(quickActions(met(), ctx({ date: YEST }))).toEqual(['skip'])
  })
  it('выполненную пропускать незачем; день раньше вчера — база не пустит', () => {
    expect(quickActions(met(), ctx({ value: true }))).toEqual([])
    expect(quickActions(met(), ctx({ date: addDaysIso(TODAY, -3) }))).toEqual([])
  })
  it('колонки skipped_days нет (миграция 061 не применена) — пропуска нет', () => {
    const { skipped_days: _x, ...noCol } = met() as any
    expect(quickActions(noCol as Metric, ctx())).toEqual([])
  })
  it('день вне расписания и уже пропущенный день — пропуска нет', () => {
    const otherDay = (new Date(TODAY + 'T12:00:00').getDay() + 3) % 7
    expect(quickActions(met({ schedule: { type: 'days', days: [otherDay] } as never }), ctx())).toEqual([])
    expect(quickActions(met({ skipped_days: [TODAY] }), ctx())).toEqual([])
  })
  it('заметка — только у булевой с «спрашивать заметку», уже отмеченной', () => {
    expect(quickActions(met({ ask_note: true }), ctx({ value: true }))).toEqual(['note'])
    expect(quickActions(met({ ask_note: true }), ctx())).toEqual(['skip'])
    expect(quickActions(met({ ask_note: false }), ctx({ value: true }))).toEqual([])
  })
  it('значение — у числовой (не связанной с тренировками)', () => {
    expect(quickActions(met({ type: 'number', goal_value: 8 }), ctx({ value: 8 }))).toEqual(['value'])
    expect(quickActions(met({ type: 'number', goal_value: 8 }), ctx())).toEqual(['skip', 'value'])
    expect(quickActions(met({ type: 'number', source_exercise_id: 'e1' } as never), ctx({ value: 1 }))).toEqual([])
  })
})

describe('skipMetricDay', () => {
  it('пишет дату в skipped_days без повторов по возрастанию и сообщает об изменении данных', async () => {
    const seen: any[] = []
    const on = (e: Event) => seen.push((e as CustomEvent).detail)
    window.addEventListener('dashboard:data-changed', on)
    const err = await skipMetricDay({ id: 'b1', skipped_days: ['2026-10-01'] }, TODAY)
    window.removeEventListener('dashboard:data-changed', on)
    expect(err).toBeNull()
    expect(h.updates[0]).toEqual({ skipped_days: ['2026-10-01', TODAY].sort() })
    expect(seen).toEqual([{ source: 'skip', metricId: 'b1', date: TODAY }])
  })
  it('ошибка базы — понятный текст, событие не шлём', async () => {
    h.err = { message: 'boom' }
    const seen: unknown[] = []
    const on = (e: Event) => seen.push(e)
    window.addEventListener('dashboard:data-changed', on)
    const err = await skipMetricDay({ id: 'b1', skipped_days: [] }, TODAY)
    window.removeEventListener('dashboard:data-changed', on)
    expect(typeof err).toBe('string')
    expect(err).not.toBe('')
    expect(seen).toHaveLength(0)
  })
})

describe('MetricQuickActions.vue', () => {
  it('«Пропустить день» — в два шага: сначала подтверждение, и только «Пропустить» шлёт действие', async () => {
    const w = mount(MetricQuickActions, { props: { name: 'Читать', actions: ['skip'] } })
    await w.get('[data-test="qa-skip"]').trigger('click')
    expect(w.emitted('act')).toBeUndefined()
    expect(w.get('[data-test="qa-confirm"]').text()).toContain('Отменить это в приложении нельзя')
    await w.get('[data-test="qa-skip-no"]').trigger('click')
    expect(w.find('[data-test="qa-skip"]').exists()).toBe(true)
    await w.get('[data-test="qa-skip"]').trigger('click')
    await w.get('[data-test="qa-skip-yes"]').trigger('click')
    expect(w.emitted('act')).toEqual([['skip']])
  })
  it('показывает только доступные действия; «×» и Esc закрывают', async () => {
    const w = mount(MetricQuickActions, { props: { name: 'Вода', actions: ['value'] } })
    expect(w.find('[data-test="qa-skip"]').exists()).toBe(false)
    expect(w.find('[data-test="qa-note"]').exists()).toBe(false)
    await w.get('[data-test="qa-value"]').trigger('click')
    expect(w.emitted('act')).toEqual([['value']])
    await w.get('[data-test="qa-close"]').trigger('click')
    await w.get('[data-test="qa-strip"]').trigger('keydown', { key: 'Escape' })
    expect(w.emitted('close')).toHaveLength(2)
  })
  it('ошибка записи видна, пока идёт запись кнопки подтверждения заблокированы', async () => {
    const w = mount(MetricQuickActions, { props: { name: 'Читать', actions: ['skip'], error: 'Не удалось сохранить', busy: true } })
    await w.get('[data-test="qa-skip"]').trigger('click')
    expect(w.get('[data-test="qa-error"]').text()).toBe('Не удалось сохранить')
    expect((w.get('[data-test="qa-skip-yes"]').element as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('DailyMetricsSection: быстрые действия на плашке', () => {
  let w: VueWrapper | null = null
  function setup(opts: { booleans?: any[]; numbers?: any[]; pending?: Record<string, unknown> } = {}) {
    h.state = {
      booleans: ref(opts.booleans ?? []),
      numbers: ref(opts.numbers ?? []),
      multiselects: ref([]),
      pending: ref(opts.pending ?? {}),
      items: ref([]),
      score: ref({ points: 0, total: 0 }),
      error: ref(null),
      loaded: ref(true),
      saving: ref(false),
      flashed: ref({}),
      notes: ref({}),
      load: vi.fn(), setBoolean: vi.fn(), setNote: vi.fn(), setNumber: vi.fn(), addToNumber: vi.fn(), addLinkedReps: vi.fn(), fixTotal: vi.fn(), toggleOpt: vi.fn(), addItem: vi.fn(), removeItem: vi.fn(), saveDay: vi.fn(async () => true),
    }
    w = mount(DailyMetricsSection, { props: { userId: 'u1' }, attachTo: document.body, global: { stubs: { SetsSection: true, PlannedSection: true } } })
  }
  afterEach(() => {
    w?.unmount()
    w = null
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('у невыполненной булевой есть кнопка ⋯, у выполненной и без колонки skipped_days — нет', () => {
    const noCol = { ...met({ id: 'b3', name: 'Без колонки' }) } as any
    delete noCol.skipped_days
    setup({ booleans: [met({ id: 'b1' }), met({ id: 'b2', name: 'Сделано' }), noCol], pending: { b2: true } })
    const toggles = w!.findAll('[data-test="qa-toggle"]')
    expect(toggles).toHaveLength(1)
    expect(toggles[0].attributes('data-qa-toggle')).toBe('b1')
    expect(toggles[0].attributes('aria-label')).toContain('Читать')
    expect(toggles[0].attributes('aria-expanded')).toBe('false')
  })

  it('⋯ открывает полосу (одну за раз), повторное нажатие закрывает', async () => {
    setup({ booleans: [met({ id: 'b1' }), met({ id: 'b2', name: 'Растяжка' })] })
    const toggles = w!.findAll('[data-test="qa-toggle"]')
    await toggles[0].trigger('click')
    expect(w!.findAll('[data-test="qa-strip"]')).toHaveLength(1)
    await toggles[1].trigger('click')
    expect(w!.findAll('[data-test="qa-strip"]')).toHaveLength(1)
    expect(w!.get('[data-test="qa-strip"]').attributes('aria-label')).toContain('Растяжка')
    await w!.findAll('[data-test="qa-toggle"]')[1].trigger('click')
    expect(w!.find('[data-test="qa-strip"]').exists()).toBe(false)
  })

  it('удержание на плашке открывает ту же полосу, и отпускание не переключает чекбокс', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    setup({ booleans: [met({ id: 'b1' })] })
    const plate = w!.get('[data-test="metric-plate"]')
    await plate.trigger('pointerdown', { button: 0, clientX: 5, clientY: 5 })
    vi.advanceTimersByTime(550)
    await w!.vm.$nextTick()
    expect(w!.find('[data-test="qa-strip"]').exists()).toBe(true)
    await plate.trigger('pointerup')
    const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true })
    w!.get('input[type="checkbox"]').element.dispatchEvent(clickEvt)
    expect(h.state.setBoolean).not.toHaveBeenCalled() // click после удержания проглочен
  })

  it('правый клик и Shift+F10 на плашке тоже открывают полосу', async () => {
    setup({ booleans: [met({ id: 'b1' })] })
    await w!.get('[data-test="metric-plate"]').trigger('contextmenu')
    expect(w!.find('[data-test="qa-strip"]').exists()).toBe(true)
    await w!.get('[data-test="qa-close"]').trigger('click')
    expect(w!.find('[data-test="qa-strip"]').exists()).toBe(false)
    await w!.get('[data-test="metric-plate"]').trigger('keydown', { key: 'F10', shiftKey: true })
    expect(w!.find('[data-test="qa-strip"]').exists()).toBe(true)
  })

  it('пропуск дня: два шага, запись в metrics.skipped_days, перечитывание списка метрик, полоса закрывается', async () => {
    setup({ booleans: [met({ id: 'b1' })] })
    await w!.get('[data-test="qa-toggle"]').trigger('click')
    await w!.get('[data-test="qa-skip"]').trigger('click')
    expect(h.updates).toHaveLength(0) // подтверждение ещё не дано
    h.state.load.mockClear()
    await w!.get('[data-test="qa-skip-yes"]').trigger('click')
    await flushPromises()
    expect(h.updates).toEqual([{ skipped_days: [TODAY] }])
    expect(h.state.load).toHaveBeenCalledWith('u1', TODAY)
    expect(w!.find('[data-test="qa-strip"]').exists()).toBe(false)
  })

  it('пропуск не записался — полоса остаётся с понятной ошибкой, список не перечитывается', async () => {
    h.err = { message: 'boom' }
    setup({ booleans: [met({ id: 'b1' })] })
    await w!.get('[data-test="qa-toggle"]').trigger('click')
    await w!.get('[data-test="qa-skip"]').trigger('click')
    h.state.load.mockClear()
    await w!.get('[data-test="qa-skip-yes"]').trigger('click')
    await flushPromises()
    expect(w!.find('[data-test="qa-error"]').exists()).toBe(true)
    expect(w!.find('[data-test="qa-strip"]').exists()).toBe(true)
    expect(h.state.load).not.toHaveBeenCalled()
  })

  it('числовая метрика: «Значение» переводит фокус в поле значения', async () => {
    setup({ numbers: [met({ id: 'n1', name: 'Вода', type: 'number', goal_value: 8, unit: 'ст.' })], pending: { n1: 3 } })
    await w!.get('[data-test="qa-toggle"]').trigger('click')
    await w!.get('[data-test="qa-value"]').trigger('click')
    await flushPromises()
    const active = document.activeElement as HTMLElement
    expect(active.tagName).toBe('INPUT')
    expect(active.closest('[data-metric-id="n1"]')).not.toBeNull()
  })
})
