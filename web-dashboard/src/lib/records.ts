// «Рекорды» (BACKLOG раздел 28): у каждого графика и каждой числовой метрики/метрики-подходов показываем лучшее значение
// за всё время и дату. Выключатель — в окне «Настроить Дашборд»; по умолчанию ВКЛЮЧЕНО (в localStorage хранится только выбор «выключить»).
export const RECORDS_KEY = 'site_records'
export const RECORDS_EVENT = 'site-records:changed'

export interface RecordInfo {
  y: number
  date: string
}

export function recordsEnabled(): boolean {
  try {
    return localStorage.getItem(RECORDS_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setRecordsEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(RECORDS_KEY)
    else localStorage.setItem(RECORDS_KEY, 'off')
  } catch {
    /* приватный режим: выбор не сохранится, но работает до перезагрузки */
  }
  window.dispatchEvent(new CustomEvent(RECORDS_EVENT, { detail: on }))
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
