import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import MetricOptionsEditor from './components/MetricOptionsEditor.vue'
import MetricFormModal from './components/MetricFormModal.vue'
import { buildInsertRow, draftsFromOptions, newOptionDraft, type MetricFormValues, type OptionDraft } from './lib/metricsManager'
import type { Metric } from './lib/types'

// BACKLOG «Форма метрики: поле «Варианты … формат: ключ:Метка» выглядит устаревшим»: варианты — список с полем «Название», ✕, стрелками, ручкой ☰ и «+ вариант»;
// ключ пользователь не вводит. Хранение `options` ([{ key, label }]) прежнее.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

// Родитель с v-model, как в форме: правки редактора возвращаются в modelValue.
function mountEditor(initial: OptionDraft[], props: Record<string, unknown> = {}) {
  const model = ref<OptionDraft[]>(initial)
  const Host = {
    components: { MetricOptionsEditor },
    setup: () => ({ model, props }),
    template: '<MetricOptionsEditor v-model="model" v-bind="props" />',
  }
  const w = mount(Host, { attachTo: document.body })
  return { w, model, labels: () => model.value.map((o) => o.label), keys: () => model.value.map((o) => o.key) }
}
const rows = (w: ReturnType<typeof mount>) => w.findAll('[data-test="option-row"]')
const labelsShown = (w: ReturnType<typeof mount>) => w.findAll('[data-test="option-label"]').map((i) => (i.element as HTMLInputElement).value)
const three = () => draftsFromOptions([{ key: 'a', label: 'Альфа' }, { key: 'b', label: 'Бета' }, { key: 'c', label: 'Гамма' }])

