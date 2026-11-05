import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlateCalculator from './components/PlateCalculator.vue'
import { PLATES_KEY } from './lib/plates'

describe('PlateCalculator.vue (69.15 срез 1)', () => {
  beforeEach(() => localStorage.clear())

  it('цель → блины на сторону и итоговый вес', async () => {
    const w = mount(PlateCalculator, { props: { unit: 'кг' } })
    expect(w.find('[data-testid="plates-result"]').exists()).toBe(false)
    await w.get('[data-testid="plates-target"]').setValue('100')
    expect(w.findAll('[data-testid="plates-row"]').map((r) => r.text())).toEqual(['1 × 25', '1 × 15'])
    expect(w.get('[data-testid="plates-loaded"]').text()).toContain('100')
    expect(w.find('[data-testid="plates-short"]').exists()).toBe(false)
  })
  it('десятичная запятая в цели принимается; гриф 15 меняет расчёт', async () => {
    const w = mount(PlateCalculator, { props: { unit: 'кг' } })
    await w.get('[data-testid="plates-target"]').setValue('62,5')
    expect(w.findAll('[data-testid="plates-row"]').map((r) => r.text())).toEqual(['1 × 20', '1 × 1,25'])
    await w.findAll('[data-testid="plates-bar"]')[1].trigger('click')
    expect(w.findAll('[data-testid="plates-row"]').map((r) => r.text())).toEqual(['1 × 20', '1 × 2,5', '1 × 1,25']) // (62,5 − 15) / 2 = 23,75
    expect(w.get('[data-testid="plates-loaded"]').text()).toContain('62,5')
  })
  it('цель легче грифа и «только гриф»', async () => {
    const w = mount(PlateCalculator, { props: { unit: 'кг' } })
    await w.get('[data-testid="plates-target"]').setValue('10')
    expect(w.find('[data-testid="plates-below"]').exists()).toBe(true)
    await w.get('[data-testid="plates-target"]').setValue('20')
    expect(w.find('[data-testid="plates-bar-only"]').exists()).toBe(true)
  })
  it('свой набор блинов сохраняется и меняет расчёт; «по умолчанию» возвращает прежний', async () => {
    const w = mount(PlateCalculator, { props: { unit: 'кг' } })
    await w.get('[data-testid="plates-set"]').setValue('20, 10')
    expect(JSON.parse(localStorage.getItem(PLATES_KEY + 'kg')!)).toEqual([20, 10])
    await w.get('[data-testid="plates-target"]').setValue('61')
    expect(w.get('[data-testid="plates-short"]').text()).toContain('1')
    await w.get('[data-testid="plates-set"]').setValue('') // пока печатает — прежний набор остаётся
    expect(JSON.parse(localStorage.getItem(PLATES_KEY + 'kg')!)).toEqual([20, 10])
    await w.get('[data-testid="plates-reset"]').trigger('click')
    expect((w.get('[data-testid="plates-set"]').element as HTMLInputElement).value).toBe('25, 20, 15, 10, 5, 2.5, 1.25')
  })
  it('фунты: гриф 45 и набор в фунтах', async () => {
    const w = mount(PlateCalculator, { props: { unit: 'lb' } })
    expect(w.findAll('[data-testid="plates-bar"]').map((b) => b.text())).toEqual(['45', '35'])
    await w.get('[data-testid="plates-target"]').setValue('225')
    expect(w.findAll('[data-testid="plates-row"]').map((r) => r.text())).toEqual(['2 × 45'])
  })
  it('«Закрыть» и клик по фону эмитят close', async () => {
    const w = mount(PlateCalculator, { props: { unit: 'кг' } })
    await w.get('[data-testid="plates-close"]').trigger('click')
    await w.get('[data-testid="plates-modal"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(2)
  })
})
