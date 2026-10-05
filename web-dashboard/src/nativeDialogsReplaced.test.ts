import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — node:fs для проверки исходников
import { readFileSync } from 'node:fs'

// BACKLOG 573 «Аудит устаревшего оформления»: последние нативные окна дашборда заменены окнами сайта
const h = vi.hoisted(() => ({
  confirmAnswer: true,
  confirmCalls: [] as string[],
  catError: null as unknown,
  catInserts: [] as Record<string, unknown>[],
  metricInserts: [] as Record<string, unknown>[],
  deletes: [] as string[],
}))
vi.mock('./lib/confirmDialog', () => ({
  confirmDialog: vi.fn(async (msg: string) => {
    h.confirmCalls.push(msg)
    return h.confirmAnswer
  }),
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: h.catError ? null : { id: 'cat-new', key: 'k', label_en: 'x', label_ru: 'x' }, error: h.catError }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        insert: (row: Record<string, unknown>) => {
          if (table === 'metric_categories') h.catInserts.push(row)
          if (table === 'metrics') {
            h.metricInserts.push(row)
            return Promise.resolve({ error: null })
          }
          return chain
        },
        delete: () => ({ eq: (_c: string, id: string) => (h.deletes.push(id), Promise.resolve({ error: null })) }),
      }
      return chain
    },
  },
}))

import MetricFormModal from './components/MetricFormModal.vue'
import NumberMetricField from './components/NumberMetricField.vue'
import { emptyForm } from './lib/metricsManager'
import { useMetricsManager } from './lib/useMetricsManager'
import type { Metric } from './lib/types'

const metric = { id: 'm1', user_id: 'u1', name: 'Вода', icon: null, type: 'number', unit: 'мл', goal_value: 2000, goal_direction: 'at_least', schedule: null, category_id: null, position: 0, input_mode: 'add' } as unknown as Metric

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.confirmAnswer = true
  h.confirmCalls = []
  h.catError = null
  h.catInserts = []
  h.metricInserts = []
  h.deletes = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('удаление метрики спрашивает окном сайта', () => {
  it('«Отмена» — метрика не удаляется; подтверждение — удаляется; текст содержит имя метрики', async () => {
    const mm = useMetricsManager()
    await mm.load('u1')
    h.confirmAnswer = false
    expect(await mm.deleteMetric(metric)).toBe(false)
    expect(h.deletes).toEqual([])
    h.confirmAnswer = true
    expect(await mm.deleteMetric(metric)).toBe(true)
    expect(h.deletes).toEqual(['m1'])
    expect(h.confirmCalls[0]).toContain('Вода')
  })
})

describe('новая категория: поле в форме вместо системного prompt()', () => {
  it('в форме метрики при выборе «Новая категория» появляется поле названия и уходит в сохраняемую форму; при другом выборе поля нет', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    expect(w.find('[data-test="new-category-input"]').exists()).toBe(false)
    const select = w.findAll('select').find((x) => x.find('option[value="__new__"]').exists())!
    await select.setValue('__new__')
    expect(w.text()).toContain('Название новой категории')
    await w.find('[data-test="new-category-input"]').setValue('Спорт')
    await w.find('input[type="text"]').setValue('Йога') // название метрики
    await w.findAll('button').find((b) => b.text() === 'Сохранить')!.trigger('click')
    const saved = w.emitted('save')![0][0] as { categoryId: string; newCategory: string }
    expect(saved.categoryId).toBe('__new__')
    expect(saved.newCategory).toBe('Спорт')
    await select.setValue('')
    expect(w.find('[data-test="new-category-input"]').exists()).toBe(false)
    w.unmount()
  })

  it('addMetric с новой категорией: сначала создаётся категория с введённым названием, метрика получает её id', async () => {
    const mm = useMetricsManager()
    await mm.load('u1')
    const form = { ...emptyForm(), name: 'Йога', type: 'boolean' as const, categoryId: '__new__', newCategory: '  Спорт  ' }
    expect(await mm.addMetric(form)).toBe(true)
    expect(h.catInserts).toHaveLength(1)
    expect(h.catInserts[0]).toMatchObject({ label_ru: 'Спорт', label_en: 'Спорт', created_by: 'u1' })
    expect(h.metricInserts[0]).toMatchObject({ name: 'Йога', category_id: 'cat-new' })
  })

  it('пустое название новой категории — метрика сохраняется без категории, категория не создаётся', async () => {
    const mm = useMetricsManager()
    await mm.load('u1')
    expect(await mm.addMetric({ ...emptyForm(), name: 'Йога', type: 'boolean' as const, categoryId: '__new__', newCategory: '   ' })).toBe(true)
    expect(h.catInserts).toEqual([])
    expect(h.metricInserts[0]).toMatchObject({ category_id: null })
  })

  it('не удалось создать категорию — метрика НЕ сохраняется, показана ошибка (раньше alert и метрика без категории)', async () => {
    h.catError = { message: 'duplicate key value violates unique constraint "metric_categories_key_key"' }
    const mm = useMetricsManager()
    await mm.load('u1')
    expect(await mm.addMetric({ ...emptyForm(), name: 'Йога', type: 'boolean' as const, categoryId: '__new__', newCategory: 'Спорт' })).toBe(false)
    expect(h.metricInserts).toEqual([])
    expect(mm.error.value).toContain('Не удалось создать категорию')
    expect(mm.error.value).not.toMatch(/duplicate|constraint|metric_categories/i)
  })

  it('выбранная существующая категория и «без категории» работают как раньше', async () => {
    const mm = useMetricsManager()
    await mm.load('u1')
    await mm.addMetric({ ...emptyForm(), name: 'A', type: 'boolean' as const, categoryId: 'cat-1' })
    await mm.addMetric({ ...emptyForm(), name: 'B', type: 'boolean' as const, categoryId: '' })
    expect(h.metricInserts.map((r) => r.category_id)).toEqual(['cat-1', null])
    expect(h.catInserts).toEqual([])
  })
})

