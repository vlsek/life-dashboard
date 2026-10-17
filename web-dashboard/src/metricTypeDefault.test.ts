import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MetricFormModal from './components/MetricFormModal.vue'
import { emptyForm } from './lib/metricsManager'
import { t } from './lib/i18n'

// BACKLOG 65.1 (владелец): в форме новой метрики «Подходы» (повторение + особенность) — по умолчанию и первым в списке; «Число» — вторым,
// без примера «отжимания» (для отжиманий подходят «Подходы»); под выбором — подсказка, чем типы отличаются.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('тип новой метрики', () => {
  it('по умолчанию «Подходы»', () => {
    expect(emptyForm().type).toBe('sets')
  })
  it('порядок в списке: Подходы, Число, Да/нет, Выбор', () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    const opts = w.find('select').findAll('option').map((o) => o.element.value)
    expect(opts).toEqual(['sets', 'number', 'boolean', 'multiselect'])
    expect((w.find('select').element as HTMLSelectElement).value).toBe('sets')
    w.unmount()
  })
  it('у «Числа» в подписи нет «отжиманий», а у «Подходов» они есть (RU и EN)', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      expect(t('dash_metric_type_number').toLowerCase()).not.toMatch(/отжиман|push-?ups/)
      expect(t('dash_metric_type_sets').toLowerCase()).toMatch(/отжиман|push-?ups/)
    }
  })
  it('подсказка под выбором меняется вместе с типом', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    const hint = () => w.find('[data-test="type-hint"]').text()
    expect(hint()).toBe(t('dash_metric_type_hint_sets'))
    await w.find('select').setValue('number')
    await nextTick()
    expect(hint()).toBe(t('dash_metric_type_hint_number'))
    await w.find('select').setValue('boolean')
    await nextTick()
    expect(hint()).toBe(t('dash_metric_type_hint_boolean'))
    expect(new Set(['sets', 'number', 'boolean', 'multiselect'].map((k) => t(('dash_metric_type_hint_' + k) as never))).size).toBe(4)
    w.unmount()
  })
  it('существующая метрика открывается со своим типом, а не с «Подходами»', () => {
    const w = mount(MetricFormModal, { props: { existing: { id: 'm', name: 'Вода', type: 'number', icon: null } as never, categories: [] } })
    expect((w.find('select').element as HTMLSelectElement).value).toBe('number')
    w.unmount()
  })
})
