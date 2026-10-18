// Вид самого СТАКАНА воды (BACKLOG 57.2, уточнение владельца 2026-10-11 13:14: «не анимация наполнения, а сам стакан тоже чтобы был разный»).
// «Стакан» — у всех бесплатно (это «ничего не выбрано»); «кружка», «бутылка», «колба» и «бокал» — товары «Кастомизации» (категория `water_glass`).
// Выбор лежит в profiles.customization.water_glass (ключ предмета); страницы применяют его БЕЗ ожидания сети — через кэш в localStorage
// (как вид спидометра): кэш пишет «Кастомизация» при выборе, шапка и Дашборд сверяются с профилем в фоне. Чистая логика (без Vue/сети).
// Пилоты изолированы, поэтому файл ЕСТЬ в web-customization, web-header и web-dashboard (менять ВМЕСТЕ — страж в collapseStyleCopies.test.ts).
export type WaterGlassStyle = 'glass' | 'mug' | 'bottle' | 'flask' | 'goblet' | 'tumbler' | 'jar' | 'beaker' | 'pitcher' | 'carafe' | 'teacup'

export const WATER_GLASS_CACHE_KEY = 'site_water_glass'

export const BY_ITEM: Record<string, WaterGlassStyle> = { glass_mug: 'mug', glass_bottle: 'bottle', glass_flask: 'flask', glass_goblet: 'goblet', glass_tumbler: 'tumbler', glass_jar: 'jar', glass_beaker: 'beaker', glass_pitcher: 'pitcher', glass_carafe: 'carafe', glass_teacup: 'teacup' }

export function parseWaterGlass(raw: unknown): WaterGlassStyle {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(BY_ITEM, raw) ? BY_ITEM[raw] : 'glass'
}

export function readCachedWaterGlass(): WaterGlassStyle {
  try {
    const v = localStorage.getItem(WATER_GLASS_CACHE_KEY)
    return v === 'mug' || v === 'bottle' || v === 'flask' || v === 'goblet' || v === 'tumbler' || v === 'jar' || v === 'beaker' || v === 'pitcher' || v === 'carafe' || v === 'teacup' ? v : 'glass'
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
  tumbler: {
    body: 'M3.8 9h16.4l-1.2 14.6q-.2 2.4-2.6 2.4H7.6q-2.4 0-2.6-2.4L3.8 9z',
    top: 10,
    bottom: 24.6,
    lines: ['M3.8 9a8.2 1.1 0 1 0 16.4 0a8.2 1.1 0 1 0 -16.4 0'], // ободок-эллипс (cx 12, rx 8.2, ry 1.1)
    shine: 'M6.4 12l0.7 10',
  },
  jar: {
    body: 'M5 8h14q1.5 0 1.5 1.5V24q0 3.2-3.2 3.2H6.7Q3.5 27.2 3.5 24V9.5Q3.5 8 5 8z',
    top: 10.2,
    bottom: 25.6,
    lines: ['M5 3.6h14v3.2H5z', 'M4.6 6.8h14.8'], // крышка и горлышко
    shine: 'M6.2 12l0.4 11',
  },
  beaker: {
    body: 'M5 4h14v19.5q0 2.7-2.7 2.7H7.7Q5 26.2 5 23.5z',
    top: 5,
    bottom: 24.6,
    lines: ['M4 4h16', 'M5 9h3.2', 'M5 14h3.2', 'M5 19h3.2'], // ободок и деления мензурки
    shine: 'M16.6 8v12',
  },
  pitcher: {
    body: 'M5.5 4.5h10.5v2.6q2.2 1.9 2.2 5.4v10q0 3.5-3.5 3.5H7q-3.5 0-3.5-3.5v-10q0-3.5 2-5.4z',
    top: 8,
    bottom: 25.2,
    lines: ['M5.5 4.5h10.5', 'M18.2 11h1.5q2.3 0 2.3 3.6t-2.3 3.6h-1.5'], // ободок и ручка
    shine: 'M6.2 12l0.4 9',
  },
  carafe: {
    body: 'M10 3h4v6q5.5 2.2 5.5 9 0 8-7.5 8T4.5 18q0-6.8 5.5-9z',
    top: 11,
    bottom: 25.2,
    lines: ['M9 3h6'], // ободок горлышка
    shine: 'M8 17l0.4 4',
  },
  teacup: {
    body: 'M4 8h13v7q0 5-5 5H9q-5 0-5-5z',
    top: 9,
    bottom: 19.4,
    lines: ['M4 8h13', 'M17 10h1.5q2.5 0 2.5 3t-2.5 3H16.5', 'M2.5 24h16'], // ободок, ручка и блюдце
    shine: 'M6.4 11l0.3 4',
  },
}

// Высота поверхности воды для доли `pct` (0..1+) в форме стиля: между `bottom` (пусто) и `top` (полно).
export function glassLevelY(style: WaterGlassStyle, pct: number): number {
  const s = GLASS_SHAPES[style]
  const p = Math.max(0, Math.min(1, pct))
  return s.bottom - p * (s.bottom - s.top)
}
