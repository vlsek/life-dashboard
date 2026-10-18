import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { CHART_MARKERS, CHART_MARKER_KEY, DEFAULT_CHART_MARKER, markerDefs, markerParts, nextMarkerUid, previewSlices, readChartMarker, writeChartMarker } from './chartMarker'
import ChartBlock from '../components/ChartBlock.vue'

const slices = previewSlices([5, 3, 2], 10, 10, 6.5)
const pts = [
  { date: '2026-10-01', y: 10, shares: [{ label: null, reps: 6 }, { label: 'алмазные', reps: 4 }] },
  { date: '2026-10-02', y: 12, shares: [{ label: null, reps: 12 }] },
  { date: '2026-10-03', y: 9, shares: [{ label: 'алмазные', reps: 9 }] },
]
const mountChart = () => mount(ChartBlock, { props: { title: 'Отжимания', points: pts, variations: ['алмазные'], color: '#5b8def' } })

describe('chartMarker: стили маркеров-мини-диаграмм (BACKLOG 13:54)', () => {
  beforeEach(() => localStorage.clear())

  it('шесть стилей; по умолчанию прежний плоский; мусор в хранилище игнорируется', () => {
    expect([...CHART_MARKERS]).toEqual(['flat', 'glass', 'drop', 'outline', 'sticker', 'neon'])
    expect(DEFAULT_CHART_MARKER).toBe('flat')
    expect(readChartMarker()).toBe('flat')
    localStorage.setItem(CHART_MARKER_KEY, 'glass')
    expect(readChartMarker()).toBe('glass')
    localStorage.setItem(CHART_MARKER_KEY, 'nonsense')
    expect(readChartMarker()).toBe('flat')
    expect(writeChartMarker('drop')).toBe(true)
    expect(readChartMarker()).toBe('drop')
  })

  it('flat — ровно прежняя разметка: сектора с обводкой цвета карточки', () => {
    const s = markerParts('flat', slices, 10, 10, 6.5, 'u')
    expect(s.match(/<path /g)).toHaveLength(3)
    expect(s).toContain('stroke="var(--bg-card)" stroke-width="1"')
    expect(s).not.toContain('url(#')
  })

  it('у каждого стиля свой узнаваемый признак; градиенты — только у стекла и капли и с id графика', () => {
    expect(markerParts('glass', slices, 10, 10, 6.5, 'u7')).toContain('url(#u7-gl)')
    expect(markerParts('glass', slices, 10, 10, 6.5, 'u7')).toContain('fill-opacity=".72"')
    expect(markerParts('drop', slices, 10, 10, 6.5, 'u7')).toContain('url(#u7-dr)')
    expect(markerParts('drop', slices, 10, 10, 6.5, 'u7')).toContain('<ellipse')
    expect(markerParts('outline', slices, 10, 10, 6.5, 'u7')).toContain('fill-opacity=".3"')
    expect(markerDefs('flat', 'u7')).toBe('')
    expect(markerDefs('outline', 'u7')).toBe('')
    expect(markerDefs('glass', 'u7')).toContain('id="u7-gl"')
    expect(markerDefs('drop', 'u7')).toContain('id="u7-dr"')
    expect(nextMarkerUid()).not.toBe(nextMarkerUid())
  })

  it('целый круг (один цвет) рисуется во всех стилях', () => {
    const one = previewSlices([7], 10, 10, 6.5)
    for (const st of CHART_MARKERS) expect(markerParts(st, one, 10, 10, 6.5, 'u'), st).toContain('<circle')
  })

  it('ChartBlock: по умолчанию плоские маркеры без defs; выбор «стекло» даёт defs с градиентом и стеклянные сектора', () => {
    const flat = mountChart()
    expect(flat.findAll('[data-test="pie-point"]')).toHaveLength(3)
    expect(flat.html()).not.toContain('radialGradient')
    localStorage.setItem(CHART_MARKER_KEY, 'glass')
    const glass = mountChart()
    expect(glass.findAll('[data-test="pie-point"]')).toHaveLength(3)
    expect(glass.html()).toContain('radialGradient')
    expect(glass.find('[data-test="pie-point"]').html()).toContain('fill-opacity=".72"')
  })

  it('два графика на странице не делят id градиентов', () => {
    localStorage.setItem(CHART_MARKER_KEY, 'drop')
    const ids = [mountChart(), mountChart()].map((w) => w.html().match(/id="(cm\d+-dr)"/)![1])
    expect(ids[0]).not.toBe(ids[1])
  })
})

// Правило владельца «новые предметы в малые разделы»: «Наклейка» и «Неон» (бесплатные, чистые строки SVG, без фильтров)
describe('chartMarker: «Наклейка» и «Неон»', () => {
  it('наклейка: белая кайма и тень под ней, сектора плотные, блик; нет <defs>', () => {
    const g = markerParts('sticker', slices, 10, 10, 6.5, 'u9')
    expect(g).toContain('r="8.4"') // кайма: r + 1.9
    expect(g).toContain('fill="var(--bg-card)"')
    expect(g).toContain('opacity=".18"') // тень
    expect(g).not.toContain('url(#')
    expect(markerDefs('sticker', 'u9')).toBe('')
    expect((g.match(/<path /g) ?? []).length).toBe(slices.length)
  })
  it('неон: два ореола, полупрозрачные сектора с обводкой цвета, ядро; нет <defs>', () => {
    const g = markerParts('neon', slices, 10, 10, 6.5, 'u9')
    expect(g).toContain('r="9.7"') // внешний ореол: r + 3.2
    expect(g).toContain('fill-opacity=".22"')
    expect(g).toContain('r="1.5"') // ядро
    expect(markerDefs('neon', 'u9')).toBe('')
    expect((g.match(/<path /g) ?? []).length).toBe(slices.length)
  })
  it('целый круг (один цвет) рисуется без path у обоих стилей; пустой список — пустая строка', () => {
    const one = previewSlices([7], 10, 10, 6.5)
    for (const st of ['sticker', 'neon'] as const) {
      expect(markerParts(st, one, 10, 10, 6.5, 'u')).not.toContain('<path')
      expect(markerParts(st, [], 10, 10, 6.5, 'u')).toBe('')
    }
  })
  it('все шесть стилей рисуют по-разному', () => {
    const outs = (['flat', 'glass', 'drop', 'outline', 'sticker', 'neon'] as const).map((st) => markerParts(st, slices, 10, 10, 6.5, 'u'))
    expect(new Set(outs).size).toBe(6)
  })
  it('график рисует выбранный стиль: «Неон» и «Наклейка» из localStorage', () => {
    localStorage.setItem(CHART_MARKER_KEY, 'neon')
    expect(mountChart().html()).toContain('r="1.5"')
    localStorage.setItem(CHART_MARKER_KEY, 'sticker')
    expect(mountChart().html()).toContain('stroke="var(--border)"')
  })
})
