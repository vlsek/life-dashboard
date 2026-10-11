import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { CHART_ANIMS, CHART_ANIM_KEY, CHART_LINES, CHART_LINE_KEY, DEFAULT_CHART_ANIM, DEFAULT_CHART_LINE, lineDefs, monotonePath, readChartAnim, readChartLine, runParts, writeChartAnim, writeChartLine, type Pt } from './chartLine'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import ChartBlock from '../components/ChartBlock.vue'

// Разбор «M x y C c1x c1y c2x c2y x y …» в точки Безье.
function bezier(d: string): number[][] {
  return d.split('C').slice(1).map((s) => s.trim().split(/\s+/).map(Number))
}
// Значение Y кубической кривой в t.
const cy = (p0: number, p1: number, p2: number, p3: number, t: number) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3

const pts = (ys: (number | null)[]) => ys.map((y, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, y }))
const mountChart = (ys: (number | null)[]) => mount(ChartBlock, { props: { title: 'T', points: pts(ys), unit: '', color: '#5b8def' } })

describe('chartLine: стили линии графика (BACKLOG 55.2 срез 3)', () => {
  beforeEach(() => localStorage.clear())

  it('три стиля; по умолчанию прежняя «обычная»; мусор в хранилище игнорируется', () => {
    expect([...CHART_LINES]).toEqual(['line', 'smooth', 'area'])
    expect(DEFAULT_CHART_LINE).toBe('line')
    expect(readChartLine()).toBe('line')
    localStorage.setItem(CHART_LINE_KEY, 'area')
    expect(readChartLine()).toBe('area')
    localStorage.setItem(CHART_LINE_KEY, 'zzz')
    expect(readChartLine()).toBe('line')
    expect(writeChartLine('smooth')).toBe(true)
    expect(readChartLine()).toBe('smooth')
  })

  it('сглаживание НЕ выдумывает пиков: между соседними точками кривая не выходит за их значения (монотонность)', () => {
    const series: Pt[][] = [
      [[0, 100], [50, 20], [100, 20], [150, 90], [200, 10]],
      [[0, 50], [40, 52], [80, 49], [120, 51]],
      [[0, 10], [10, 100], [20, 12], [30, 98], [40, 11]],
      [[0, 80], [60, 80], [120, 30], [180, 30]],
      [[0, 100], [10, 10], [20, 50]], // резкий несимметричный минимум: среднее наклонов далеко от нуля
      [[0, 10], [10, 90], [60, 70], [70, 5]],
    ]
    for (const s of series) {
      const segs = bezier(monotonePath(s))
      expect(segs).toHaveLength(s.length - 1)
      segs.forEach((c, i) => {
        const lo = Math.min(s[i][1], s[i + 1][1])
        const hi = Math.max(s[i][1], s[i + 1][1])
        for (let k = 0; k <= 20; k++) {
          const y = cy(s[i][1], c[1], c[3], c[5], k / 20)
          expect(y).toBeGreaterThanOrEqual(lo - 0.05)
          expect(y).toBeLessThanOrEqual(hi + 0.05)
        }
      })
    }
  })

  it('путь проходит ровно через заданные точки; одна точка — только M', () => {
    const s: Pt[] = [[10, 40], [60, 20], [110, 30]]
    const d = monotonePath(s)
    expect(d.startsWith('M10 40')).toBe(true)
    expect(d.endsWith('110 30')).toBe(true)
    expect(monotonePath([[5, 5]])).toBe('M5 5')
    expect(monotonePath([])).toBe('')
  })

  it('defs с градиентом только у «area»; runParts: line — пусто, smooth — линия, area — область и линия', () => {
    expect(lineDefs('line', 'u', '#fff')).toBe('')
    expect(lineDefs('smooth', 'u', '#fff')).toBe('')
    expect(lineDefs('area', 'u1', '#5b8def')).toContain('id="u1-ar"')
    const run: Pt[] = [[0, 10], [20, 5], [40, 8]]
    expect(runParts('line', run, '#5b8def', 100, 'u')).toBe('')
    expect(runParts('smooth', [[1, 1]], '#5b8def', 100, 'u')).toBe('')
    expect(runParts('smooth', run, '#5b8def', 100, 'u').match(/<path /g)).toHaveLength(1)
    const area = runParts('area', run, '#5b8def', 100, 'u')
    expect(area.match(/<path /g)).toHaveLength(2)
    expect(area).toContain('fill="url(#u-ar)"')
    expect(area).toContain('L40 100L0 100Z')
  })

  it('ChartBlock: «обычная» — как раньше (отрезки <line>, без path-линий)', () => {
    const w = mountChart([10, 14, 8, 12])
    const html = w.find('[data-test="chart-svg"]').html()
    expect((html.match(/<line /g) ?? []).length).toBe(3)
    expect(html).not.toContain('stroke-linecap')
    expect(html).not.toContain('linearGradient')
  })

  it('ChartBlock: «сглаженная» — одна кривая вместо отрезков, без градиента', () => {
    localStorage.setItem(CHART_LINE_KEY, 'smooth')
    const html = mountChart([10, 14, 8, 12]).find('[data-test="chart-svg"]').html()
    expect((html.match(/<line /g) ?? []).length).toBe(0)
    expect(html).toContain('stroke-linecap="round"')
    expect(html).not.toContain('linearGradient')
  })

  it('ChartBlock: «с областью» — градиент и заливка под линией', () => {
    localStorage.setItem(CHART_LINE_KEY, 'area')
    const html = mountChart([10, 14, 8, 12]).find('[data-test="chart-svg"]').html()
    expect(html).toContain('linearGradient')
    expect(html).toMatch(/fill="url\(#cm\d+-ar\)"/)
  })

  it('пропуски: два участка сглаживаются отдельно, мост через пропуск — прямой пунктир как раньше', () => {
    localStorage.setItem(CHART_LINE_KEY, 'smooth')
    const html = mountChart([10, 14, null, 8, 12, 9]).find('[data-test="chart-svg"]').html()
    expect((html.match(/stroke-linecap="round"/g) ?? []).length).toBe(2) // два участка
    expect((html.match(/<line [^>]*stroke-dasharray="5,4"/g) ?? []).length).toBe(1) // один пунктирный мост
  })

  it('два графика не делят id градиента области', () => {
    localStorage.setItem(CHART_LINE_KEY, 'area')
    const ids = [mountChart([1, 3, 2]), mountChart([1, 3, 2])].map((w) => w.html().match(/id="(cm\d+-ar)"/)![1])
    expect(ids[0]).not.toBe(ids[1])
  })
})

