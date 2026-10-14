// Мини-спарклайн (55.2 последний срез): значения за последние N дней → путь SVG. Чистые функции, без DOM.
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
