import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import ChartMarkerPicker from './components/ChartMarkerPicker.vue'
import { CHART_MARKER_KEY, readChartMarker } from './lib/chartMarker'

describe('ChartMarkerPicker: выбор стиля маркеров графиков в «Кастомизации» (BACKLOG 13:54)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('четыре карточки с живым предпросмотром; по умолчанию выбран «Плоский»; стекло и капля имеют свои градиенты', () => {
    const w = mount(ChartMarkerPicker)
    expect(w.findAll('[data-testid^="marker-"][data-active]')).toHaveLength(4)
    expect(w.find('[data-testid="marker-flat"]').attributes('data-active')).toBe('true')
    for (const v of ['flat', 'glass', 'drop', 'outline']) expect(w.find(`[data-testid="marker-${v}"] svg`).findAll('[data-test="pie-point"], path').length, v).toBeGreaterThan(4)
    expect(w.find('[data-testid="marker-glass"] svg').html()).toContain('radialGradient')
    expect(w.find('[data-testid="marker-drop"] svg').html()).toContain('linearGradient')
    expect(w.find('[data-testid="marker-flat"] svg').html()).not.toContain('Gradient')
    expect(w.find('[data-testid="marker-glass"]').text()).toContain('Стекло')
  })

  it('выбор «Капля» запоминается и подхватывается графиком; кнопка выбранного отключена', async () => {
    const w = mount(ChartMarkerPicker)
    await w.find('[data-testid="marker-drop"] [data-testid="marker-choose"]').trigger('click')
    expect(localStorage.getItem(CHART_MARKER_KEY)).toBe('drop')
    expect(readChartMarker()).toBe('drop')
    expect(w.find('[data-testid="marker-drop"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="marker-drop"] button').attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="marker-flat"]').attributes('data-active')).toBe('false')
  })

  it('без хранилища — сообщение, выбор не меняется', async () => {
    const w = mount(ChartMarkerPicker)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      await w.find('[data-testid="marker-outline"] [data-testid="marker-choose"]').trigger('click')
    } finally {
      spy.mockRestore()
    }
    expect(w.find('[data-testid="marker-save-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="marker-flat"]').attributes('data-active')).toBe('true')
  })

  it('библиотека маркеров — точная копия из Дашборда (править там, затем scripts/apply_chart_marker.py)', () => {
    expect(readFileSync('src/lib/chartMarker.ts', 'utf-8')).toBe(readFileSync('../web-dashboard/src/lib/chartMarker.ts', 'utf-8'))
  })
})
