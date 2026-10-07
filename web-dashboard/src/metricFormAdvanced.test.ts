import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MetricFormModal from './components/MetricFormModal.vue'
import { buildInsertRow, type MetricFormValues } from './lib/metricsManager'
import type { Metric } from './lib/types'

// BACKLOG «Форма метрики: слишком много всего, легко запутаться — оставить только основное, дополнительные параметры раскрывать».
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

const metric = (o: Partial<Metric> = {}): Metric =>
  ({ id: 'm1', user_id: 'u1', name: 'Run', icon: '🏃', type: 'number', unit: 'km', goal_value: 5, goal_direction: 'at_least', schedule: null, category_id: null, position: 0, ...o }) as Metric
const block = (w: ReturnType<typeof mount>) => w.find('[data-test="advanced-block"]')
const isHidden = (w: ReturnType<typeof mount>) => (block(w).element as HTMLElement).style.display === 'none'
const mountNew = () => mount(MetricFormModal, { props: { existing: null, categories: [{ id: 'c1', label_ru: 'Спорт', label_en: 'Sport' }] as never } })

describe('форма метрики: основное и «Дополнительно»', () => {
  it('новая метрика: на виду название, значок, тип, цель и единица; «Дополнительно» свёрнуто', () => {
    const w = mountNew()
    expect(isHidden(w)).toBe(true)
    const toggle = w.find('[data-test="advanced-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.text()).toBe('Дополнительно')
    expect(w.find('[data-test="goal-row"]').exists()).toBe(true)
    expect(w.find('[data-test="goal-row"]').element.closest('[data-test="advanced-block"]')).toBeNull() // цель — основное
    w.unmount()
  })

  it('всё остальное — внутри блока: направление цели, режим ввода, расписание, категория, серия и её импорт', () => {
    const w = mountNew()
    const inside = (sel: string) => w.find(sel).element.closest('[data-test="advanced-block"]') !== null
    const selects = w.findAll('select')
    expect(selects).toHaveLength(5) // тип + направление + режим ввода + расписание + категория, порядок в DOM прежний
    expect((selects[0].element as HTMLElement).closest('[data-test="advanced-block"]')).toBeNull()
    for (const s of selects.slice(1)) expect((s.element as HTMLElement).closest('[data-test="advanced-block"]')).not.toBeNull()
    expect(inside('[data-test="count-streak"]')).toBe(true)
    expect(inside('[data-test="streak-import"]')).toBe(true)
    expect(inside('[data-test="track-only"]')).toBe(false) // «просто записывать значение» — основное
    w.unmount()
  })

  it('кнопка раскрывает и сворачивает блок, aria-expanded и стрелка меняются', async () => {
    const w = mountNew()
    const toggle = w.find('[data-test="advanced-toggle"]')
    await toggle.trigger('click')
    expect(isHidden(w)).toBe(false)
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.find('svg').attributes('style')).toContain('rotate(180deg)')
    await toggle.trigger('click')
    expect(isHidden(w)).toBe(true)
    expect(toggle.attributes('aria-expanded')).toBe('false')
    w.unmount()
  })

  it('правка метрики со стандартными настройками — блок свёрнут', () => {
    const w = mount(MetricFormModal, { props: { existing: metric(), categories: [] } })
    expect(isHidden(w)).toBe(true)
    expect(w.find('[data-test="advanced-count"]').exists()).toBe(false)
    w.unmount()
  })

  it('правка метрики с нестандартными настройками — блок раскрыт сразу, на кнопке видно сколько', () => {
    const w = mount(MetricFormModal, {
      props: { existing: metric({ goal_direction: 'at_most', category_id: 'c1', count_streak: false, schedule: { type: 'weekly', min: 3 } as never }), categories: [{ id: 'c1', label_ru: 'Спорт', label_en: 'Sport' }] as never },
    })
    expect(isHidden(w)).toBe(false)
    expect(w.find('[data-test="advanced-toggle"]').attributes('aria-expanded')).toBe('true')
    expect(w.find('[data-test="advanced-count"]').text()).toBe('· 4')
    w.unmount()
  })

  it('метрика «просто значение» (серия и расписание выключены) не раскрывает блок зря', () => {
    const w = mount(MetricFormModal, { props: { existing: metric({ count_streak: false, goal_value: 0, goal_direction: 'at_least', schedule: null }), categories: [] } })
    expect(isHidden(w)).toBe(true)
    w.unmount()
  })

  it('счётчик на свёрнутой кнопке растёт, когда меняешь настройку внутри; при сворачивании настройки не теряются', async () => {
    const w = mountNew()
    const toggle = w.find('[data-test="advanced-toggle"]')
    await toggle.trigger('click')
    await w.findAll('select')[1].setValue('at_most') // направление цели
    await toggle.trigger('click') // свернули
    expect(isHidden(w)).toBe(true)
    expect(w.find('[data-test="advanced-count"]').text()).toBe('· 1')
    await w.find('input[type="text"]').setValue('Метрика') // название
    await w.find('.modal-actions button:last-child').trigger('click')
    const form = w.emitted('save')![0][0] as MetricFormValues
    expect(form.goalDirection).toBe('at_most')
    w.unmount()
  })

  it('сохранение при свёрнутом блоке даёт настройки по умолчанию, как раньше', async () => {
    const w = mountNew()
    await w.find('input[type="text"]').setValue('  Вода ')
    await w.find('.modal-actions button:last-child').trigger('click')
    const row = buildInsertRow(w.emitted('save')![0][0] as MetricFormValues, 'u1', 0, null) as Record<string, unknown>
    expect(row).toMatchObject({ name: 'Вода', type: 'number', goal_direction: 'at_least', input_mode: 'set', category_id: null })
    expect(row).not.toHaveProperty('count_streak') // серия включена: значение по умолчанию в БД, как и раньше не пишется
    w.unmount()
  })

  it('подписи короткие: без «только для «Число»/«Подходы»» и «Иконка (эмодзи)»', () => {
    const w = mountNew()
    const text = w.text()
    expect(text).not.toContain('только для «Число»')
    expect(text).not.toContain('(эмодзи)')
    expect(text).toContain('Направление цели')
    expect(text).toContain('Значение цели X')
    expect(text).toContain('Единица (мл, мин…)')
    w.unmount()
  })

  it('по-английски кнопка тоже подписана', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mountNew()
    expect(w.find('[data-test="advanced-toggle"]').text()).toBe('More options')
    w.unmount()
  })

  it('смена типа на «Выбор» показывает варианты на виду, не раскрывая «Дополнительно»', async () => {
    const w = mountNew()
    await w.find('select').setValue('multiselect')
    await nextTick()
    expect(w.find('[data-test="options-editor"]').exists()).toBe(true)
    expect(isHidden(w)).toBe(true)
    w.unmount()
  })
})
