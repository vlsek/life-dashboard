// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartBlock from './components/ChartBlock.vue'
import { CHART_ANIM_KEY, CHART_FORECAST_KEY, CHART_KIND_KEY, CHART_LINE_KEY, kindDrawsLine, kindFromZero } from './lib/chartLine'

// BACKLOG 55.2 срез 7в: новые виды графика — «Точки» (dots: только маркеры, без линии) и «Леденцы» (lollipop: стебель от нуля с кружком).
const pts = (ys: (number | null)[]) => ys.map((y, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, y }))
const mountChart = (ys: (number | null)[]) => mount(ChartBlock, { props: { title: 'T', points: pts(ys), unit: ' кг', color: '#5b8def' } })
const svgOf = (w: ReturnType<typeof mountChart>) => w.find('[data-test="chart-svg"]')

describe('какие виды что рисуют', () => {
  it('линию рисует только «line»; от нуля растут «bars» и «lollipop»', () => {
    expect(['line', 'bars', 'dots', 'lollipop'].map((k) => kindDrawsLine(k as never))).toEqual([true, false, false, false])
    expect(['line', 'bars', 'dots', 'lollipop'].map((k) => kindFromZero(k as never))).toEqual([false, true, false, true])
  })
})

describe('вид «Точки» (dots)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    localStorage.setItem(CHART_KIND_KEY, 'dots')
  })
  it('только маркеры и подписи: на каждый день с данными кружок, ни линий, ни пунктирных мостиков (пропуск остаётся пропуском)', () => {
    const svg = svgOf(mountChart([4, 6, null, 8]))
    expect(svg.findAll('circle')).toHaveLength(3)
    expect(svg.findAll('line.ch-line')).toHaveLength(0)
    expect(svg.findAll('.ch-bridge')).toHaveLength(0)
    expect(svg.html()).not.toContain('stroke-linecap')
    expect(svg.findAll('text').map((t) => t.text())).toContain('6 кг')
  })
  it('стили линии, область и прогноз к точкам не применяются, даже если включены', () => {
    localStorage.setItem(CHART_LINE_KEY, 'area')
    localStorage.setItem(CHART_FORECAST_KEY, 'trend')
    const html = svgOf(mountChart([4, 6, 8, 10])).html()
    expect(html).not.toContain('ch-area')
    expect(html).not.toContain('chart-forecast')
    expect(html).not.toContain('class="ch-line"')
  })
  it('шкала как у линии (не от нуля): ряд 100…110 растянут по высоте', () => {
    const ys = [...svgOf(mountChart([100, 110, 105])).html().matchAll(/<circle cx="[\d.]+" cy="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(60)
  })
  it('подсказка, клавиатура и таблица для скринридеров работают', async () => {
    const w = mountChart([4, 6, 8])
    await svgOf(w).trigger('keydown', { key: 'End' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain(': 8')
    expect(w.findAll('[data-test="chart-table"] tbody tr')).toHaveLength(3)
  })
})

describe('вид «Леденцы» (lollipop)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    localStorage.setItem(CHART_KIND_KEY, 'lollipop')
  })
  it('стебель и кружок на каждый день с данными, нулевая линия; столбцов и соединяющей линии нет', () => {
    const svg = svgOf(mountChart([4, 6, null, 8]))
    expect(svg.findAll('[data-test="lollipop-stem"]')).toHaveLength(3)
    expect(svg.findAll('[data-test="lollipop-point"]')).toHaveLength(3)
    expect(svg.findAll('[data-test="bar-point"]')).toHaveLength(0)
    expect(svg.findAll('line.ch-line')).toHaveLength(0)
    expect(svg.html()).toContain('stroke="var(--border)"') // основание — нулевая линия
  })
  it('шкала от НУЛЯ: стебли растут от общей нулевой линии, ряд 100…110 не превращается в «высокий против низкого»', () => {
    const html = svgOf(mountChart([100, 105, 110, 102])).html()
    const stems = [...html.matchAll(/data-test="lollipop-stem" x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])])
    expect(stems).toHaveLength(4)
    const base = stems[0][0]
    expect(stems.every(([y1]) => y1 === base)).toBe(true) // все стебли стоят на одной нулевой линии
    const heights = stems.map(([y1, y2]) => y1 - y2)
    expect(Math.min(...heights) / Math.max(...heights)).toBeGreaterThan(0.85)
    expect(base).toBeLessThanOrEqual(126.5) // нулевая линия внутри поля графика
  })
  it('прогноз и стили линии не применяются; подсказка работает', async () => {
    localStorage.setItem(CHART_FORECAST_KEY, 'trend')
    localStorage.setItem(CHART_LINE_KEY, 'smooth')
    const w = mountChart([4, 6, 8, 10, 12])
    expect(svgOf(w).html()).not.toContain('chart-forecast')
    await svgOf(w).trigger('keydown', { key: 'End' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain(': 12')
  })
  it('метрика с особенностями: вместо простого кружка — кружок-диаграмма с разбивкой в подсказке', () => {
    const w = mount(ChartBlock, {
      props: {
        title: 'Отжимания',
        unit: ' раз',
        variations: ['алмазные'],
        points: [
          { date: '2026-10-01', y: 10, shares: [{ label: null, reps: 6 }, { label: 'алмазные', reps: 4 }] },
          { date: '2026-10-02', y: 12, shares: [{ label: 'алмазные', reps: 12 }] },
        ],
      },
    })
    const svg = svgOf(w)
    expect(svg.findAll('[data-test="lollipop-stem"]')).toHaveLength(2)
    expect(svg.findAll('[data-test="pie-point"]')).toHaveLength(2)
    expect(svg.findAll('[data-test="pie-point"] title')[0].text()).toContain('алмазные')
  })
  it('цель рисуется поверх стеблей (после них), подпись цели с контуром цвета карточки', () => {
    const w = mount(ChartBlock, { props: { title: 'T', points: pts([4, 6, 8]), unit: '', color: '#5b8def', goalValue: 7 } })
    const html = svgOf(w).html()
    expect(html.lastIndexOf('stroke-dasharray="5,4"')).toBeGreaterThan(html.lastIndexOf('lollipop-stem'))
    expect(html).toContain('paint-order="stroke"')
  })
})

describe('анимация «draw» не ломается на новых видах (CSS гасится reduced-motion)', () => {
  it('у точек и леденцов есть кружки/подписи — их проявляет общее правило .chart-draw circle/text', () => {
    localStorage.setItem(CHART_ANIM_KEY, 'draw')
    for (const kind of ['dots', 'lollipop']) {
      localStorage.setItem(CHART_KIND_KEY, kind)
      expect(svgOf(mountChart([4, 6, 8])).classes()).toContain('chart-draw')
    }
    const css = readFileSync('src/style.css', 'utf-8')
    expect(css).toContain('.chart-draw circle')
  })
})
