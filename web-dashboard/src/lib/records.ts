// «Рекорды» (BACKLOG раздел 28): у каждого графика и каждой числовой метрики/метрики-подходов показываем лучшее значение
// за всё время и дату. По ответу владельца (2026-10-04) выключатели РАЗДЕЛЬНЫЕ: у графиков — в окне «Настроить графики»,
// у метрик — в окне «Управление метриками». По умолчанию ВКЛЮЧЕНО.
// Хранение: `site_records_charts` / `site_records_metrics` = 'on' | 'off'. Прежний общий выбор `site_records` = 'off' (v2.82)
// продолжает действовать на оба места, пока человек не тронул галочку этого места: тогда его явный выбор сильнее.
export const RECORDS_KEY = 'site_records'
export const RECORDS_EVENT = 'site-records:changed'
export type RecordsKind = 'charts' | 'metrics'
export const RECORDS_KEYS: Record<RecordsKind, string> = { charts: 'site_records_charts', metrics: 'site_records_metrics' }

export interface RecordInfo {
  y: number
  date: string
}

export function recordsEnabled(kind: RecordsKind): boolean {
  try {
    const own = localStorage.getItem(RECORDS_KEYS[kind])
    if (own === 'on') return true
    if (own === 'off') return false
    return localStorage.getItem(RECORDS_KEY) !== 'off' // прежний общий выбор
  } catch {
    return true
  }
}

export function setRecordsEnabled(on: boolean, kind: RecordsKind): void {
  try {
    localStorage.setItem(RECORDS_KEYS[kind], on ? 'on' : 'off')
  } catch {
    /* приватный режим: выбор не сохранится, но работает до перезагрузки */
  }
  window.dispatchEvent(new CustomEvent(RECORDS_EVENT, { detail: { kind, on } }))
}

// Рекорд — наибольшее значение больше нуля (нулевой «рекорд» ничего не говорит); при равных значениях — самая ранняя дата.
export function bestRecord(points: { date: string; y: number | null | undefined }[]): RecordInfo | null {
  let best: RecordInfo | null = null
  for (const p of points) {
    if (typeof p.y !== 'number' || !Number.isFinite(p.y) || p.y <= 0) continue
    if (!best || p.y > best.y || (p.y === best.y && p.date < best.date)) best = { y: p.y, date: p.date }
  }
  return best
}

// Новое значение за день: строго больше текущего рекорда — рекорд обновляется; иначе прежний.
// Значение той же даты, что и рекорд, но меньше (правка вниз) рекорд не пересчитывает — полный пересчёт делает загрузка.
export function mergeRecord(current: RecordInfo | null | undefined, y: number | null | undefined, date: string | undefined): RecordInfo | null {
  const cur = current ?? null
  if (typeof y !== 'number' || !Number.isFinite(y) || y <= 0 || !date) return cur
  if (!cur || y > cur.y) return { y, date }
  return cur
}

export function formatRecordValue(y: number, lang: string): string {
  return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(y)
}

export function formatRecordDate(iso: string, lang: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