describe('анимация появления графика (BACKLOG 55.2 срез 4)', () => {
  beforeEach(() => localStorage.clear())

  it('два режима; по умолчанию «none»; мусор игнорируется; запись работает', () => {
    expect([...CHART_ANIMS]).toEqual(['none', 'draw'])
    expect(DEFAULT_CHART_ANIM).toBe('none')
    expect(readChartAnim()).toBe('none')
    localStorage.setItem(CHART_ANIM_KEY, 'bogus')
    expect(readChartAnim()).toBe('none')
    expect(writeChartAnim('draw')).toBe(true)
    expect(readChartAnim()).toBe('draw')
  })

  it('ChartBlock по умолчанию БЕЗ класса анимации; с chart_anim=draw — класс chart-draw, линии с pathLength, мост через пропуск отдельным классом', () => {
    const plain = mountChart([10, 14, null, 8, 12])
    expect(plain.find('[data-test="chart-svg"]').classes()).not.toContain('chart-draw')
    localStorage.setItem(CHART_ANIM_KEY, 'draw')
    const w = mountChart([10, 14, null, 8, 12])
    const svg = w.find('[data-test="chart-svg"]')
    expect(svg.classes()).toContain('chart-draw')
    expect(svg.findAll('.ch-line').length).toBeGreaterThanOrEqual(2)
    expect(svg.html()).toContain('pathLength="1"')
    expect(svg.findAll('.ch-bridge')).toHaveLength(1)
  })

  it('«сглаженная с областью» + draw: путь линии и область помечены для анимации', () => {
    localStorage.setItem(CHART_LINE_KEY, 'area')
    localStorage.setItem(CHART_ANIM_KEY, 'draw')
    const svg = mountChart([10, 14, 8, 12]).find('[data-test="chart-svg"]')
    expect(svg.find('path.ch-line').exists()).toBe(true)
    expect(svg.find('path.ch-area').exists()).toBe(true)
  })

  it('CSS: линия рисуется через stroke-dashoffset, а при «уменьшить движение» и «Отключить анимации» всё видно сразу', () => {
    const css: string = readFileSync('src/style.css', 'utf-8')
    expect(css).toMatch(/\.chart-draw \.ch-line \{[^}]*stroke-dashoffset: 1; animation: ch-draw /)
    expect(css).toContain('@keyframes ch-draw')
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.chart-draw \.ch-line \{ animation: none; stroke-dashoffset: 0; \}/)
    expect(css).toMatch(/html\[data-motion='off'\] \.chart-draw \.ch-line \{ animation: none; stroke-dashoffset: 0; \}/)
    expect(css).toMatch(/html\[data-motion='off'\] \.chart-draw text,/)
  })
})
