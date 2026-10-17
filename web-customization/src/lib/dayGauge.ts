// Вид спидометра ДНЯ (BACKLOG 53.2 срез 2, владелец 2026-10-10/11: виды спидометров ставятся в «Кастомизации»).
// «Обычное кольцо» — у всех бесплатно (это «ничего не выбрано»); «пунктирное кольцо» и «кольцо со свечением» — товары «Кастомизации».
// Выбор лежит в profiles.customization.day_gauge (ключ предмета); страницы применяют его БЕЗ ожидания сети — через кэш в localStorage (как вид
// недели): кэш пишет «Кастомизация» при выборе, шапка и Дашборд сверяются с профилем в фоне. Чистая логика (без Vue/сети).
// Пилоты изолированы, поэтому файл ЕСТЬ в web-customization, web-header и web-dashboard (менять ВМЕСТЕ — страж в collapseStyleCopies.test.ts).
export type DayGaugeStyle = 'ring' | 'dashed' | 'glow' | 'ticks' | 'gradient' | 'thick' | 'rainbow' | 'thin' | 'sunset'

export const DAY_GAUGE_CACHE_KEY = 'site_day_gauge'

const BY_ITEM: Record<string, DayGaugeStyle> = { day_dashed: 'dashed', day_glow: 'glow', day_ticks: 'ticks', day_gradient: 'gradient', day_thick: 'thick', day_rainbow: 'rainbow', day_thin: 'thin', day_sunset: 'sunset' }

export function parseDayGauge(raw: unknown): DayGaugeStyle {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(BY_ITEM, raw) ? BY_ITEM[raw] : 'ring'
}

export function readCachedDayGauge(): DayGaugeStyle {
  try {
    const v = localStorage.getItem(DAY_GAUGE_CACHE_KEY)
    return v === 'dashed' || v === 'glow' || v === 'ticks' || v === 'gradient' || v === 'thick' || v === 'rainbow' || v === 'thin' || v === 'sunset' ? v : 'ring'
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
  const span = step * 0.62
  return Array.from({ length: n }, (_, i) => {
    const a0 = i * step + (step - span) / 2
    const a1 = a0 + span
    const d = `M ${fmt(cx + r * Math.cos(a0))} ${fmt(cy + r * Math.sin(a0))} A ${r} ${r} 0 0 1 ${fmt(cx + r * Math.cos(a1))} ${fmt(cy + r * Math.sin(a1))}`
    return { d, base: i < baseN, bonus: i < bonusN }
  })
}

// «Циферблат»: тонкая дорожка и дуга прогресса + 12 коротких «часовых» штрихов внутри кольца (углы от 3 часов, кольцо крутят на −90°).
export const DAY_TICKS = 12
export interface DayTick {
  x1: number
  y1: number
  x2: number
  y2: number
  lit: boolean // штрих внутри пройденной части дуги
}
export function dayTicks(cx: number, cy: number, r: number, basePct: number, len = 3): DayTick[] {
  const f = Math.max(0, Math.min(1, basePct))
  return Array.from({ length: DAY_TICKS }, (_, i) => {
    const a = (i / DAY_TICKS) * 2 * Math.PI
    const c = Math.cos(a)
    const s = Math.sin(a)
    return { x1: cx + (r - 2.5) * c, y1: cy + (r - 2.5) * s, x2: cx + (r - 2.5 - len) * c, y2: cy + (r - 2.5 - len) * s, lit: i / DAY_TICKS < f - 1e-9 }
  })
}

// «Градиентное кольцо»: дуга красится градиентом от акцента к золотому (цвет бонуса).
export const DAY_GRADIENT_STOPS = ['var(--accent, #6c8cff)', '#f5b301'] as const

// Толщина колец по виду («Циферблат» — тонкое, «Толстое кольцо» — широкое, остальные 3).
export function dayRingWidths(style: DayGaugeStyle): { track: number; arc: number } {
  if (style === 'ticks') return { track: 1.6, arc: 2.4 }
  if (style === 'thick') return { track: 5, arc: 5 }
  if (style === 'thin') return { track: 1.2, arc: 2 }
  return { track: 3, arc: 3 }
}

// «Закат»: оранжевый → розовый → фиолетовый.
export const DAY_SUNSET_STOPS = ['#fb923c', '#f43f5e', '#a855f7'] as const
// «Радуга»: дуга красится градиентом из четырёх цветов (бирюзовый → зелёный → золотой → розовый).
export const DAY_RAINBOW_STOPS = ['#38bdf8', '#4ade80', '#f5b301', '#f472b6'] as const
// Опорные точки градиента для видов «градиент» и «радуга».
export function dayGradientStops(style: DayGaugeStyle): { offset: string; color: string }[] {
  const cols: readonly string[] = style === 'rainbow' ? DAY_RAINBOW_STOPS : style === 'sunset' ? DAY_SUNSET_STOPS : DAY_GRADIENT_STOPS
  return cols.map((color, i) => ({ offset: `${Math.round((i / (cols.length - 1)) * 100)}%`, color }))
}
// Виду нужен градиент вместо цвета акцента.
export const dayUsesGradient = (style: DayGaugeStyle): boolean => style === 'gradient' || style === 'rainbow' || style === 'sunset'
