import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CollapsibleSection from './CollapsibleSection.vue'

const mk = (props: Record<string, unknown> = {}) =>
  mount(CollapsibleSection, { props: { id: 'x', title: 'Секция', count: 3, ...props }, slots: { default: '<p data-test="inner">тело</p>' } })
const body = (w: ReturnType<typeof mk>) => w.find('[data-test="section-body-x"]').element as HTMLElement

describe('CollapsibleSection', () => {
  beforeEach(() => localStorage.clear())

  it('по умолчанию открыта, показывает счётчик; клик сворачивает (тело остаётся в DOM) и запоминает', async () => {
    const w = mk()
    expect(w.find('[data-test="section-count"]').text()).toBe('3')
    expect(w.find('button').attributes('aria-expanded')).toBe('true')
    expect(body(w).style.display).not.toBe('none')
    await w.find('button').trigger('click')
    expect(w.find('button').attributes('aria-expanded')).toBe('false')
    expect(body(w).style.display).toBe('none')
    expect(w.find('[data-test="inner"]').exists()).toBe(true)
    expect(localStorage.getItem('skills_section_x')).toBe('0')
  })

  it('сохранённое «свёрнуто» подхватывается сразу; defaultOpen=false работает без сохранения', () => {
    localStorage.setItem('skills_section_x', '0')
    expect(mk().find('button').attributes('aria-expanded')).toBe('false')
    localStorage.clear()
    expect(mk({ defaultOpen: false }).find('button').attributes('aria-expanded')).toBe('false')
  })

  it('без count счётчика нет', () => {
    expect(mk({ count: null }).find('[data-test="section-count"]').exists()).toBe(false)
  })
})
