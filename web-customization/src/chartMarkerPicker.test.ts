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

  it('внутри раздела графиков: пять карточек, по умолчанию «Обычная»; у «с областью» есть градиент, у «обычной» — нет', () => {
    const w = mount(ChartMarkerPicker)
    expect(w.find('[data-testid="line-picker"]').exists()).toBe(true)
    expect(w.findAll('[data-testid^="line-"][data-active]')).toHaveLength(5)
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

describe('«Дополнения» к графикам: появление, прогноз, зона цели (BACKLOG 55.2 срезы 4, 6, 8)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const toggle = (w: ReturnType<typeof mount>, key: string) => w.find(`[data-testid="extra-${key}"] [data-testid="extra-toggle"]`)

  it('один список из четырёх переключателей, все выключены по умолчанию; прежних групп карточек «Появление» и «Прогноз» нет', () => {
    const w = mount(ChartMarkerPicker)
    expect(w.findAll('[data-testid^="extra-"][data-active]')).toHaveLength(4)
    for (const k of ['anim', 'forecast', 'goalzone', 'sparks']) {
      expect(w.find(`[data-testid="extra-${k}"]`).attributes('data-active')).toBe('false')
      expect(toggle(w, k).attributes('role')).toBe('switch')
      expect(toggle(w, k).attributes('aria-checked')).toBe('false')
    }
    expect(w.find('[data-testid="anim-none"]').exists()).toBe(false)
    expect(w.find('[data-testid="forecast-off"]').exists()).toBe(false)
    expect(w.text()).toContain('Зона цели')
  })

  it('каждый переключатель пишет СВОЙ ключ и не трогает остальные настройки графиков', async () => {
    const w = mount(ChartMarkerPicker)
    await toggle(w, 'anim').trigger('click')
    expect(localStorage.getItem('chart_anim')).toBe('draw')
    await toggle(w, 'forecast').trigger('click')
    expect(localStorage.getItem('chart_forecast')).toBe('trend')
    await toggle(w, 'goalzone').trigger('click')
    expect(localStorage.getItem('chart_goalzone')).toBe('on')
    expect(toggle(w, 'goalzone').attributes('aria-checked')).toBe('true')
    expect(w.find('[data-testid="extra-goalzone"]').attributes('data-active')).toBe('true')
    for (const k of ['chart_line', 'chart_marker', 'chart_kind']) expect(localStorage.getItem(k), k).toBeNull()
  })

  it('повторное нажатие выключает; сохранённое состояние подхватывается при открытии', async () => {
    localStorage.setItem('chart_forecast', 'trend')
    const w = mount(ChartMarkerPicker)
    expect(toggle(w, 'forecast').attributes('aria-checked')).toBe('true')
    await toggle(w, 'forecast').trigger('click')
    expect(localStorage.getItem('chart_forecast')).toBe('off')
    expect(toggle(w, 'forecast').attributes('aria-checked')).toBe('false')
  })

  it('без хранилища — сообщение, переключатель не меняется', async () => {
    const w = mount(ChartMarkerPicker)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      await toggle(w, 'goalzone').trigger('click')
    } finally {
      spy.mockRestore()
    }
    expect(w.find('[data-testid="extras-save-error"]').exists()).toBe(true)
    expect(toggle(w, 'goalzone').attributes('aria-checked')).toBe('false')
  })
})

describe('Вид графика «Линия / Столбцы» в «Кастомизации» (BACKLOG 55.2 срез 7)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('четыре карточки с живым предпросмотром; по умолчанию «Линия»; у «Столбцов» — скруглённые столбцы и нулевая линия', () => {
    const w = mount(ChartMarkerPicker)
    expect(w.findAll('[data-testid^="kind-"][data-active]')).toHaveLength(4)
    expect(w.find('[data-testid="kind-line"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="kind-bars"]').text()).toContain('Столбцы')
    expect(w.find('[data-testid="kind-bars"] svg').findAll('path').length).toBe(6)
    expect(w.find('[data-testid="kind-bars"] svg').html()).toContain('Q')
    expect(w.find('[data-testid="kind-line"] svg').findAll('circle')).toHaveLength(6)
  })

  it('выбор «Столбцы» пишет chart_kind, не трогая остальные настройки графиков; кнопка выбранного отключена', async () => {
    const w = mount(ChartMarkerPicker)
    await w.find('[data-testid="kind-bars"] [data-testid="kind-choose"]').trigger('click')
    expect(localStorage.getItem('chart_kind')).toBe('bars')
    expect(w.find('[data-testid="kind-bars"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="kind-bars"] button').attributes('disabled')).toBeDefined()
    for (const k of ['chart_line', 'chart_marker', 'chart_anim', 'chart_forecast']) expect(localStorage.getItem(k), k).toBeNull()
  })

  it('без хранилища — сообщение, выбор не меняется', async () => {
    const w = mount(ChartMarkerPicker)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      await w.find('[data-testid="kind-bars"] [data-testid="kind-choose"]').trigger('click')
    } finally {
      spy.mockRestore()
    }
    expect(w.find('[data-testid="kind-save-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="kind-line"]').attributes('data-active')).toBe('true')
  })
})