describe('редактор вариантов метрики', () => {
  it('у каждого варианта своя строка: название, ручка ☰, стрелки и ✕; на краях стрелка недоступна', () => {
    const { w } = mountEditor(three())
    expect(labelsShown(w)).toEqual(['Альфа', 'Бета', 'Гамма'])
    for (const r of rows(w)) {
      expect(r.find('[data-test="option-drag"] svg').exists()).toBe(true)
      expect(r.find('[data-test="option-remove"]').attributes('aria-label')).toBe('Удалить вариант')
      expect(r.find('[data-test="option-up"]').classes()).not.toContain('secondary') // оформление «Раскладки», как у графиков
    }
    expect(rows(w)[0].find('[data-test="option-up"]').attributes('disabled')).toBeDefined()
    expect(rows(w)[2].find('[data-test="option-down"]').attributes('disabled')).toBeDefined()
    expect(rows(w)[1].find('[data-test="option-up"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })

  it('правка названия меняет подпись, а ключ сохранённого варианта остаётся', async () => {
    const { w, model } = mountEditor(three())
    await w.findAll('[data-test="option-label"]')[1].setValue('Бета-2')
    expect(model.value.map((o) => [o.key, o.label])).toEqual([['a', 'Альфа'], ['b', 'Бета-2'], ['c', 'Гамма']])
    w.unmount()
  })

  it('«+ вариант» добавляет пустую строку в конец и ставит в неё курсор; Enter в поле добавляет строку сразу после него', async () => {
    const { w, model } = mountEditor(three())
    await w.find('[data-test="option-add"]').trigger('click')
    await nextTick()
    expect(model.value).toHaveLength(4)
    expect(model.value[3]).toMatchObject({ key: '', label: '' })
    expect(document.activeElement).toBe(w.findAll('[data-test="option-label"]')[3].element)
    await w.findAll('[data-test="option-label"]')[0].trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(model.value).toHaveLength(5)
    expect(model.value[1]).toMatchObject({ key: '', label: '' }) // новая — сразу после первой
    expect(model.value[0].key).toBe('a')
    expect(document.activeElement).toBe(w.findAll('[data-test="option-label"]')[1].element)
    w.unmount()
  })

  it('в пустом списке «+ вариант» создаёт первую строку', async () => {
    const { w, model } = mountEditor([])
    expect(rows(w)).toHaveLength(0)
    await w.find('[data-test="option-add"]').trigger('click')
    expect(model.value).toHaveLength(1)
    expect(rows(w)).toHaveLength(1)
    w.unmount()
  })

  it('✕ убирает именно этот вариант', async () => {
    const { w, labels } = mountEditor(three())
    await w.findAll('[data-test="option-remove"]')[1].trigger('click')
    expect(labels()).toEqual(['Альфа', 'Гамма'])
    w.unmount()
  })

  it('стрелки ↑/↓ меняют порядок', async () => {
    const { w, labels } = mountEditor(three())
    await w.findAll('[data-test="option-down"]')[0].trigger('click')
    expect(labels()).toEqual(['Бета', 'Альфа', 'Гамма'])
    await w.findAll('[data-test="option-up"]')[2].trigger('click')
    expect(labels()).toEqual(['Бета', 'Гамма', 'Альфа'])
    w.unmount()
  })

  it('перетаскивание за ручку ☰ меняет порядок (общий жест с «Раскладкой»), после удаления строки тоже', async () => {
    const { w, labels, keys } = mountEditor(three())
    const geometry = () =>
      rows(w).forEach((row, i) => {
        ;(row.element as HTMLElement).getBoundingClientRect = () => ({ top: i * 50, bottom: i * 50 + 44, height: 44, left: 0, right: 300, width: 300, x: 0, y: i * 50, toJSON: () => ({}) }) as DOMRect
      })
    const ptr = (type: string, y: number) => new MouseEvent(type, { clientY: y, bubbles: true, button: 0 })
    geometry()
    const handle = w.findAll('[data-test="option-drag"]')[0].element
    handle.dispatchEvent(ptr('pointerdown', 22))
    handle.dispatchEvent(ptr('pointermove', 22 + 70)) // центр первой уходит за середину второй (72)
    await nextTick()
    handle.dispatchEvent(ptr('pointerup', 92))
    await nextTick()
    expect(labels()).toEqual(['Бета', 'Альфа', 'Гамма'])
    expect(keys()).toEqual(['b', 'a', 'c']) // ключи переезжают вместе со строками

    await w.findAll('[data-test="option-remove"]')[0].trigger('click') // остались Альфа, Гамма
    geometry()
    const h2 = w.findAll('[data-test="option-drag"]')[0].element
    h2.dispatchEvent(ptr('pointerdown', 22))
    h2.dispatchEvent(ptr('pointermove', 22 + 70))
    await nextTick()
    h2.dispatchEvent(ptr('pointerup', 92))
    await nextTick()
    expect(labels()).toEqual(['Гамма', 'Альфа'])
    w.unmount()
  })

  it('клавиатура на ручке: стрелки двигают на одну позицию', async () => {
    const { w, labels } = mountEditor(three())
    await w.findAll('[data-test="option-drag"]')[0].trigger('keydown', { key: 'ArrowDown' })
    expect(labels()).toEqual(['Бета', 'Альфа', 'Гамма'])
    w.unmount()
  })

  it('disabled: все поля и кнопки недоступны, блок приглушён', () => {
    const { w } = mountEditor(three(), { disabled: true })
    for (const sel of ['option-label', 'option-drag', 'option-up', 'option-down', 'option-remove', 'option-add']) {
      for (const el of w.findAll(`[data-test="${sel}"]`)) expect(el.attributes('disabled'), sel).toBeDefined()
    }
    expect(w.find('[data-test="options-editor"]').attributes('style')).toContain('opacity: 0.4')
    w.unmount()
  })

  it('для «Подходов» подписи другие: «+ Особенность», подсказка «напр.: классические»', () => {
    const choice = mountEditor([newOptionDraft()])
    expect(choice.w.find('[data-test="option-add"]').text()).toBe('+ Вариант')
    expect(choice.w.find('[data-test="option-label"]').attributes('placeholder')).toBe('Название варианта')
    const sets = mountEditor([newOptionDraft()], { sets: true })
    expect(sets.w.find('[data-test="option-add"]').text()).toBe('+ Особенность')
    expect(sets.w.find('[data-test="option-label"]').attributes('placeholder')).toBe('напр.: классические')
    choice.w.unmount()
    sets.w.unmount()
  })
})

function metric(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Mood', icon: '🙂', type: 'multiselect', unit: '', goal_value: 0, goal_direction: 'at_least', schedule: null, category_id: null, position: 0, options: [{ key: 'ok', label: 'Нормально' }, { key: 'bad', label: 'Плохо' }], ...o } as Metric
}

describe('форма метрики: варианты списком', () => {
  it('открывается со списком сохранённых вариантов; старая строка «ключ:Метка» исчезла', () => {
    const w = mount(MetricFormModal, { props: { existing: metric(), categories: [] } })
    expect(labelsShown(w)).toEqual(['Нормально', 'Плохо'])
    expect(w.text()).not.toContain('ключ:Метка')
    expect(w.text()).toContain('Варианты (только для «Выбор»)')
    w.unmount()
  })

  it('сохранение: новый вариант получает ключ, старые ключи те же, порядок как в списке; в базу уходит прежний формат options', async () => {
    const w = mount(MetricFormModal, { props: { existing: metric(), categories: [] } })
    await w.find('[data-test="option-add"]').trigger('click')
    await w.findAll('[data-test="option-label"]')[2].setValue('Отлично, как никогда')
    await w.findAll('[data-test="option-up"]')[2].trigger('click') // новый вариант на второе место
    await w.find('.modal-actions button:last-child').trigger('click')
    const form = w.emitted('save')![0][0] as MetricFormValues
    const row = buildInsertRow(form, 'u1', 0, null)
    expect(row.options).toEqual([
      { key: 'ok', label: 'Нормально' },
      { key: 'Отлично, как никогда', label: 'Отлично, как никогда' },
      { key: 'bad', label: 'Плохо' },
    ])
    expect(JSON.stringify(row.options)).not.toContain('"id"') // служебный id в базу не попадает
    w.unmount()
  })

  it('пустые строки при сохранении отбрасываются', async () => {
    const w = mount(MetricFormModal, { props: { existing: metric(), categories: [] } })
    await w.find('[data-test="option-add"]').trigger('click')
    await w.find('[data-test="option-add"]').trigger('click')
    await w.find('.modal-actions button:last-child').trigger('click')
    expect(buildInsertRow(w.emitted('save')![0][0] as MetricFormValues, 'u1', 0, null).options).toHaveLength(2)
    w.unmount()
  })

  it('для числовой метрики блок вариантов приглушён и недоступен; при смене типа на «Подходы» подписи — про особенности', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    expect(w.find('[data-test="options-editor"]').attributes('style')).toContain('opacity: 0.4')
    expect(w.find('[data-test="option-add"]').attributes('disabled')).toBeDefined()
    await w.find('select').setValue('sets')
    await nextTick()
    expect(w.find('[data-test="option-add"]').attributes('disabled')).toBeUndefined()
    expect(w.find('[data-test="option-add"]').text()).toBe('+ Особенность')
    expect(w.text()).toContain('Сохранённые особенности (тип «Подходы», необязательно)')
    w.unmount()
  })

  it('смена типа на «да/нет» очищает варианты', async () => {
    const w = mount(MetricFormModal, { props: { existing: metric(), categories: [] } })
    expect(rows(w)).toHaveLength(2)
    await w.find('select').setValue('boolean')
    await nextTick()
    expect(rows(w)).toHaveLength(0)
    w.unmount()
  })
})
