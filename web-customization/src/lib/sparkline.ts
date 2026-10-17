// Мини-спарклайн (55.2 последний срез): значения за последние N дней → путь SVG. Чистые функции, без DOM.
// КОПИЯ лежит в web-customization/src/lib/ (предпросмотры видов) — менять ВМЕСТЕ (страж в web-customization/src/chartSparkStyle.test.ts).
import type { ChartSparkStyle } from './chartLine'

export const SPARK_DAYS = 7
export const SPARK_W = 64
export const SPARK_H = 20

// Ряд за n дней, оканчивающийся днём `end` (ISO): по дню — значение или null, если за день записи нет.
export function sparkWindow(byDate: Map<string, number | null>, end: string, n = SPARK_DAYS): (number | null)[] {
  const out: (number | null)[] = []
  const [y, m, d] = end.split('-').map(Number)
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d - i))
    const iso = dt.toISOString().slice(0, 10)
    out.push(byDate.get(iso) ?? null)
  }
  return out
}

export interface SparkShape {
  /** пути отрезков по подряд идущим дням с данными (пропуск разрывает линию) */
  d: string
  /** последняя точка с данными — для кружка */
  last: [number, number] | null
}

// Нужно хотя бы 2 дня с данными, иначе линии нет (null). Масштаб Y — по ряду; ровный ряд рисуется по центру.
export function sparkShape(values: (number | null)[], w = SPARK_W, h = SPARK_H, pad = 2): SparkShape | null {
  const have = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (have.length < 2) return null
  const min = Math.min(...have)
  const max = Math.max(...have)
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const yOf = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2))
  let d = ''
  let last: [number, number] | null = null
  let pen = false
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      pen = false
      return
    }
    const x = +(pad + i * stepX).toFixed(1)
    const y = +yOf(v).toFixed(1)
    d += (pen ? ' L' : (d ? ' M' : 'M')) + x + ' ' + y
    pen = true
    last = [x, y]
  })
  return { d, last }
}

const f1 = (v: number): number => +v.toFixed(1)

// Разметка (внутренность <svg>) мини-графика в выбранном виде (55.2 срез 7д); null — если дней с данными меньше двух.
// «line» — ровно прежняя отрисовка (sparkShape). Остальные виды используют те же координаты, пропуск дня остаётся пропуском:
//   area — под каждым участком из ≥2 подряд идущих дней мягкая область до нижней границы, поверх линия;
//   bars — столбики ОТ НУЛЯ (высота не врёт, как у столбцов большого графика), у последнего непрозрачность 1;
//   dots — только точки, последняя крупнее (радиусы не больше отступа от края — иначе крайняя точка обрезается); соединяющей линии нет.
export function sparkInner(values: (number | null)[], style: ChartSparkStyle = 'line', w = SPARK_W, h = SPARK_H, pad = 2): string | null {
  const shape = sparkShape(values, w, h, pad)
  if (!shape) return null
  const have = values.filter((v): v is number => v !== null && Number.isFinite(v))
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const xOf = (i: number) => f1(pad + i * stepX)
  const lineMarkup =
    `<path d="${shape.d}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />` +
    (shape.last ? `<circle cx="${shape.last[0]}" cy="${shape.last[1]}" r="2" fill="var(--accent)" />` : '')
  if (style === 'line') return lineMarkup
  const ok = (v: number | null): v is number => v !== null && Number.isFinite(v)
  if (style === 'bars') {
    const lo = Math.min(0, ...have)
    let hi = Math.max(0, ...have)
    if (hi === lo) hi = lo + 1
    const yOf = (v: number) => h - pad - ((v - lo) / (hi - lo)) * (h - pad * 2)
    const base = yOf(0)
    // Центры столбиков сдвинуты внутрь на полширины столбика, чтобы крайние не вылезали за поле (0…w): шаг считается по оставшейся ширине
    const n = values.length
    const bw = f1(Math.max(2, Math.min(7, ((w - pad * 2) / n) * 0.6)))
    const barStep = n > 1 ? (w - pad * 2 - bw) / (n - 1) : 0
    const lastIdx = values.map(ok).lastIndexOf(true)
    let out = ''
    values.forEach((v, i) => {
      if (!ok(v)) return
      const y = yOf(v)
      const top = Math.min(y, base)
      out += `<rect x="${f1(pad + i * barStep)}" y="${f1(top)}" width="${bw}" height="${f1(Math.max(1, Math.abs(base - y)))}" rx="1" fill="var(--accent)" opacity="${i === lastIdx ? 1 : 0.8}" />`
    })
    return out
  }
  const min = Math.min(...have)
  const max = Math.max(...have)
  const yOf = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2))
  if (style === 'dots') {
    const lastIdx = values.map(ok).lastIndexOf(true)
    let out = ''
    values.forEach((v, i) => {
      if (!ok(v)) return
      out += `<circle cx="${xOf(i)}" cy="${f1(yOf(v))}" r="${i === lastIdx ? 2 : 1.5}" fill="var(--accent)" opacity="${i === lastIdx ? 1 : 0.85}" />`
    })
    return out
  }
  // area: области под участками без пропусков (≥2 дней подряд)
  let area = ''
  let run: [number, number][] = []
  const flush = () => {
    if (run.length >= 2) {
      const base = f1(h - pad)
      area += `<path d="M${run[0][0]} ${base}${run.map(([x, y]) => ` L${x} ${y}`).join('')} L${run[run.length - 1][0]} ${base} Z" fill="var(--accent)" opacity="0.18" stroke="none" />`
    }
    run = []
  }
  values.forEach((v, i) => {
    if (!ok(v)) return flush()
    run.push([xOf(i), f1(yOf(v))])
  })
  flush()
  return area + lineMarkup
}
