import { BODY_MODELS } from './bodyModel'
import { CHART_MARKERS } from './chartMarker'
import type { Category } from './customization'
import { SPLASH_VARIANTS } from './splashVariant'
import { STREAK_FLAME_VARIANTS } from './streakFlameVariant'
import { WATER_ANIMS } from './waterAnim'

// Слоты «Кастомизации» (BACKLOG 64.1, срез 1; docs/CUSTOMIZATION_REDESIGN.md): СЛОТ — место, где человек видит вещь (тема, рамка аватара, шкала дня …).
// Это единый реестр: из него выводятся группы вкладок (`pageTabs.ts`), число «бесплатных» вариантов у раздела и заголовки. Новый предмет каталога
// добавляется записью в `customization.ts` и сам попадает в свой слот; новый РАЗДЕЛ (новое место, где видна вещь) — одной записью здесь.
// Пока экран прежний (вкладки-группы + разделы): в срезе 2 слоты станут ячейками витрины, в срезе 3 — экраном слота с «Все · Мои · Магазин».
export type GroupId = 'look' | 'home' | 'water' | 'charts' | 'loading' | 'other'

// Откуда берутся предметы слота
export type SlotKind =
  | 'themes' // большие темы (отдельный список `theme.ts`, награды и покупки по редкости)
  | 'catalog' // предметы каталога `customization.ts` одной категории (покупка за баллы или награда за достижение)
  | 'looks' // «Образы» (64.1 срез 5): сохранённые сочетания оформления; не предметы — своего каталога и вариантов нет
  | 'free' // варианты без цены (пикер раздела); `variants` — их реестр, число считается от него

export interface Slot {
  /** id раздела: `id` секции на странице, `data-section` у «Сейчас выбрано», ключ вкладки */
  id: string
  kind: SlotKind
  group: GroupId
  /** ключ заголовка в i18n (EN и RU обязательны) */
  titleKey: SlotTitleKey
  /** категория каталога (только kind: 'catalog') */
  category?: Category
  /** слот-«ребёнок»: показывается внутри слота-родителя (одна ячейка витрины, один экран). Пример: бесплатные анимации воды и платные предметы — один слот «Анимация воды» */
  parent?: string
  /** реестр вариантов пикера (только kind: 'free'): сколько их — столько и в счётчике «n/m»; пункт «по теме/авто» не считается. Раньше число было вписано в шаблон и устаревало (огонёк серии: 2 вместо 5, заставка: 4 вместо 7) */
  variants?: readonly string[]
}

export type SlotTitleKey =
  | 'cust_sec_looks'
  | 'cust_sec_themes'
  | 'cust_cat_avatar_frame'
  | 'cust_sec_bodymodel'
  | 'cust_cat_collapse_style'
  | 'cust_cat_day_gauge'
  | 'cust_cat_week_gauge'
  | 'cust_sec_streakflame'
  | 'cust_sec_wateranim'
  | 'cust_cat_water_anim'
  | 'cust_cat_water_glass'
  | 'cust_sec_markers'
  | 'cust_sec_splash'

// Порядок = порядок на странице внутри группы
export const SLOTS: readonly Slot[] = [
  { id: 'looks', kind: 'looks', group: 'look', titleKey: 'cust_sec_looks' },
  { id: 'themes', kind: 'themes', group: 'look', titleKey: 'cust_sec_themes' },
  { id: 'avatar_frame', kind: 'catalog', group: 'look', titleKey: 'cust_cat_avatar_frame', category: 'avatar_frame' },
  { id: 'bodymodel', kind: 'free', group: 'look', titleKey: 'cust_sec_bodymodel', variants: BODY_MODELS },
  { id: 'collapse_style', kind: 'catalog', group: 'home', titleKey: 'cust_cat_collapse_style', category: 'collapse_style' },
  { id: 'week_gauge', kind: 'catalog', group: 'home', titleKey: 'cust_cat_week_gauge', category: 'week_gauge' },
  { id: 'day_gauge', kind: 'catalog', group: 'home', titleKey: 'cust_cat_day_gauge', category: 'day_gauge' },
  { id: 'streakflame', kind: 'free', group: 'home', titleKey: 'cust_sec_streakflame', variants: STREAK_FLAME_VARIANTS },
  { id: 'water_anim', kind: 'catalog', group: 'water', titleKey: 'cust_cat_water_anim', category: 'water_anim' },
  { id: 'wateranim', kind: 'free', group: 'water', titleKey: 'cust_sec_wateranim', variants: WATER_ANIMS, parent: 'water_anim' }, // базовые — внутри слота «Анимация воды»
  { id: 'water_glass', kind: 'catalog', group: 'water', titleKey: 'cust_cat_water_glass', category: 'water_glass' },
  { id: 'chart-markers', kind: 'free', group: 'charts', titleKey: 'cust_sec_markers', variants: CHART_MARKERS },
  { id: 'splash', kind: 'free', group: 'loading', titleKey: 'cust_sec_splash', variants: SPLASH_VARIANTS },
]

const BY_ID: ReadonlyMap<string, Slot> = new Map(SLOTS.map((s) => [s.id, s]))
export const slotOf = (id: string): Slot | undefined => BY_ID.get(id)
// Сколько вариантов у «бесплатного» слота (все открыты); у остальных 0
export const freeTotal = (id: string): number => {
  const s = BY_ID.get(id)
  return s && s.kind === 'free' ? s.variants?.length ?? 0 : 0
}

// Слоты, у которых есть «родитель», отдельными ячейками не показываются; вложенные открываются вместе с родителем
export const topSlots = (): Slot[] => SLOTS.filter((s) => !s.parent)
export const childSlots = (id: string): Slot[] => SLOTS.filter((s) => s.parent === id)
// Слот, который открывает адрес/нажатие: у вложенного — его родитель
export const canonicalSlot = (id: string): string => BY_ID.get(id)?.parent ?? id
