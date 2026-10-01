import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import IconPicker from './IconPicker.vue'
import { ICON_CATEGORIES, METRIC_ICON_CHOICES, POPULAR_ICONS } from '../lib/icons'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

const shown = (w: ReturnType<typeof mount>) => w.findAll('[data-icon]').map((b) => b.attributes('data-icon'))

describe('IconPicker (BACKLOG 1.3)', () => {
  it('по умолчанию показывает только «Популярные» — редкие иконки скрыты', () => {
    const w = mount(IconPicker, { props: { modelValue: '' } })
    expect(shown(w)).toEqual(POPULAR_ICONS)
    expect(shown(w).length).toBeLessThan(METRIC_ICON_CHOICES.length)
    expect(w.find('[data-tab="popular"]').attributes('aria-selected')).toBe('true')
    w.unmount()
  })

  it('вкладки: все категории + «Популярные» + «Все»; клик переключает набор иконок', async () => {
    const w = mount(IconPicker, { props: { modelValue: '' } })
    expect(w.findAll('[role="tab"]').length).toBe(ICON_CATEGORIES.length + 2)
    await w.find('[data-tab="food"]').trigger('click')
    expect(shown(w)).toEqual(ICON_CATEGORIES.find((c) => c.key === 'food')!.icons)
    await w.find('[data-tab="all"]').trigger('click')
    expect(shown(w)).toEqual(METRIC_ICON_CHOICES)
    w.unmount()
  })

  it('поиск идёт по всему архиву, находит редкую иконку и прячет вкладки', async () => {
    const w = mount(IconPicker, { props: { modelValue: '' } })
    await w.find('[data-testid="icon-search"]').setValue('пицца')
    expect(shown(w)).toContain('pizza')
    expect(POPULAR_ICONS).not.toContain('pizza')
    expect(w.find('[data-testid="icon-tabs"]').exists()).toBe(false)
    expect(w.find('[data-testid="icon-count"]').text()).toContain('Найдено')
    await w.find('[data-testid="icon-search"]').setValue('')
    expect(w.find('[data-testid="icon-tabs"]').exists()).toBe(true)
    expect(shown(w)).toEqual(POPULAR_ICONS)
    w.unmount()
  })

  it('поиск без совпадений: сообщение про свой эмодзи', async () => {
    const w = mount(IconPicker, { props: { modelValue: '' } })
    await w.find('[data-testid="icon-search"]').setValue('qwertyuiop')
    expect(shown(w)).toEqual([])
    expect(w.text()).toContain('Ничего не найдено')
    w.unmount()
  })

  it('выбранная иконка видна отдельной строкой, даже если её нет в текущей вкладке', () => {
    const w = mount(IconPicker, { props: { modelValue: 'svg:pizza' } })
    expect(shown(w)).not.toContain('pizza') // в «Популярных» её нет
    const sel = w.find('[data-testid="icon-selected"]')
    expect(sel.exists()).toBe(true)
    expect(sel.text()).toContain('Выбрано')
    w.unmount()
  })

  it('клик по иконке отдаёт svg:<имя>; текущая помечена aria-pressed', async () => {
    const w = mount(IconPicker, { props: { modelValue: 'svg:run' } })
    expect(w.find('[data-icon="run"]').attributes('aria-pressed')).toBe('true')
    await w.find('[data-icon="swim"]').trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toBe('svg:swim')
    w.unmount()
  })

  it('свой эмодзи: вводится как есть; для эмодзи строки «Выбрано» нет', async () => {
    const w = mount(IconPicker, { props: { modelValue: '🦄' } })
    expect(w.find('[data-testid="icon-selected"]').exists()).toBe(false)
    const inputs = w.findAll('input')
    await inputs[inputs.length - 1].setValue('🔥')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toBe('🔥')
    w.unmount()
  })

  it('у кнопок иконок есть подпись (title/aria-label) на языке интерфейса', () => {
    const w = mount(IconPicker, { props: { modelValue: '' } })
    const run = w.find('[data-icon="run"]')
    expect(run.attributes('title')).toBeTruthy()
    expect(run.attributes('aria-label')).toBe(run.attributes('title'))
    expect(/[а-яё]/i.test(run.attributes('title') as string)).toBe(true)
    w.unmount()
  })
})
