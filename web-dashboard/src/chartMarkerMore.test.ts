import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartBlock from './components/ChartBlock.vue'
import { CHART_MARKERS, CHART_MARKER_KEY, markerDefs, markerParts, previewSlices } from './lib/chartMarker'

// BACKLOG 55.2 срез 7е: новые стили маркеров-диаграмм — «Кольцо» (ring) и «Мишень» (target).
const many = previewSlices([5, 3, 2], 10, 10, 6.5)
const one = previewSlices([7], 10, 10, 6.5)
const count = (s: string, re: RegExp) => (s.match(re) || []).length

describe('«Кольцо» (ring)', () => {
  it('те же сектора и отверстие цвета карточки в центре (радиус 0.46·r); defs не нужны', () => {
    const s = markerParts('ring', many, 10, 10, 6.5, 'u')
    expect(count(s, /<path /g)).toBe(3)
    expect(s).toContain('<circle cx="10.0" cy="10.0" r="3.0" fill="var(--bg-card)" />')
    expect(s.lastIndexOf('<circle')).toBeGreaterThan(s.lastIndexOf('<path')) // отверстие рисуется ПОСЛЕ секторов — поверх них
    expect(markerDefs('ring', 'u')).toBe('')
    expect(s).not.toContain('Gradient')
    expect(s).not.toContain('filter')
  })
  it('единственный цвет — целый круг с отверстием (бублик), а не пустота', () => {
    const s = markerParts('ring', one, 10, 10, 6.5, 'u')
    expect(count(s, /<circle /g)).toBe(2) // круг + отверстие
    expect(s).toContain('r="6.5" fill="#5b8def"')
  })
  it('нет секторов — пусто (как у остальных стилей)', () => {
    expect(markerParts('ring', [], 10, 10, 6.5, 'u')).toBe('')
  })
})

describe('«Мишень» (target)', () => {
  it('внешнее кольцо цвета первого сектора и группа с масштабом ×0.62 вокруг центра маркера; сектора внутри группы', () => {
    const s = markerParts('target', many, 10, 10, 6.5, 'u')
    expect(s).toContain('fill="none" stroke="#5b8def" stroke-width="1.2"')
    expect(s).toContain('<g transform="translate(10.0 10.0) scale(.62) translate(-10.0 -10.0)">')
    const g = s.slice(s.indexOf('<g '), s.indexOf('</g>'))
    expect(count(g, /<path /g)).toBe(3)
    expect(s.endsWith('</g>')).toBe(true)
    expect(markerDefs('target', 'u')).toBe('')
  })
  it('масштаб вокруг центра: центр (x,y) остаётся на месте (точка внутри маркера не уезжает на графике)', () => {
    const [x, y, k] = [123.4, 56.7, 0.62]
    // translate(x y) scale(k) translate(-x -y): центр → x + k·(x − x) = x
    const mapped = [x + k * (x - x), y + k * (y - y)]
    expect(mapped).toEqual([x, y])
    expect(markerParts('target', many, x, y, 6.5, 'u')).toContain(`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.62) translate(-${x.toFixed(1)} -${y.toFixed(1)})`)
  })
  it('единственный цвет: кольцо и круг внутри того же цвета', () => {
    const s = markerParts('target', one, 10, 10, 6.5, 'u')
    expect(count(s, /fill="#5b8def"/g)).toBe(1) // круг внутри группы
    expect(count(s, /stroke="#5b8def"/g)).toBe(1) // внешнее кольцо
  })
})

describe('все стили: единый контракт', () => {
  it('для каждого стиля есть непустая разметка на любых секторах; цвета секторов присутствуют', () => {
    for (const st of CHART_MARKERS) {
      const s = markerParts(st, many, 10, 10, 6.5, 'u')
      expect(s.length, st).toBeGreaterThan(20)
      for (const c of many) expect(s, st).toContain(c.color)
    }
  })
  it('flat по-прежнему РОВНО прежний (на нём держатся тесты и привычка)', () => {
    expect(markerParts('flat', one, 10, 10, 6.5, 'u')).toBe('<circle cx="10.0" cy="10.0" r="6.5" fill="#5b8def" stroke="var(--bg-card)" stroke-width="1.5" />')
  })
})

describe('ChartBlock с новыми стилями', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const pts = [
    { date: '2026-10-01', y: 10, shares: [{ label: null, reps: 6 }, { label: 'алмазные', reps: 4 }] },
    { date: '2026-10-02', y: 12, shares: [{ label: 'алмазные', reps: 12 }] },
  ]
  const mountChart = () => mount(ChartBlock, { props: { title: 'Отжимания', unit: ' раз', variations: ['алмазные'], points: pts } })
  it.each(['ring', 'target'] as const)('«%s»: у метрики с особенностями рисуются кружки-диаграммы этого стиля, подсказка с разбивкой на месте', (st) => {
    localStorage.setItem(CHART_MARKER_KEY, st)
    const w = mountChart()
    const marks = w.findAll('[data-test="pie-point"]')
    expect(marks).toHaveLength(2)
    expect(marks[0].find('title').text()).toContain('алмазные')
    if (st === 'ring') expect(marks[0].html()).toContain('r="3.0" fill="var(--bg-card)"')
    else expect(marks[0].html()).toContain('scale(.62)')
  })
  it('у метрики без особенностей маркеры прежние простые кружки — новые стили их не трогают', () => {
    localStorage.setItem(CHART_MARKER_KEY, 'target')
    const w = mount(ChartBlock, { props: { title: 'T', unit: '', points: [{ date: '2026-10-01', y: 4 }, { date: '2026-10-02', y: 6 }] } })
    expect(w.findAll('[data-test="pie-point"]')).toHaveLength(0)
    expect(w.find('[data-test="chart-svg"]').html()).not.toContain('scale(.62)')
  })
})
