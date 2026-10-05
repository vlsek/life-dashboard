import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import SetsCard from './components/SetsCard.vue'
import cardSource from './components/SetsCard.vue?raw'
import sectionSource from './components/SetsSection.vue?raw'

// BACKLOG 780/815, срез 2: анимация «значение сохранено» в блоке «Подходы» Дашборда.
const h = vi.hoisted(() => ({ metricsData: [] as any[], valuesData: [] as any[], failUpsert: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'metrics' ? h.metricsData : h.valuesData, error: null }).then(res),
        upsert: () => Promise.resolve({ error: h.failUpsert ? { message: 'boom' } : null }),
      }
      return chain
    },
  },
}))
const { useSets } = await import('./lib/useSets')

const metric = (o: Partial<any> = {}): any => ({ id: 'm1', name: 'Push-ups', icon: null, type: 'sets', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, options: null, ...o })

let wrapper: ReturnType<typeof mount> | null = null
function setup() {
  let api!: ReturnType<typeof useSets>
  wrapper = mount(defineComponent({ setup: () => ((api = useSets()), () => null) }))
  return api
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.setItem('site_lang', 'ru')
  h.metricsData = [metric(), metric({ id: 'm2', name: 'Squats' })]
  h.valuesData = []
  h.failUpsert = false
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

describe('useSets: сигнал «сохранено»', () => {
  it('после подтверждённой записи метрика получает flashed на ~0,9 с и только она', async () => {
    const s = setup()
    await s.load('u1', '2026-10-01')
    await s.saveSets(s.metrics.value[0], [{ reps: 10 }] as any)
    expect(s.flashed.value).toEqual({ m1: true })
    vi.advanceTimersByTime(800)
    expect(s.flashed.value).toEqual({ m1: true })
    vi.advanceTimersByTime(150)
    expect(s.flashed.value).toEqual({})
  })

  it('ошибка записи — сигнала нет, сообщение об ошибке остаётся', async () => {
    h.failUpsert = true
    const s = setup()
    await s.load('u1', '2026-10-01')
    await s.saveSets(s.metrics.value[0], [{ reps: 10 }] as any)
    expect(s.flashed.value).toEqual({})
    expect(s.error.value).toContain('Push-ups')
  })

  it('две метрики подряд — у каждой свой сигнал, второй не гасит первый раньше времени', async () => {
    const s = setup()
    await s.load('u1', '2026-10-01')
    await s.saveSets(s.metrics.value[0], [{ reps: 5 }] as any)
    vi.advanceTimersByTime(400)
    await s.saveSets(s.metrics.value[1], [{ reps: 7 }] as any)
    expect(s.flashed.value).toEqual({ m1: true, m2: true })
    vi.advanceTimersByTime(600)
    expect(s.flashed.value).toEqual({ m2: true })
  })
})

describe('SetsCard: вид «сохранено»', () => {
  const mountCard = (saved?: boolean) => mount(SetsCard, { props: { metric: metric(), sets: [{ reps: 10 }] as any, saved } })

  it('без saved — ни галочки, ни подсветки', () => {
    const w = mountCard(false)
    expect(w.find('[data-test="saved-tick"]').exists()).toBe(false)
    expect(w.find('.card').classes()).not.toContain('sets-saved')
  })

  it('с saved — галочка и класс вспышки; кнопка сворачивания на месте', () => {
    const w = mountCard(true)
    expect(w.find('[data-test="saved-tick"]').exists()).toBe(true)
    expect(w.find('.card').classes()).toContain('sets-saved')
    expect(w.find('[data-test="sets-toggle"]').exists()).toBe(true)
    expect(w.find('[data-test="saved-tick"]').text()).toBe('Сохранено')
  })

  it('стили: галочка левее кнопки сворачивания, карточка relative, движение выключается', () => {
    expect(cardSource).toMatch(/class="card relative mb-3\.5"/)
    expect(cardSource).toMatch(/\.card \.sets-tick \{[^}]*right: 52px/)
    expect(cardSource).toContain('@keyframes sets-saved')
    expect(cardSource).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.sets-saved \{ animation: none/)
    expect(cardSource).toContain("html[data-motion='off']) .sets-saved")
  })

  it('SetsSection передаёт карточке сигнал по id метрики', () => {
    expect(sectionSource).toContain('flashed')
    expect(sectionSource).toContain(':saved="!!flashed[m.id]"')
  })

  it('правка подхода по-прежнему отдаёт change; ввод сам по себе галочку не включает', async () => {
    const w = mountCard(false)
    await w.find('input[type="number"]').setValue('12')
    await w.find('input[type="number"]').trigger('change')
    expect(w.emitted('change')).toBeTruthy()
    expect(w.find('[data-test="saved-tick"]').exists()).toBe(false)
  })
})
