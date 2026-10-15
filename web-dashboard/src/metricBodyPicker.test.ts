import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 762 срез 2, вариант Б: подбор названия метрики-упражнения по схеме тела (общий код shared/body-picker) в форме метрики Дашборда.
type Row = Record<string, unknown>
const h = vi.hoisted(() => ({ entries: [] as Row[], gender: null as string | null, entriesError: null as unknown, session: true }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: h.session ? { user: { id: 'u1' } } : null } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve({ data: h.gender ? { gender: h.gender } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(table === 'workout_entries' ? { data: h.entries, error: h.entriesError } : { data: [], error: null }).then(res, rej),
      }
      return chain
    },
  },
}))
vi.mock('./lib/confirmDialog', () => ({ confirmDialog: vi.fn(async () => true) }))

import MetricFormModal from './components/MetricFormModal.vue'
import { loadPickerData } from './lib/bodyPickerData'
import { sb } from './lib/supabase'
import { MUSCLE_IDS, musclesForExercise } from '../../shared/body-picker/muscles'

const EX = [{ id: 'e1', name: 'Жим лёжа' }]
const TODAY = '2026-10-14'
const BENCH = MUSCLE_IDS.filter((m) => musclesForExercise('Жим лёжа').includes(m))

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.entries = []
  h.gender = null
  h.entriesError = null
  h.session = true
})

describe('loadPickerData', () => {
  it('зелёные мышцы из подходов за последние дни и пол профиля', async () => {
    h.entries = [{ exercise_id: 'e1', date: TODAY, sets: [{}] }]
    h.gender = 'female'
    const r = await loadPickerData(sb, EX, TODAY)
    expect(r.recent).toEqual(BENCH)
    expect(r.gender).toBe('female')
  })
  it('ошибка загрузки, нет сессии или неизвестный пол — пустой результат, а не исключение', async () => {
    h.entriesError = { message: 'boom' }
    expect(await loadPickerData(sb, EX, TODAY)).toEqual({ recent: [], gender: null })
    h.session = false
    expect(await loadPickerData(sb, EX, TODAY)).toEqual({ recent: [], gender: null })
    h.session = true
    h.entriesError = null
    h.gender = 'other'
    expect((await loadPickerData(sb, EX, TODAY)).gender).toBeNull()
  })
})

const mountForm = (over: Record<string, unknown> = {}) =>
  mount(MetricFormModal, { props: { existing: null, categories: [], exercises: EX, exerciseLinkAvailable: true, ...over }, attachTo: document.body })

describe('блок подбора в форме метрики', () => {
  it('показан при создании, если связь с упражнением доступна; при редактировании и без миграции — нет', () => {
    expect(mountForm().find('[data-test="body-picker-block"]').exists()).toBe(true)
    expect(mountForm({ exerciseLinkAvailable: false }).find('[data-test="body-picker-block"]').exists()).toBe(false)
    expect(mountForm({ existing: { id: 'm1', name: 'Старая', type: 'sets' } }).find('[data-test="body-picker-block"]').exists()).toBe(false)
  })
  it('схема открывается по кнопке; выбор мышцы и упражнения подставляет название в поле', async () => {
    h.entries = [{ exercise_id: 'e1', date: new Date().toISOString().slice(0, 10), sets: [{}] }]
    const w = mountForm()
    expect(w.find('[data-testid="exercise-picker"]').exists()).toBe(false)
    await w.get('[data-test="body-picker-toggle"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="exercise-picker"]').exists()).toBe(true)
    await w.get('[data-muscle="chest"]').trigger('click')
    const first = w.get('[data-testid^="suggest-"]')
    const name = first.text()
    await first.trigger('click')
    expect((w.get('input[type="text"]').element as HTMLInputElement).value).toBe(name)
    expect(w.find('[data-testid="exercise-picker"]').exists()).toBe(false)
  })
  it('тексты схемы по-английски при языке en', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = mountForm()
    await w.get('[data-test="body-picker-toggle"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="exercise-picker"]').text()).toContain('Pick by body diagram')
  })
})
