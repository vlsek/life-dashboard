// «Сейчас выбрано» (BACKLOG 61.6 срез 1, остаток 59.1): одна сводка вверху страницы «Кастомизация» — что включено сейчас по каждому разделу,
// чтобы не листать всю страницу ради ответа «а что у меня стоит?». Строка = раздел витрины + название выбранного значения; тап по строке ведёт к разделу.
// Чистая функция без обращения к DOM и localStorage: читатели значений приходят снаружи (App.vue даёт настоящие, тесты — подставные).
import { CATEGORY_ORDER, itemByKey, type Category, type Selected } from './customization'
import type { SplashVariant } from './splashVariant'
import type { StreakFlameVariant } from './streakFlameVariant'
import type { WaterAnim } from './waterAnim'
import type { BodyModel } from './bodyModel'
import type { ChartMarker } from './chartMarker'
import type { ThemeKey } from './theme'

export interface SelectionRow {
  /** id раздела витрины: тот же, что в `data-section` и в `SECTION_GROUP` (по нему находим вкладку и прокручиваем) */
  section: string
  /** ключ перевода заголовка раздела (`cust_sec_*` / `cust_cat_*`) */
  titleKey: string
  /** что показать справа: либо ключ перевода названия (`i18n`), либо «как есть» не бывает — названия всегда из словаря */
  valueKey: string
  /** выбрано что-то своё (не вариант по умолчанию): такие строки подсвечиваем */
  custom: boolean
}

export interface SelectionReaders {
  theme: ThemeKey
  selected: Selected
  splash: SplashVariant | 'auto'
  streakFlame: StreakFlameVariant
  /** выбор анимации воды из бесплатных; платный предмет (`selected.water_anim`) приоритетнее */
  waterAnim: WaterAnim | 'auto'
  /** null — модель «по полу профиля» */
  bodyModel: BodyModel | null
  chartMarker: ChartMarker
}

const THEME_NAME_KEY = (k: ThemeKey): string => 'theme_' + k

// Предметные категории каталога (рамка, сворачивание, спидометры, вода-предмет, стакан): значение — название предмета или «Базовый».
const ITEM_CATEGORY_ORDER: readonly Category[] = CATEGORY_ORDER

export function selectionRows(r: SelectionReaders): SelectionRow[] {
  const rows: SelectionRow[] = []
  rows.push({ section: 'themes', titleKey: 'cust_sec_themes', valueKey: THEME_NAME_KEY(r.theme), custom: r.theme !== 'dark' })

  for (const cat of ITEM_CATEGORY_ORDER) {
    const key = r.selected[cat]
    const item = key ? itemByKey(key) : undefined
    rows.push({ section: cat, titleKey: 'cust_cat_' + cat, valueKey: item ? 'cust_item_' + item.key : 'cust_now_default', custom: !!item })
  }

  rows.push({ section: 'splash', titleKey: 'cust_sec_splash', valueKey: r.splash === 'auto' ? 'cust_splash_auto' : 'splash_variant_' + r.splash, custom: r.splash !== 'auto' })
  rows.push({ section: 'streakflame', titleKey: 'cust_sec_streakflame', valueKey: 'cust_streakflame_' + r.streakFlame, custom: r.streakFlame !== 'flame' })
  rows.push({ section: 'wateranim', titleKey: 'cust_sec_wateranim', valueKey: 'cust_wateranim_' + r.waterAnim, custom: r.waterAnim !== 'auto' })
  rows.push({ section: 'bodymodel', titleKey: 'cust_sec_bodymodel', valueKey: r.bodyModel ? 'cust_body_' + r.bodyModel : 'cust_body_auto', custom: r.bodyModel !== null })
  rows.push({ section: 'chart-markers', titleKey: 'cust_sec_markers', valueKey: 'chart_marker_' + r.chartMarker, custom: r.chartMarker !== 'flat' })
  return rows
}

// Сколько строк выбрано «по-своему»: показываем в заголовке сводки («изменено 3 из 12»)
export const customCount = (rows: readonly SelectionRow[]): number => rows.filter((x) => x.custom).length
