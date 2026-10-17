import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricSpark from './components/MetricSpark.vue'
import { CHART_SPARK_STYLES, CHART_SPARK_STYLE_KEY, readChartSparkStyle, writeChartSparkStyle } from './lib/chartLine'
import { SPARK_H, SPARK_W, sparkInner, sparkShape } from './lib/sparkline'

// BACKLOG 55.2 срез 7д: вид мини-графика — линия (как было) / область / столбики / точки.
const V = [3, 5, null, 7, 6, 9, 8]
const count = (s: string, re: RegExp) => (s.match(re) || []).length

describe('реестр и хранение', () => {
  beforeEach(() => localStorage.clear())
  it('четыре вида, по умолчанию «line»; мусор в хранилище игнорируется; запись работает', () => {
    expect([...CHART_SPARK_STYLES]).toEqual(['line', 'area', 'bars', 'dots'])
    expect(readChartSparkStyle()).toBe('line')
    localStorage.setItem(CHART_SPARK_STYLE_KEY, 'neon')
    expect(readChartSparkStyle()).toBe('line')
    expect(writeChartSparkStyle('bars')).toBe(true)
    expect(readChartSparkStyle()).toBe('bars')
  })
})

describe('sparkInner', () => {
  it('«line» — ровно прежняя отрисовка (путь sparkShape + кружок на последней точке)', () => {
    const sh = sparkShape(V)!
    expect(sparkInner(V, 'line')).toBe(
      `<path d="${sh.d}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /><circle cx="${sh.last![0]}" cy="${sh.last![1]}" r="2" fill="var(--accent)" />`,
    )
    expect(sparkInner(V)).toBe(sparkInner(V, 'line')) // вид по умолчанию
  })
  it('меньше двух дней с данными — рисовать нечего (null) для любого вида', () => {
    for (const s of CHART_SPARK_STYLES) {
      expect(sparkInner([null, 5, null], s)).toBeNull()
      expect(sparkInner([], s)).toBeNull()
    }
  })
  it('«dots»: на каждый день с данными кружок, последний крупнее; ни линий, ни областей', () => {
    const s = sparkInner(V, 'dots')!
    expect(count(s, /<circle /g)).toBe(6)
    expect(s).not.toContain('<path')
    expect(s).toContain('r="2"') // последняя точка
    expect(count(s, /r="1.5"/g)).toBe(5)
    // ни одна точка не обрезается краем: центр отстоит от краёв не меньше радиуса
    for (const m of s.matchAll(/cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
      const [cx, cy, r] = [Number(m[1]), Number(m[2]), Number(m[3])]
      expect(cx - r).toBeGreaterThanOrEqual(0)
      expect(cx + r).toBeLessThanOrEqual(SPARK_W)
      expect(cy - r).toBeGreaterThanOrEqual(0)
      expect(cy + r).toBeLessThanOrEqual(SPARK_H)
    }
  })
  it('«bars»: столбик на каждый день с данными, у последнего непрозрачность 1; пропуск остаётся пропуском', () => {
    const s = sparkInner(V, 'bars')!
    expect(count(s, /<rect /g)).toBe(6)
    expect(count(s, /opacity="1"/g)).toBe(1)
    expect(s).not.toContain('<path')
  })
  it('«bars» растут ОТ НУЛЯ: ряд 100…110 не превращается в «высокий против низкого»; все столбики стоят на общей нулевой линии', () => {
    const rects = [...sparkInner([100, 105, 110, 102], 'bars')!.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])])
    expect(rects).toHaveLength(4)
    const bottoms = rects.map(([y, h]) => +(y + h).toFixed(1))
    expect(new Set(bottoms).size).toBe(1) // общая нижняя граница = нулевая линия
    const heights = rects.map(([, h]) => h)
    expect(Math.min(...heights) / Math.max(...heights)).toBeGreaterThan(0.85)
    // высота пропорциональна значению (110 к 100 — около 1.1), и всё лежит внутри поля графика
    expect(heights[2] / heights[0]).toBeGreaterThan(1.05)
    expect(heights[2] / heights[0]).toBeLessThan(1.15)
    for (const [y, h] of rects) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y + h).toBeLessThanOrEqual(SPARK_H)
    }
  })
  it('«bars» с отрицательными значениями: нулевая линия внутри поля, столбики вниз и вверх, все видимы (≥1 px) и в границах', () => {
    const s = sparkInner([-3, 4, -1, 6], 'bars')!
    const rects = [...s.matchAll(/y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])])
    expect(rects).toHaveLength(4)
    for (const [y, h] of rects) {
      expect(h).toBeGreaterThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y + h).toBeLessThanOrEqual(SPARK_H)
    }
  })
  it('«bars» не вылезают за ширину: все столбики внутри 0…SPARK_W', () => {
    for (const m of sparkInner([1, 2, 3, 4, 5, 6, 7], 'bars')!.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(0)
      expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(SPARK_W)
    }
  })
  it('«area»: область есть под каждым участком из ≥2 дней подряд; пропуск разрывает область; линия и кружок сверху', () => {
    const s = sparkInner(V, 'area')!
    const areas = s.match(/<path d="M[^"]*Z" fill="var\(--accent\)" opacity="0.18"/g) || []
    expect(areas).toHaveLength(2) // участки [3,5] и [7,6,9,8]
    expect(s.indexOf('opacity="0.18"')).toBeLessThan(s.indexOf('stroke-width="1.6"')) // область под линией
    expect(s).toContain('<circle')
  })
  it('«area»: одиночный день между пропусками области не имеет (только линия-точка), а ровный ряд рисуется по центру', () => {
    const s = sparkInner([4, null, 6, null, 5, 5], 'area')!
    expect((s.match(/opacity="0.18"/g) || []).length).toBe(1) // только участок [5,5]
    const flat = sparkInner([5, 5, 5], 'dots')!
    expect([...flat.matchAll(/cy="([\d.]+)"/g)].every((m) => Number(m[1]) === SPARK_H / 2)).toBe(true)
  })
})

describe('MetricSpark: рисует выбранный вид', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const mountSpark = () => mount(MetricSpark, { props: { values: V, unit: 'кг' } })
  it('по умолчанию линия (как раньше); класс вида на svg', () => {
    const w = mountSpark()
    expect(w.find('svg').classes()).toContain('spark-line')
    expect(w.findAll('path')).toHaveLength(1)
    expect(w.findAll('circle')).toHaveLength(1)
  })
  it.each([
    ['bars', 'rect', 6],
    ['dots', 'circle', 6],
    ['area', 'path', 3],
  ] as const)('вид «%s»: нужные элементы в разметке, подпись для скринридера и data-test сохранены', (style, tag, n) => {
    localStorage.setItem(CHART_SPARK_STYLE_KEY, style)
    const w = mountSpark()
    expect(w.find('[data-test="metric-spark"]').classes()).toContain('spark-' + style)
    expect(w.findAll(tag)).toHaveLength(n)
    expect(w.find('svg').attributes('aria-label')).toContain('минимум 3 кг')
  })
  it('меньше двух дней с данными — SVG не рисуется в любом виде', () => {
    localStorage.setItem(CHART_SPARK_STYLE_KEY, 'bars')
    expect(mount(MetricSpark, { props: { values: [null, 5, null] } }).find('svg').exists()).toBe(false)
  })
})
