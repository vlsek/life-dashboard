// Вид спидометра ДНЯ (BACKLOG 53.2 срез 2, владелец 2026-10-10/11: виды спидометров ставятся в «Кастомизации»).
// «Обычное кольцо» — у всех бесплатно (это «ничего не выбрано»); «пунктирное кольцо» и «кольцо со свечением» — товары «Кастомизации».
// Выбор лежит в profiles.customization.day_gauge (ключ предмета); страницы применяют его БЕЗ ожидания сети — через кэш в localStorage (как вид
// недели): кэш пишет «Кастомизация» при выборе, шапка и Дашборд сверяются с профилем в фоне. Чистая логика (без Vue/сети).
// Пилоты изолированы, поэтому файл ЕСТЬ в web-customization, web-header и web-dashboard (менять ВМЕСТЕ — страж в collapseStyleCopies.test.ts).
export type DayGaugeStyle = 'ring' | 'dashed' | 'glow'

export const DAY_GAUGE_CACHE_KEY = 'site_day_gauge'

const BY_ITEM: Record<string, DayGaugeStyle> = { day_dashed: 'dashed', day_glow: 'glow' }

export function parseDayGauge(raw: unknown): DayGaugeStyle {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(BY_ITEM, raw) ? BY_ITEM[raw] : 'ring'
}

export function readCachedDayGauge(): DayGaugeStyle {
  try {
    const v = localStorage.getItem(DAY_GAUGE_CACHE_KEY)
    return v === 'dashed' || v === 'glow' ? v : 'ring'
  } catch {
    return 'ring'
  }
}

export function writeCachedDayGauge(style: DayGaugeStyle): void {
  try {
    if (style === 'ring') localStorage.removeItem(DAY_GAUGE_CACHE_KEY)
    else localStorage.setItem(DAY_GAUGE_CACHE_KEY, style)
  } catch {
    // нет localStorage (приватный режим) — применится после загрузки профиля
  }
}

// Свечение у дуги прогресса («кольцо со свечением»): тень цвета акцента.
export const DAY_GLOW_FILTER = 'drop-shadow(0 0 2.5px var(--accent, #6c8cff))'

export const DAY_SEGMENTS = 20
export interface DaySegment {
  d: string // дуга сегмента (SVG path); углы от 3 часов по часовой — кольцо крутят на −90° как обычное
  base: boolean // закрашен основным прогрессом
  bonus: boolean // закрашен бонусом (рисуется тонкой линией поверх)
}

const fmt = (n: number) => n.toFixed(2)

// Кольцо из n коротких дуг с просветами: основной прогресс красит первые round(base·n) дуг (минимум одну, если прогресс > 0), бонус — по тому же правилу.
export function daySegments(cx: number, cy: number, r: number, basePct: number, bonusPct: number, n = DAY_SEGMENTS): DaySegment[] {
  const count = (frac: number) => {
    const f = Math.max(0, Math.min(1, frac))
    return f <= 0 ? 0 : Math.max(1, Math.round(f * n))
  }
  const baseN = count(basePct)
  const bonusN = count(bonusPct / 100)
  const step = (2 * Math.PI) / n
  const span = step * 0.68
  return Array.from({ length: n }, (_, i) => {
    const a0 = i * step + (step - span) / 2
    const a1 = a0 + span
    const d = `M ${fmt(cx + r * Math.cos(a0))} ${fmt(cy + r * Math.sin(a0))} A ${r} ${r} 0 0 1 ${fmt(cx + r * Math.cos(a1))} ${fmt(cy + r * Math.sin(a1))}`
    return { d, base: i < baseN, bonus: i < bonusN }
  })
}
