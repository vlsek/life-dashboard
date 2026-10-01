import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DateStepper from './components/DateStepper.vue'

const TODAY = '2026-10-01'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 1, 12, 0))
  localStorage.setItem('site_lang', 'ru')
})
afterEach(() => vi.useRealTimers())

const mk = (modelValue: string) => mount(DateStepper, { props: { modelValue } })

describe('DateStepper', () => {
  it('показывает короткую подпись даты (день недели, число, месяц), без года в текущем году', () => {
    const text = mk(TODAY).find('[data-test="date-label"]').text().toLowerCase()
    expect(text).toContain('чт')
    expect(text).toContain('1')
    expect(text).toContain('октября')
    expect(text).not.toContain('2026')
  })

  it('год показывается, если дата не из текущего года', () => {
    expect(mk('2025-12-31').find('[data-test="date-label"]').text()).toContain('2025')
  })

  it('EN: английская подпись', () => {
    localStorage.setItem('site_lang', 'en')
    expect(mk(TODAY).find('[data-test="date-label"]').text()).toMatch(/Thu/)
  })

  it('«‹» и «›» шлют сдвиг на день назад и вперёд, в том числе через границу месяца и года', async () => {
    const w = mk('2026-01-01')
    await w.find('[data-test="date-prev"]').trigger('click')
    await w.find('[data-test="date-next"]').trigger('click')
    expect(w.emitted('update:modelValue')).toEqual([['2025-12-31'], ['2026-01-02']])
  })

  it('«›» не блокируется на сегодня — планы на завтра остаются доступны', async () => {
    const w = mk(TODAY)
    expect(w.find('[data-test="date-next"]').attributes('disabled')).toBeUndefined()
    await w.find('[data-test="date-next"]').trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual(['2026-10-02'])
  })

  it('«Сегодня» неактивен на сегодняшнем дне и возвращает на сегодня с любого другого', async () => {
    expect(mk(TODAY).find('[data-test="date-today"]').attributes('disabled')).toBeDefined()
    const w = mk('2026-09-20')
    const chip = w.find('[data-test="date-today"]')
    expect(chip.attributes('disabled')).toBeUndefined()
    await chip.trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual([TODAY])
  })

  it('выбор в календаре (input type=date) шлёт выбранную дату; пустое значение игнорируется', async () => {
    const w = mk(TODAY)
    const input = w.find('[data-test="date-input"]')
    expect(input.attributes('type')).toBe('date')
    expect((input.element as HTMLInputElement).value).toBe(TODAY)
    ;(input.element as HTMLInputElement).value = '2026-09-15'
    await input.trigger('change')
    ;(input.element as HTMLInputElement).value = ''
    await input.trigger('change')
    expect(w.emitted('update:modelValue')).toEqual([['2026-09-15']])
  })

  it('кнопки-стрелки доступны скринридеру (aria-label из словаря)', () => {
    const w = mk(TODAY)
    expect(w.find('[data-test="date-prev"]').attributes('aria-label')).toBe('← Пред.')
    expect(w.find('[data-test="date-next"]').attributes('aria-label')).toBe('След. →')
  })
})

// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'

describe('DailyMetricsSection: подложка у вложенных карточек (BACKLOG 16, 13:18)', () => {
  // happy-dom не считает scoped-стили SFC, поэтому проверяем сам источник — правило не должно потеряться.
  const src: string = readFileSync('src/components/DailyMetricsSection.vue', 'utf-8')
  it('вложенная карточка получает свой фон и рамку от токенов темы', () => {
    const m = src.match(/\.card :deep\(\.card\)\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toContain('background: color-mix(in srgb, var(--text)')
    expect(m![1]).toContain('border: 1px solid')
    expect(m![1]).toContain('border-radius')
  })
  it('вместо трёх кнопок-текстов в блоке используется DateStepper, старой навигации нет', () => {
    expect(src).toContain('<DateStepper v-model="date" />')
    expect(src).not.toContain('class="day-nav"')
  })
})