describe('«Поправить итог»: поле в карточке метрики вместо системного prompt()', () => {
  const mountField = (value = 450) => mount(NumberMetricField, { props: { metric, value }, attachTo: document.body })

  it('карандаш открывает форму с текущим итогом, повторное нажатие закрывает; системный prompt не вызывается', async () => {
    const prompt = vi.fn()
    vi.stubGlobal('prompt', prompt)
    const w = mountField()
    expect(w.find('[data-test="fix-total-form"]').exists()).toBe(false)
    await w.find('button.fix-btn').trigger('click')
    expect((w.find('[data-test="fix-total-input"]').element as HTMLInputElement).value).toBe('450')
    await w.find('button.fix-btn').trigger('click')
    expect(w.find('[data-test="fix-total-form"]').exists()).toBe(false)
    expect(prompt).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    w.unmount()
  })

  it('«Сохранить» и Enter шлют fix с введённым текстом и закрывают форму', async () => {
    const w = mountField()
    await w.find('button.fix-btn').trigger('click')
    await w.find('[data-test="fix-total-input"]').setValue('300')
    await w.find('[data-test="fix-total-save"]').trigger('click')
    expect(w.emitted('fix')![0]).toEqual(['300'])
    expect(w.find('[data-test="fix-total-form"]').exists()).toBe(false)
    await w.find('button.fix-btn').trigger('click')
    await w.find('[data-test="fix-total-input"]').setValue('120')
    await w.find('[data-test="fix-total-input"]').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('fix')![1]).toEqual(['120'])
    w.unmount()
  })

  it('«Отмена» и Esc закрывают форму без отправки', async () => {
    const w = mountField()
    await w.find('button.fix-btn').trigger('click')
    await w.find('[data-test="fix-total-input"]').setValue('999')
    await w.find('[data-test="fix-total-cancel"]').trigger('click')
    await w.find('button.fix-btn').trigger('click')
    await w.find('[data-test="fix-total-input"]').trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-test="fix-total-form"]').exists()).toBe(false)
    expect(w.emitted('fix')).toBeUndefined()
    w.unmount()
  })

  it('форма открывается заново с актуальным итогом, а не с прошлым введённым', async () => {
    const w = mountField(450)
    await w.find('button.fix-btn').trigger('click')
    await w.find('[data-test="fix-total-input"]').setValue('1')
    await w.find('[data-test="fix-total-cancel"]').trigger('click')
    await w.setProps({ value: 700 })
    await w.find('button.fix-btn').trigger('click')
    expect((w.find('[data-test="fix-total-input"]').element as HTMLInputElement).value).toBe('700')
    w.unmount()
  })
})

describe('удаление параметра тела в профиле: окно сайта', () => {
  it('в ProfileSection нет системного confirm, подтверждение через confirmDialog', () => {
    const src: string = readFileSync('src/components/ProfileSection.vue', 'utf-8')
    expect(src).toContain("confirmDialog(t('dash_body_param_delete_confirm')")
    expect(src).not.toMatch(/window\.confirm\(/)
  })
  it('хост окна подтверждения стоит в оболочке страницы', () => {
    expect(readFileSync('src/components/AppShell.vue', 'utf-8')).toContain('<ConfirmDialogHost />')
  })
})
