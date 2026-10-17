import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartBlock from './components/ChartBlock.vue'
import { CHART_ANIM_KEY, CHART_LINE_KEY, monotonePath, runParts, stepPath, type Pt } from './lib/chartLine'

// BACKLOG 55.2 срез 7г: новые стили линии — «Ступени» (steps) и «Неон» (glow).
const pts = (ys: (number | null)[]) => ys.map((y, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, y }))
const mountChart = (ys: (number | null)[]) => mount(ChartBlock, { props: { title: 'T', points: pts(ys), unit: '', color: '#5b8def' } })
const svgOf = (w: ReturnType<typeof mountChart>) => w.find('[data-test="chart-svg"]')

describe('stepPath', () => {
  it('идём горизонтально до следующего замера и только там меняем высоту; одна точка — только «M»; пусто — пусто', () => {
    expect(stepPath([[10, 50], [40, 20], [70, 35]])).toBe('M10 50H40V20H70V35')
    expect(stepPath([[10, 50]])).toBe('M10 50')
    expect(stepPath([])).toBe('')
  })
  it('только прямые углы: ни одной кривой, ни одного косого отрезка', () => {
    const d = stepPath([[0, 10], [30, 90], [60, 40], [90, 40], [120, 5]])
    expect(d).not.toMatch(/[CQLSA]/)
    expect(d.match(/[MHV]/g)!.length).toBe(1 + 2 * 4)
  })
  it('честность: ступени не выходят за реальные значения (высоты на пути = высоты точек)', () => {
    const run: Pt[] = [[0, 70], [40, 22], [80, 55], [120, 31]]
    const ys = [...stepPath(run).matchAll(/[M ]?[\d.]+ ([\d.]+)|V([\d.]+)/g)].map((m) => Number(m[1] ?? m[2]))
    for (const y of ys) expect(run.map((p) => p[1])).toContain(y)
  })
})

describe('runParts: «steps» и «glow»', () => {
  const run: Pt[] = [[10, 40], [50, 15], [90, 30]]
  it('steps: одна линия-ступени, без области и свечения', () => {
    const g = runParts('steps', run, '#abc', 120, 'u')
    expect(g).toContain(`d="${stepPath(run)}"`)
    expect(g).toContain('class="ch-line"')
    expect(g).not.toContain('ch-area')
    expect(g).not.toContain('blur')
  })
  it('glow: размытый двойник под линией и сама монотонная кривая той же формы; свечение проявляется вместе с областью (класс ch-area)', () => {
    const g = runParts('glow', run, '#abc', 120, 'u')
    expect(g.match(/<path /g)).toHaveLength(2)
    expect(g.indexOf('ch-glow')).toBeLessThan(g.indexOf('class="ch-line"')) // свечение рисуется ДО линии — под ней
    expect(g).toContain('class="ch-area ch-glow"')
    expect(g).toContain('filter: blur(3px)')
    expect(g.split(`d="${monotonePath(run)}"`)).toHaveLength(3) // обе линии идут по одной и той же кривой
  })
  it('«line» по-прежнему ничего не рисует здесь (прежняя отрисовка отрезками в ChartBlock), а «area» — область без свечения', () => {
    expect(runParts('line', run, '#abc', 120, 'u')).toBe('')
    expect(runParts('area', run, '#abc', 120, 'u')).not.toContain('blur')
  })
})

describe('ChartBlock с новыми стилями', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  it('«Ступени»: линия из H/V, точки и подписи на месте, пропуск остаётся пунктирным прямым мостиком', () => {
    localStorage.setItem(CHART_LINE_KEY, 'steps')
    const svg = svgOf(mountChart([4, 9, null, 6, 12]))
    const paths = svg.findAll('path.ch-line').map((p) => p.attributes('d')!)
    expect(paths).toHaveLength(2) // два участка по обе стороны пропуска
    for (const d of paths) expect(d).toMatch(/^M[\d.]+ [\d.]+H[\d.]+V[\d.]+(H[\d.]+V[\d.]+)*$/)
    expect(svg.findAll('.ch-bridge')).toHaveLength(1) // мостик через пропуск
    expect(svg.findAll('circle')).toHaveLength(4)
  })
  it('«Неон»: на участок — свечение и линия; на участках по обе стороны пропуска свечения два', () => {
    localStorage.setItem(CHART_LINE_KEY, 'glow')
    const svg = svgOf(mountChart([4, 9, null, 6, 12]))
    expect(svg.findAll('path.ch-glow')).toHaveLength(2)
    expect(svg.findAll('path.ch-line')).toHaveLength(2)
  })
  it('анимация «draw»: линия рисуется, свечение проявляется (общее правило .ch-area), класс chart-draw на svg', () => {
    localStorage.setItem(CHART_LINE_KEY, 'glow')
    localStorage.setItem(CHART_ANIM_KEY, 'draw')
    const svg = svgOf(mountChart([4, 9, 6]))
    expect(svg.classes()).toContain('chart-draw')
    expect(svg.find('path.ch-glow').classes()).toContain('ch-area')
  })
  it('другие настройки не страдают: вид «столбцы» стили линии игнорирует', () => {
    localStorage.setItem(CHART_LINE_KEY, 'glow')
    localStorage.setItem('chart_kind', 'bars')
    const svg = svgOf(mountChart([4, 9, 6]))
    expect(svg.findAll('path.ch-glow')).toHaveLength(0)
    expect(svg.findAll('[data-test="bar-point"]')).toHaveLength(3)
  })
})
