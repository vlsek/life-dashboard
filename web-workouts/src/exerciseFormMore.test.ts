import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExerciseForm from './components/ExerciseForm.vue'
import { VARIANT_BASES } from './lib/exerciseVariants'
import type { Exercise, ExerciseFormInput } from './lib/types'

// BACKLOG 62.2: добавление упражнения без лишних вопросов. У нового упражнения категория, вес/единица, «что считаем», длительность, Л/П и мышцы
// свёрнуты под «Ещё»; на виду — название, типовое/разновидность и «Сохранить». При правке существующего всё раскрыто.
const hidden = (w: ReturnType<typeof mount>, sel: string) => (w.find(sel).element as HTMLElement).style.display === 'none'
const saved = (w: ReturnType<typeof mount>) => w.emitted('save')?.[0]?.[0] as ExerciseFormInput
const existing = { id: 'e1', name: 'Присед', category: 'lower', tracks_weight: true, unit: 'кг', value_label: 'повторения', tracks_duration: false, bilateral: false } as unknown as Exercise

describe('ExerciseForm: «Ещё» (62.2)', () => {
  it('новое упражнение: дополнительные поля свёрнуты, видна краткая сводка, есть кнопка «Ещё»', () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    expect(hidden(w, '[data-testid="more-fields"]')).toBe(true)
    expect(w.find('[data-testid="more-toggle"]').exists()).toBe(true)
    expect(w.find('[data-testid="more-summary"]').text()).toContain('·')
    expect(w.find('[data-testid="more-toggle"]').attributes('aria-expanded')).toBe('false')
  })

  it('кнопка раскрывает и снова сворачивает поля; сводка прячется, пока поля открыты', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('[data-testid="more-toggle"]').trigger('click')
    expect(hidden(w, '[data-testid="more-fields"]')).toBe(false)
    expect(w.find('[data-testid="more-summary"]').exists()).toBe(false)
    expect(w.find('[data-testid="more-toggle"]').attributes('aria-expanded')).toBe('true')
    await w.find('[data-testid="more-toggle"]').trigger('click')
    expect(hidden(w, '[data-testid="more-fields"]')).toBe(true)
  })

  it('типовое упражнение сохраняется сразу, без открытия «Ещё»: значения подставлены автозаполнением', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    const sel = w.find('[data-testid="typical-select"]')
    ;(sel.element as HTMLSelectElement).value = 'plank'
    await sel.trigger('change')
    expect(hidden(w, '[data-testid="more-fields"]')).toBe(true)
    expect(w.find('[data-testid="more-summary"]').text()).toMatch(/без веса|no weight/)
    await w.find('form').trigger('submit')
    const out = saved(w)
    const plank = VARIANT_BASES.find((b) => b.id === 'plank')!
    expect([plank.ru.toLowerCase(), plank.en.toLowerCase()]).toContain(out.name.toLowerCase())
    expect(out.tracks_weight).toBe('no')
  })

  it('правка существующего упражнения: поля раскрыты, кнопки «Ещё» нет', () => {
    const w = mount(ExerciseForm, { props: { existing } })
    expect(hidden(w, '[data-testid="more-fields"]')).toBe(false)
    expect(w.find('[data-testid="more-toggle"]').exists()).toBe(false)
    expect(w.find('[data-testid="category-select"]').exists()).toBe(true)
  })

  it('на виду (вне «Ещё») остаются название, типовое и «Сохранить»', () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    const more = w.find('[data-testid="more-fields"]').element
    for (const sel of ['input[type="text"]', '[data-testid="typical-select"]', 'button[type="submit"]']) {
      const el = w.find(sel).element
      expect(more.contains(el), sel).toBe(false)
    }
    for (const sel of ['[data-testid="category-select"]', '[data-testid="tracks-weight-select"]', '[data-testid="value-label-select"]', '[data-testid="muscles-field"]']) {
      expect(more.contains(w.find(sel).element), sel).toBe(true)
    }
  })
})
