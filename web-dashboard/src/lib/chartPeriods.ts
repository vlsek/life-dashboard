import { loadPeriodState, savePeriodState, type PeriodState } from './chart'

// Свой период у ОДНОГО графика — хранится в localStorage по ключу серии; если не задан,
// график использует общий период (из «Настроить графики»). Портировано из effectivePeriod()/
// openChartPeriodModal() в dashboard.js.
const KEY = 'dash_period_chart:'

export function loadOwnPeriod(seriesKey: string): PeriodState | null {
  const st = loadPeriodState(KEY + seriesKey, { range: 'all', from: '__none__', to: null })
  return st.from === '__none__' ? null : st
}

export function saveOwnPeriod(seriesKey: string, state: PeriodState) {
  savePeriodState(KEY + seriesKey, state)
}

export function clearOwnPeriod(seriesKey: string) {
  try {
    localStorage.removeItem(KEY + seriesKey)
  } catch {
    /* localStorage недоступен — не критично */
  }
}

export function effectivePeriod(seriesKey: string, shared: PeriodState): PeriodState {
  return loadOwnPeriod(seriesKey) ?? shared
}
