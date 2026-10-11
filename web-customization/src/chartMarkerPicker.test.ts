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

describe('ChartLinePicker: выбор стиля линии (BACKLOG 55.2 срез 3)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('внутри раздела графиков: три карточки, по умолчанию «Обычная»; у «с областью» есть градиент, у «обычной» — нет', () => {
    const w = mount(ChartMarkerPicker)
    expect(w.find('[data-testid="line-picker"]').exists()).toBe(true)
    expect(w.findAll('[data-testid^="line-"][data-active]')).toHaveLength(3)
    expect(w.find('[data-testid="line-line"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="line-area"] svg').html()).toContain('linearGradient')
    expect(w.find('[data-testid="line-line"] svg').html()).not.toContain('Gradient')
    expect(w.find('[data-testid="line-smooth"] svg').html()).toContain('stroke-linecap')
    expect(w.find('[data-testid="line-area"]').text()).toContain('Плавная с областью')
  })

  it('выбор «Плавная» запоминается в chart_line; кнопка выбранного отключена; маркеры не затронуты', async () => {
    const w = mount(ChartMarkerPicker)
    await w.find('[data-testid="line-smooth"] [data-testid="line-choose"]').trigger('click')
    expect(localStorage.getItem('chart_line')).toBe('smooth')
    expect(w.find('[data-testid="line-smooth"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="line-smooth"] button').attributes('disabled')).toBeDefined()
    expect(localStorage.getItem('chart_marker')).toBeNull()
  })

  it('без хранилища — сообщение, выбор не меняется', async () => {
    const w = mount(ChartMarkerPicker)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      await w.find('[data-testid="line-area"] [data-testid="line-choose"]').trigger('click')
    } finally {
      spy.mockRestore()
    }
    expect(w.find('[data-testid="line-save-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="line-line"]').attributes('data-active')).toBe('true')
  })

  it('библиотека линии — точная копия из Дашборда (править там, затем scripts/apply_chart_marker.py)', () => {
    expect(readFileSync('src/lib/chartLine.ts', 'utf-8')).toBe(readFileSync('../web-dashboard/src/lib/chartLine.ts', 'utf-8'))
  })
})

describe('Анимация появления графика в «Кастомизации» (BACKLOG 55.2 срез 4)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('две карточки; по умолчанию «Без анимации»; выбор «Линия рисуется» пишет chart_anim и не трогает стиль линии', async () => {
    const w = mount(ChartMarkerPicker)
    expect(w.findAll('[data-testid^="anim-"][data-active]')).toHaveLength(2)
    expect(w.find('[data-testid="anim-none"]').attributes('data-active')).toBe('true')
    await w.find('[data-testid="anim-draw"] [data-testid="anim-choose"]').trigger('click')
    expect(localStorage.getItem('chart_anim')).toBe('draw')
    expect(w.find('[data-testid="anim-draw"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="anim-draw"] button').attributes('disabled')).toBeDefined()
    expect(localStorage.getItem('chart_line')).toBeNull()
  })

  it('без хранилища — сообщение, выбор не меняется', async () => {
    const w = mount(ChartMarkerPicker)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      await w.find('[data-testid="anim-draw"] [data-testid="anim-choose"]').trigger('click')
    } finally {
      spy.mockRestore()
    }
    expect(w.find('[data-testid="anim-save-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="anim-none"]').attributes('data-active')).toBe('true')
  })
})

describe('Прогноз на графике в «Кастомизации» (BACKLOG 55.2 срез 6)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('две карточки; по умолчанию «Без прогноза»; выбор «Тренд на 3 дня» пишет chart_forecast и не трогает остальное', async () => {
    const w = mount(ChartMarkerPicker)
    expect(w.findAll('[data-testid^="forecast-"][data-active]')).toHaveLength(2)
    expect(w.find('[data-testid="forecast-off"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="forecast-trend"]').text()).toContain('Тренд на 3 дня')
    await w.find('[data-testid="forecast-trend"] [data-testid="forecast-choose"]').trigger('click')
    expect(localStorage.getItem('chart_forecast')).toBe('trend')
    expect(w.find('[data-testid="forecast-trend"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="forecast-trend"] button').attributes('disabled')).toBeDefined()
    expect(localStorage.getItem('chart_line')).toBeNull()
    expect(localStorage.getItem('chart_anim')).toBeNull()
  })

  it('без хранилища — сообщение, выбор не меняется', async () => {
    const w = mount(ChartMarkerPicker)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      await w.find('[data-testid="forecast-trend"] [data-testid="forecast-choose"]').trigger('click')
    } finally {
      spy.mockRestore()
    }
    expect(w.find('[data-testid="forecast-save-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="forecast-off"]').attributes('data-active')).toBe('true')
  })
})
