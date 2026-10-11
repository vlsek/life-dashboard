import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { MAX_PAUSE_DAYS, maxPauseTo, pauseErrorKey, pauseState, validatePause, type PauseRow } from './lib/pause'
import { todayStr, addDaysIso } from './lib/date'
import { t } from './lib/i18n'

// BACKLOG 48.7: режим «отпуск / болезнь». Задним числом нельзя, не дольше 30 дней.
const row = (from: string, to: string, kind: 'vacation' | 'illness' = 'vacation'): PauseRow => ({ id: 'p' + from, kind, from_date: from, to_date: to })

describe('pauseState', () => {
  it('нет журнала или всё закончилось — null', () => {
    expect(pauseState([], '2026-10-11')).toBeNull()
    expect(pauseState([row('2026-10-01', '2026-10-10')], '2026-10-11')).toBeNull()
  })
  it('идёт: считает оставшиеся дни, включая сегодня и последний день', () => {
    const s = pauseState([row('2026-10-09', '2026-10-14')], '2026-10-11')
    expect(s).toMatchObject({ status: 'active', daysLeft: 4 })
    expect(pauseState([row('2026-10-11', '2026-10-11')], '2026-10-11')).toMatchObject({ status: 'active', daysLeft: 1 })
  })
  it('запланирована: начнётся позже, дней — вся её длина', () => {
    expect(pauseState([row('2026-10-15', '2026-10-20')], '2026-10-11')).toMatchObject({ status: 'scheduled', daysLeft: 6 })
  })
  it('из нескольких берётся ещё не закончившаяся', () => {
    const s = pauseState([row('2026-09-01', '2026-09-10'), row('2026-10-10', '2026-10-12', 'illness')], '2026-10-11')
    expect(s?.row.kind).toBe('illness')
  })
})

describe('validatePause / maxPauseTo', () => {
  it('30 дней включительно: сегодня + 29', () => {
    expect(MAX_PAUSE_DAYS).toBe(30)
    expect(maxPauseTo('2026-10-11')).toBe('2026-11-09')
    expect(validatePause('2026-11-09', '2026-10-11')).toBeNull()
    expect(validatePause('2026-11-10', '2026-10-11')).toBe('hdr_pause_err_long')
  })
  it('задним числом нельзя, пусто нельзя, сегодня можно', () => {
    expect(validatePause('2026-10-10', '2026-10-11')).toBe('hdr_pause_err_past')
    expect(validatePause('', '2026-10-11')).toBe('hdr_pause_err_empty')
    expect(validatePause('2026-10-11', '2026-10-11')).toBeNull()
  })
})

describe('pauseErrorKey', () => {
  it('коды сервера → тексты; чужое — null', () => {
    expect(pauseErrorKey({ message: 'pause_backdated' })).toBe('hdr_pause_err_past')
    expect(pauseErrorKey({ message: 'pause_too_long' })).toBe('hdr_pause_err_long')
    expect(pauseErrorKey({ message: 'pause_already_set' })).toBe('hdr_pause_err_exists')
    expect(pauseErrorKey({ message: 'network down' })).toBeNull()
  })
})

const state: { rows: PauseRow[] | null; rpc: ReturnType<typeof vi.fn> } = { rows: [], rpc: vi.fn() }
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => (state.rows ? { data: state.rows, error: null } : { data: null, error: { message: 'no table' } }) }) }) }) }),
    rpc: (...a: unknown[]) => (state.rpc as unknown as (...x: unknown[]) => Promise<unknown>)(...a),
  },
}))

describe('PauseSection', () => {
  const reload = vi.fn()
  beforeEach(() => {
    state.rows = []
    state.rpc = vi.fn().mockResolvedValue({ error: null })
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } })
    reload.mockClear()
  })

  it('миграции нет (таблицы нет) — раздела нет', async () => {
    state.rows = null
    const PauseSection = (await import('./components/PauseSection.vue')).default
    const w = mount(PauseSection, { props: { userId: 'u1' } })
    await flushPromises()
    expect(w.find('[data-test="pause-section"]').exists()).toBe(false)
  })

  it('нет паузы: форма; «Включить» зовёт start_pause с видом и датой и перезагружает страницу', async () => {
    const PauseSection = (await import('./components/PauseSection.vue')).default
    const w = mount(PauseSection, { props: { userId: 'u1' } })
    await flushPromises()
    await w.find('[data-test="pause-kind-illness"]').trigger('click')
    const to = addDaysIso(todayStr(), 3)
    await w.find('[data-test="pause-to"]').setValue(to)
    await w.find('[data-test="pause-start"]').trigger('click')
    await flushPromises()
    expect(state.rpc).toHaveBeenCalledWith('start_pause', { p_kind: 'illness', p_to: to })
    expect(reload).toHaveBeenCalled()
  })

  it('прошлая дата и больше 30 дней — ошибка без запроса к серверу', async () => {
    const PauseSection = (await import('./components/PauseSection.vue')).default
    const w = mount(PauseSection, { props: { userId: 'u1' } })
    await flushPromises()
    await w.find('[data-test="pause-to"]').setValue(addDaysIso(todayStr(), -1))
    await w.find('[data-test="pause-start"]').trigger('click')
    expect(w.find('[data-test="pause-error"]').text()).toBe(t('hdr_pause_err_past'))
    await w.find('[data-test="pause-to"]').setValue(addDaysIso(todayStr(), 40))
    await w.find('[data-test="pause-start"]').trigger('click')
    expect(w.find('[data-test="pause-error"]').text()).toBe(t('hdr_pause_err_long'))
    expect(state.rpc).not.toHaveBeenCalled()
  })

  it('пауза идёт: статус и «Закончить» зовёт end_pause', async () => {
    state.rows = [row(addDaysIso(todayStr(), -1), addDaysIso(todayStr(), 4))]
    const PauseSection = (await import('./components/PauseSection.vue')).default
    const w = mount(PauseSection, { props: { userId: 'u1' } })
    await flushPromises()
    expect(w.find('[data-test="pause-status"]').text()).toContain('5')
    expect(w.find('[data-test="pause-start"]').exists()).toBe(false)
    await w.find('[data-test="pause-end"]').trigger('click')
    await flushPromises()
    expect(state.rpc).toHaveBeenCalledWith('end_pause')
    expect(reload).toHaveBeenCalled()
  })

  it('сервер отказал (уже есть пауза) — понятный текст, страница не перезагружается', async () => {
    state.rpc = vi.fn().mockResolvedValue({ error: { message: 'pause_already_set' } })
    const PauseSection = (await import('./components/PauseSection.vue')).default
    const w = mount(PauseSection, { props: { userId: 'u1' } })
    await flushPromises()
    await w.find('[data-test="pause-start"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="pause-error"]').text()).toBe(t('hdr_pause_err_exists'))
    expect(reload).not.toHaveBeenCalled()
  })
})
