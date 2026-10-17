import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { CHART_GOALZONE_KEY, CHART_GOALZONES, DEFAULT_CHART_GOALZONE, goalZoneSpan, readChartGoalZone, writeChartGoalZone, CHART_KIND_KEY, CHART_KINDS, DEFAULT_CHART_KIND, barPath, readChartKind, stackSpans, writeChartKind, CHART_ANIMS, CHART_ANIM_KEY, CHART_FORECAST_KEY, CHART_FORECASTS, CHART_LINES, CHART_LINE_KEY, DEFAULT_CHART_ANIM, DEFAULT_CHART_FORECAST, DEFAULT_CHART_LINE, FORECAST_DAYS, addDaysIso, lineDefs, monotonePath, readChartAnim, readChartForecast, readChartLine, runParts, trendForecast, writeChartAnim, writeChartForecast, writeChartLine, type Pt } from './chartLine'
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

describe('прогноз вперёд (BACKLOG 55.2 срез 6)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const line = (ys: number[]): Pt[] => ys.map((y, i) => [i, y])

  it('два режима; по умолчанию «off»; мусор игнорируется; запись работает', () => {
    expect([...CHART_FORECASTS]).toEqual(['off', 'trend'])
    expect(DEFAULT_CHART_FORECAST).toBe('off')
    expect(readChartForecast()).toBe('off')
    localStorage.setItem(CHART_FORECAST_KEY, 'zzz')
    expect(readChartForecast()).toBe('off')
    expect(writeChartForecast('trend')).toBe(true)
    expect(readChartForecast()).toBe('trend')
    expect(FORECAST_DAYS).toBe(3)
  })

  it('точный линейный ряд продолжается точно, от последней реальной точки', () => {
    expect(trendForecast(line([0, 2, 4, 6, 8, 10]), 5, 3)).toEqual([12, 14, 16])
    expect(trendForecast(line([20, 18, 16, 14, 12]), 4, 3)).toEqual([10, 8, 6])
  })

  it('плоский ряд даёт плоский прогноз; шум не ломает расчёт', () => {
    expect(trendForecast(line([5, 5, 5, 5, 5]), 4, 3)).toEqual([5, 5, 5])
    const f = trendForecast(line([10, 12, 9, 13, 11, 14, 12, 15]), 7, 3)!
    expect(f).toHaveLength(3)
    expect(f[2]).toBeGreaterThan(f[0]) // восходящий тренд
    expect(f[0]).toBeGreaterThan(15) // продолжается от последней точки вверх
  })

  it('неотрицательные данные не уходят в минус; данные с отрицательными значениями — уходят', () => {
    expect(trendForecast(line([8, 6, 4, 2, 1]), 4, 3)!.every((v) => v >= 0)).toBe(true)
    expect(trendForecast(line([8, 6, 4, 2, 1]), 4, 3)).toEqual([0, 0, 0])
    expect(trendForecast(line([4, 2, 0, -2, -4]), 4, 3)).toEqual([-6, -8, -10])
  })

  it('дни с пропусками: шаг считается по номерам дней, а не по числу точек', () => {
    expect(trendForecast([[0, 0], [2, 4], [4, 8], [6, 12]], 6, 3)).toEqual([14, 16, 18])
  })

  it('мало данных (<4 точек) или данные остыли (последняя точка старше 2 дней) — прогноза нет', () => {
    expect(trendForecast(line([1, 2, 3]), 2, 3)).toBeNull()
    expect(trendForecast(line([1, 2, 3, 4]), 6, 3)).toBeNull() // последняя точка — день 3, график до дня 6
    expect(trendForecast(line([1, 2, 3, 4]), 5, 3)).not.toBeNull() // разрыв 2 дня — ещё можно
  })

  it('учитываются только последние 14 точек', () => {
    const ys = [...Array(10).fill(100), ...line([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]).map(([, y]) => y)]
    expect(trendForecast(line(ys), ys.length - 1, 3)).toEqual([14, 15, 16])
  })

  it('addDaysIso: переходы через конец месяца и года', () => {
    expect(addDaysIso('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysIso('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('ChartBlock: по умолчанию прогноза нет', () => {
    const html = mountChart([4, 6, 8, 10, 12]).find('[data-test="chart-svg"]').html()
    expect(html).not.toContain('chart-forecast')
    expect(html).not.toContain('прогноз')
  })

  it('ChartBlock с chart_forecast=trend: пунктир, пустой кружок и подпись «прогноз», шаг по X сжимается, сводка упоминает прогноз', () => {
    const base = mountChart([4, 6, 8, 10, 12])
    const x0 = Number(base.find('[data-test="chart-svg"] circle').attributes('cx'))
    const x1base = Number(base.findAll('[data-test="chart-svg"] circle')[1].attributes('cx'))
    localStorage.setItem(CHART_FORECAST_KEY, 'trend')
    const w = mountChart([4, 6, 8, 10, 12])
    const svg = w.find('[data-test="chart-svg"]')
    expect(svg.find('polyline[data-test="chart-forecast"]').exists()).toBe(true)
    expect(svg.html()).toContain('прогноз 18')
    const dots = svg.findAll('circle')
    expect(Number(dots[1].attributes('cx')) - Number(dots[0].attributes('cx'))).toBeLessThan(x1base - x0) // шаг уже: место под 3 дня прогноза
    const pts = svg.find('polyline[data-test="chart-forecast"]').attributes('points')!.split(' ')
    expect(pts).toHaveLength(4) // последняя реальная точка + 3 дня
    expect(Math.max(...pts.map((p) => Number(p.split(',')[0])))).toBeLessThanOrEqual(586) // не выходит за поле графика
    expect(w.find('[data-test="chart-summary"]').text()).toContain('прогноз')
  })

  it('ChartBlock с прогнозом: подсказка и клавиатура работают только по реальным точкам', async () => {
    localStorage.setItem(CHART_FORECAST_KEY, 'trend')
    const w = mountChart([4, 6, 8, 10, 12])
    const svgEl = w.find('[data-test="chart-svg"]')
    await svgEl.trigger('keydown', { key: 'End' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain(': 12')
    await svgEl.trigger('keydown', { key: 'ArrowRight' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain(': 12') // дальше реальных точек не уходит
  })

  it('ChartBlock: мало точек — прогноза нет даже при включённой опции', () => {
    localStorage.setItem(CHART_FORECAST_KEY, 'trend')
    expect(mountChart([4, 6, 8]).find('[data-test="chart-svg"]').html()).not.toContain('chart-forecast')
  })
})

describe('столбчатый вид графика (BACKLOG 55.2 срез 7)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const barTop = (html: string): number[] => [...html.matchAll(/data-test="bar-point"[^>]*d="[^"]*?Q[\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]))

  it('четыре вида (срез 7в добавил «dots» и «lollipop»); по умолчанию «line»; мусор игнорируется; запись работает', () => {
    expect([...CHART_KINDS]).toEqual(['line', 'bars', 'dots', 'lollipop'])
    expect(DEFAULT_CHART_KIND).toBe('line')
    expect(readChartKind()).toBe('line')
    localStorage.setItem(CHART_KIND_KEY, 'pie')
    expect(readChartKind()).toBe('line')
    expect(writeChartKind('bars')).toBe(true)
    expect(readChartKind()).toBe('bars')
  })

  it('barPath: скруглены только верхние углы; низкий столбец не разворачивается', () => {
    expect(barPath(50, 20, 10, 60, 4)).toBe('M40 60V14Q40 10 44 10H56Q60 10 60 14V60Z')
    expect(barPath(50, 20, 58, 60, 4)).toBe('M40 60V60Q40 58 42 58H58Q60 58 60 60V60Z') // высота 2 → радиус 2
    expect(barPath(50, 6, 10, 60, 4)).toContain('Q47 10 50 10') // радиус не больше половины ширины
  })

  it('stackSpans: сегменты снизу вверх, сумма высот = высота столбца, нулевые пропущены', () => {
    expect(stackSpans([2, 1, 1], 0, 40)).toEqual([[20, 40], [10, 20], [0, 10]])
    expect(stackSpans([3, 0, 1], 0, 40)).toEqual([[10, 40], null, [0, 10]])
    expect(stackSpans([0, 0], 0, 40)).toEqual([null, null])
  })

  it('по умолчанию столбцов нет; с chart_kind=bars — по столбцу на день с данными (пропуск без столбца)', () => {
    expect(mountChart([4, 6, null, 8]).find('[data-test="chart-svg"]').findAll('[data-test="bar-point"]')).toHaveLength(0)
    localStorage.setItem(CHART_KIND_KEY, 'bars')
    const svg = mountChart([4, 6, null, 8]).find('[data-test="chart-svg"]')
    expect(svg.findAll('[data-test="bar-point"]')).toHaveLength(3)
    expect(svg.findAll('circle')).toHaveLength(0) // ни точек, ни линий
    expect(svg.html()).not.toContain('stroke-linecap')
  })

  it('столбцы растут от НУЛЯ: ряд 100…110 не превращается в «башню против пенька»', () => {
    localStorage.setItem(CHART_KIND_KEY, 'bars')
    const w = mountChart([100, 105, 110, 102])
    const html = w.find('[data-test="chart-svg"]').html()
    const tops = barTop(html)
    expect(tops).toHaveLength(4)
    const base = Number(html.match(/data-test="bar-point"[^>]*d="M[\d.]+ ([\d.]+)/)![1])
    const heights = tops.map((y) => base - y)
    expect(Math.min(...heights) / Math.max(...heights)).toBeGreaterThan(0.85)
    expect(base).toBeGreaterThan(100) // основание — нулевая линия ВНУТРИ поля графика (высота 160, нижний отступ 34), а не где-то за ним
    expect(base).toBeLessThanOrEqual(126.5)
    expect(tops[2]).toBeLessThan(tops[0]) // 110 выше 100
  })

  it('метрика с особенностями: составной столбец — сегмент на каждую особенность, цвета разные', () => {
    localStorage.setItem(CHART_KIND_KEY, 'bars')
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
    const bars = w.findAll('[data-test="chart-svg"] g[data-test="bar-point"]')
    expect(bars).toHaveLength(2)
    const first = bars[0].findAll('path')
    expect(first).toHaveLength(2)
    expect(first[0].attributes('fill')).not.toBe(first[1].attributes('fill'))
    expect(bars[1].findAll('path')).toHaveLength(1)
    expect(bars[0].find('title').text()).toContain('алмазные')
  })

  it('в столбцах прогноза нет, даже если он включён; подсказка, клавиатура и таблица работают', async () => {
    localStorage.setItem(CHART_KIND_KEY, 'bars')
    localStorage.setItem(CHART_FORECAST_KEY, 'trend')
    const w = mountChart([4, 6, 8, 10, 12])
    expect(w.find('[data-test="chart-svg"]').html()).not.toContain('chart-forecast')
    await w.find('[data-test="chart-svg"]').trigger('keydown', { key: 'End' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain(': 12')
    expect(w.findAll('[data-test="chart-table"] tbody tr')).toHaveLength(5)
    expect(w.find('[data-test="chart-summary"]').text()).not.toContain('прогноз')
  })

  it('анимация появления: у столбцов класс ch-bar, CSS растит от основания и гасится reduced-motion / «Отключить анимации»', () => {
    localStorage.setItem(CHART_KIND_KEY, 'bars')
    localStorage.setItem(CHART_ANIM_KEY, 'draw')
    const svg = mountChart([4, 6, 8]).find('[data-test="chart-svg"]')
    expect(svg.classes()).toContain('chart-draw')
    expect(svg.find('.ch-bar').exists()).toBe(true)
    const css: string = readFileSync('src/style.css', 'utf-8')
    expect(css).toMatch(/\.chart-draw \.ch-bar \{[^}]*transform-origin: 50% 100%; animation: ch-grow /)
    expect(css).toContain('@keyframes ch-grow')
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.chart-draw \.ch-bar \{ animation: none; \}/)
    expect(css).toContain("html[data-motion='off'] .chart-draw .ch-bar { animation: none; }")
  })
})

describe('столбцы и линия цели (BACKLOG 55.2 срез 7)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const withGoal = () => mount(ChartBlock, { props: { title: 'T', unit: ' раз', goalValue: 8, goalLabel: 'цель 8', points: pts([4, 6, 8, 10]) } })

  it('у линейного графика цель рисуется ДО линий, у столбцов — ПОСЛЕ них (поверх), с контуром у подписи', () => {
    const line = withGoal().find('[data-test="chart-svg"]').html()
    expect(line.indexOf('stroke-dasharray="5,4"')).toBeLessThan(line.indexOf('<circle'))
    expect(line).not.toContain('paint-order')
    localStorage.setItem(CHART_KIND_KEY, 'bars')
    const bars = withGoal().find('[data-test="chart-svg"]').html()
    expect(bars.indexOf('stroke-dasharray="5,4"')).toBeGreaterThan(bars.lastIndexOf('data-test="bar-point"'))
    expect(bars).toMatch(/цель 8<\/text>/)
    expect(bars).toContain('paint-order="stroke"')
  })
})

describe('зона цели (BACKLOG 55.2 срез 8)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const goalChart = (dir: 'at_least' | 'at_most' | null, goal: number | null = 8) =>
    mount(ChartBlock, { props: { title: 'T', unit: ' раз', goalValue: goal, goalLabel: goal != null ? 'цель' : null, goalDirection: dir, points: pts([4, 6, 8, 10]) } })
  const zone = (w: ReturnType<typeof mount>) => w.find('[data-test="goal-zone"]')

  it('два режима; по умолчанию «off»; мусор игнорируется; запись работает', () => {
    expect([...CHART_GOALZONES]).toEqual(['off', 'on'])
    expect(DEFAULT_CHART_GOALZONE).toBe('off')
    expect(readChartGoalZone()).toBe('off')
    localStorage.setItem(CHART_GOALZONE_KEY, 'zzz')
    expect(readChartGoalZone()).toBe('off')
    expect(writeChartGoalZone('on')).toBe(true)
    expect(readChartGoalZone()).toBe('on')
  })

  it('goalZoneSpan: «не меньше» — выше цели, «меньше» — ниже; нет направления — нет зоны; цель вне поля обрезается', () => {
    expect(goalZoneSpan(80, 'at_least', 34, 126)).toEqual([34, 80])
    expect(goalZoneSpan(80, 'at_most', 34, 126)).toEqual([80, 126])
    expect(goalZoneSpan(80, null, 34, 126)).toBeNull()
    expect(goalZoneSpan(80, 'bogus', 34, 126)).toBeNull()
    expect(goalZoneSpan(10, 'at_least', 34, 126)).toBeNull() // цель выше поля: «выше цели» — пусто
    expect(goalZoneSpan(10, 'at_most', 34, 126)).toEqual([34, 126]) // «ниже цели» — всё поле
    expect(goalZoneSpan(200, 'at_least', 34, 126)).toEqual([34, 126])
  })

  it('по умолчанию зоны нет даже при цели и направлении', () => {
    expect(zone(goalChart('at_least')).exists()).toBe(false)
  })

  it('on + «не меньше»: полоса от верха поля до цели; «меньше»: от цели до низа; цвет мягкий зелёный', () => {
    localStorage.setItem(CHART_GOALZONE_KEY, 'on')
    const up = zone(goalChart('at_least'))
    expect(up.exists()).toBe(true)
    const upY = Number(up.attributes('y'))
    const upH = Number(up.attributes('height'))
    expect(upY).toBe(34)
    const down = zone(goalChart('at_most'))
    expect(Number(down.attributes('y'))).toBeCloseTo(upY + upH, 0) // нижняя зона начинается там, где кончается верхняя: у цели
    expect(Number(down.attributes('y')) + Number(down.attributes('height'))).toBeCloseTo(126, 0)
    expect(up.attributes('fill')).toBe('#4cc38a')
    expect(Number(up.attributes('fill-opacity'))).toBeLessThan(0.2)
  })

  it('нет направления или нет цели — зоны нет, даже при включённой настройке', () => {
    localStorage.setItem(CHART_GOALZONE_KEY, 'on')
    expect(zone(goalChart(null)).exists()).toBe(false)
    expect(zone(goalChart('at_least', null)).exists()).toBe(false)
  })

  it('зона рисуется ПОД линией и пунктиром цели; у столбцов — под столбцами', () => {
    localStorage.setItem(CHART_GOALZONE_KEY, 'on')
    const line = goalChart('at_least').find('[data-test="chart-svg"]').html()
    expect(line.indexOf('goal-zone')).toBeLessThan(line.indexOf('stroke-dasharray="5,4"'))
    expect(line.indexOf('goal-zone')).toBeLessThan(line.indexOf('<circle'))
    localStorage.setItem(CHART_KIND_KEY, 'bars')
    const bars = goalChart('at_least').find('[data-test="chart-svg"]').html()
    expect(bars.indexOf('goal-zone')).toBeLessThan(bars.indexOf('data-test="bar-point"'))
  })
})
