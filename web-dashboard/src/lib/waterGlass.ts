// Вид самого СТАКАНА воды (BACKLOG 57.2, уточнение владельца 2026-10-11 13:14: «не анимация наполнения, а сам стакан тоже чтобы был разный»).
// «Стакан» — у всех бесплатно (это «ничего не выбрано»); «кружка», «бутылка», «колба» и «бокал» — товары «Кастомизации» (категория `water_glass`).
// Выбор лежит в profiles.customization.water_glass (ключ предмета); страницы применяют его БЕЗ ожидания сети — через кэш в localStorage
// (как вид спидометра): кэш пишет «Кастомизация» при выборе, шапка и Дашборд сверяются с профилем в фоне. Чистая логика (без Vue/сети).
// Пилоты изолированы, поэтому файл ЕСТЬ в web-customization, web-header и web-dashboard (менять ВМЕСТЕ — страж в collapseStyleCopies.test.ts).
export type WaterGlassStyle = 'glass' | 'mug' | 'bottle' | 'flask' | 'goblet'

export const WATER_GLASS_CACHE_KEY = 'site_water_glass'

export const BY_ITEM: Record<string, WaterGlassStyle> = { glass_mug: 'mug', glass_bottle: 'bottle', glass_flask: 'flask', glass_goblet: 'goblet' }

export function parseWaterGlass(raw: unknown): WaterGlassStyle {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(BY_ITEM, raw) ? BY_ITEM[raw] : 'glass'
}

export function readCachedWaterGlass(): WaterGlassStyle {
  try {
    const v = localStorage.getItem(WATER_GLASS_CACHE_KEY)
    return v === 'mug' || v === 'bottle' || v === 'flask' || v === 'goblet' ? v : 'glass'
  } catch {
    return 'glass'
  }
}

export function writeCachedWaterGlass(style: WaterGlassStyle): void {
  try {
    if (style === 'glass') localStorage.removeItem(WATER_GLASS_CACHE_KEY)
    else localStorage.setItem(WATER_GLASS_CACHE_KEY, style)
  } catch {
    // нет localStorage (приватный режим) — применится после загрузки профиля
  }
}

// Форма в рамке 24×30 (как у прежнего стакана). `body` — внутренность, которую заливает вода (и по ней обрезается заливка);
// `top`/`bottom` — между какими высотами «0 %» и «100 %»; `lines` — декор без заливки (ободок, ручка, ножка, крышка).
export interface GlassShape {
  body: string
  top: number
  bottom: number
  lines: string[]
  shine: string // блик на стекле
}

export const GLASS_SHAPES: Record<WaterGlassStyle, GlassShape> = {
  glass: {
    body: 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z',
    top: 6,
    bottom: 22.5,
    lines: ['M4.6 5.3a7.4 1.25 0 1 0 14.8 0a7.4 1.25 0 1 0 -14.8 0'], // ободок-эллипс (cx 12, rx 7.4, ry 1.25)
    shine: 'M7.6 8.5l0.9 12.5',
  },
  mug: {
    body: 'M3.5 6.5h13.5v15.8q0 3.7-3.7 3.7H7.2q-3.7 0-3.7-3.7z',
    top: 7.2,
    bottom: 24.4,
    lines: ['M3.5 6.5a6.75 1.2 0 1 0 13.5 0a6.75 1.2 0 1 0 -13.5 0', 'M17 10h1.8q2.7 0 2.7 3.7t-2.7 3.7H17'], // ободок и ручка
    shine: 'M6.4 10l0.4 11',
  },
  bottle: {
    body: 'M9.6 3.4h4.8v3.2q0 1.2 1.5 2.4 2.1 1.7 2.1 4.2v10.3q0 3.2-3.2 3.2H9.2Q6 26.7 6 23.5V13.2q0-2.5 2.1-4.2 1.5-1.2 1.5-2.4z',
    top: 8,
    bottom: 25.4,
    lines: ['M9.2 1.4h5.6v2H9.2z', 'M8.2 6.4h7.6'], // крышка и кольцо горлышка
    shine: 'M8.4 13l0.4 9',
  },
  flask: {
    body: 'M9.8 3h4.4v7.1l5.3 11.5q.9 2.1-1.2 3.3-.5.3-1.2.3H6.9q-.7 0-1.2-.3-2.1-1.2-1.2-3.3L9.8 10.1z',
    top: 12,
    bottom: 25.6,
    lines: ['M8.8 3h6.4'], // ободок горлышка
    shine: 'M8 20.5l-1.4 2.7',
  },
  goblet: {
    body: 'M6.2 3.6h11.6q.5 7.2-3.1 10.3-1.1.9-2.7 1-1.6-.1-2.7-1Q5.7 10.8 6.2 3.6z',
    top: 4.6,
    bottom: 14.4,
    lines: ['M6 3.6h12', 'M12 15v9.2', 'M8 26.4h8'], // ободок, ножка, основание
    shine: 'M8.2 6l0.4 3.2',
  },
}

// Высота поверхности воды для доли `pct` (0..1+) в форме стиля: между `bottom` (пусто) и `top` (полно).
export function glassLevelY(style: WaterGlassStyle, pct: number): number {
  const s = GLASS_SHAPES[style]
  const p = Math.max(0, Math.min(1, pct))
  return s.bottom - p * (s.bottom - s.top)
}
