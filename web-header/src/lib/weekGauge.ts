// Вид спидометра НЕДЕЛИ (BACKLOG 53.2, решение владельца 2026-10-10: виды спидометров ставятся в «Кастомизации», а не в «Настройках прогресса»).
// «Семиугольник по дням» — у всех бесплатно (это «ничего не выбрано»); «классическое кольцо» и «семь столбиков» — товары «Кастомизации».
// Выбор лежит в profiles.customization.week_gauge (ключ предмета); страницы применяют его БЕЗ ожидания сети — через кэш в localStorage (как вид
// сворачивания блоков): кэш пишет «Кастомизация» при выборе, шапка и Дашборд сверяются с профилем в фоне. Чистая логика (без Vue/сети).
// Пилоты изолированы, поэтому файл ЕСТЬ в web-customization, web-header и web-dashboard (менять ВМЕСТЕ — страж weekGaugeCopies.test.ts в web-customization).
export type WeekGaugeStyle = 'heptagon' | 'classic' | 'bars' | 'dots' | 'steps' | 'wave' | 'teeth' | 'valley' | 'slope'

export const WEEK_GAUGE_CACHE_KEY = 'site_week_gauge'

// Ключ предмета из реестра «Кастомизации» → вид; всё неизвестное и пустое — семиугольник.
const BY_ITEM: Record<string, WeekGaugeStyle> = { week_classic: 'classic', week_bars: 'bars', week_dots: 'dots', week_steps: 'steps', week_wave: 'wave', week_teeth: 'teeth', week_valley: 'valley', week_slope: 'slope' }

export function parseWeekGauge(raw: unknown): WeekGaugeStyle {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(BY_ITEM, raw) ? BY_ITEM[raw] : 'heptagon'
}

export function readCachedWeekGauge(): WeekGaugeStyle {
  try {
    const v = localStorage.getItem(WEEK_GAUGE_CACHE_KEY)
    return v === 'classic' || v === 'bars' || v === 'dots' || v === 'steps' || v === 'wave' || v === 'teeth' || v === 'valley' || v === 'slope' ? v : 'heptagon'
  } catch {
    return 'heptagon'
  }
}

export function writeCachedWeekGauge(style: WeekGaugeStyle): void {
  try {
    if (style === 'heptagon') localStorage.removeItem(WEEK_GAUGE_CACHE_KEY)
    else localStorage.setItem(WEEK_GAUGE_CACHE_KEY, style)
  } catch {
    // нет localStorage (приватный режим) — применится после загрузки профиля
  }
}
