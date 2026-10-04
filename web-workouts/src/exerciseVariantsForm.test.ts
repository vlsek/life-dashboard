import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExerciseForm from './components/ExerciseForm.vue'
import type { Exercise } from './lib/types'

// BACKLOG 585: в форме упражнения — выбор типового упражнения и разновидности из списка, написанное не стирается
const existing = (name: string): Exercise =>
  ({ id: 'e1', user_id: 'u', name, category: 'upper', tracks_weight: false, unit: null, value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false }) as unknown as Exercise

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

const saved = (w: ReturnType<typeof mount>) => (w.emitted('save')![0][0] as { name: string }).name

describe('ExerciseForm: типовое упражнение', () => {
  it('в новой форме с пустым названием есть выбор типового упражнения; выбор подставляет название и показывает разновидности', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    expect(w.find('[data-testid="typical-select"]').exists()).toBe(true)
    expect(w.find('[data-testid="variant-field"]').exists()).toBe(false)
    await w.find('[data-testid="typical-select"]').setValue('pushup')
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Отжимания')
    expect(w.find('[data-testid="typical-field"]').exists()).toBe(false) // название уже есть — выбор типового скрыт
    expect(w.find('[data-testid="variant-field"]').exists()).toBe(true)
    w.unmount()
  })

  it('список разновидностей отжиманий содержит алмазные, широкие, обычным хватом, лучника', async () => {
    const w = mount(ExerciseForm, { props: { existing: existing('Отжимания') } })
    const labels = w.findAll('[data-testid="variant-select"] option').map((o) => o.text())
    expect(labels).toEqual(expect.arrayContaining(['— без разновидности —', 'алмазные', 'широкие', 'обычным хватом', 'лучника']))
    w.unmount()
  })

  it('выбор разновидности дописывает её к названию, и «Сохранить» отдаёт такое название', async () => {
    const w = mount(ExerciseForm, { props: { existing: existing('Отжимания') } })
    const opts = w.findAll('[data-testid="variant-select"] option')
    const diamond = opts.find((o) => o.text() === 'алмазные')!
    await w.find('[data-testid="variant-select"]').setValue(diamond.attributes('value'))
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Отжимания алмазные')
    await w.find('form').trigger('submit')
    expect(saved(w)).toBe('Отжимания алмазные')
    w.unmount()
  })

  it('смена разновидности не стирает дописанное самим человеком; выбранная показана в списке', async () => {
    const w = mount(ExerciseForm, { props: { existing: existing('Мои отжимания алмазные у стены') } })
    const sel = w.find('[data-testid="variant-select"]')
    expect((sel.element as HTMLSelectElement).selectedOptions[0].text).toBe('алмазные')
    const wide = w.findAll('[data-testid="variant-select"] option').find((o) => o.text() === 'широкие')!
    await sel.setValue(wide.attributes('value'))
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Мои отжимания у стены широкие')
    await sel.setValue('')
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Мои отжимания у стены')
    w.unmount()
  })

  it('свою особенность можно вписать руками: название остаётся как набрано, разновидность «не выбрана»', async () => {
    const w = mount(ExerciseForm, { props: { existing: existing('Отжимания') } })
    await w.find('input[type="text"]').setValue('Отжимания с резинкой')
    expect((w.find('[data-testid="variant-select"]').element as HTMLSelectElement).value).toBe('')
    await w.find('form').trigger('submit')
    expect(saved(w)).toBe('Отжимания с резинкой')
    w.unmount()
  })

  it('не типовое упражнение — списка разновидностей нет; для типового есть подсказка про своё слово', () => {
    const none = mount(ExerciseForm, { props: { existing: existing('Йога') } })
    expect(none.find('[data-testid="variant-field"]').exists()).toBe(false)
    none.unmount()
    const some = mount(ExerciseForm, { props: { existing: existing('Планка') } })
    expect(some.find('[data-testid="variant-hint"]').text()).toContain('не стирается')
    some.unmount()
  })

  it('английский интерфейс: подписи и «Diamond push-ups»', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ExerciseForm, { props: { existing: existing('Push-ups') } })
    expect(w.text()).toContain('Variation')
    const diamond = w.findAll('[data-testid="variant-select"] option').find((o) => o.text() === 'Diamond')!
    await w.find('[data-testid="variant-select"]').setValue(diamond.attributes('value'))
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Diamond push-ups')
    w.unmount()
  })
})
