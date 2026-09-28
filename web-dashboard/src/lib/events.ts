// Общий канал «данные дашборда изменились» между независимыми блоками страницы (вода, подходы,
// правка из графика, план на сегодня → стрики, кольца прогресса, графики). У блоков нет общего
// стора (каждый — свой композабл, см. ROADMAP.md), поэтому передаём браузерным событием.
// В оригинале это refreshStreakBadge()/renderDayProgressRing()/pushPointToChart(), которые
// каждое место сохранения вызывало вручную.
export const DATA_CHANGED = 'dashboard:data-changed'

export interface DataChangedDetail {
  source: string // кто изменил: 'water' | 'sets' | 'charts' | 'plan' ... (чтобы источник не обновлял сам себя)
  metricId?: string
  date?: string
  value?: number | null // для числовых метрик: итоговое значение за день (сумма повторений для подходов)
}

export function notifyDataChanged(detail: DataChangedDetail) {
  window.dispatchEvent(new CustomEvent<DataChangedDetail>(DATA_CHANGED, { detail }))
}
