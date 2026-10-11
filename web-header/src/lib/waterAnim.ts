// Какая анимация «записалось» играет при добавлении воды (BACKLOG 44.21, ответ владельца 2026-10-07: старая «как из 2000-х», заменить на
// современную; предложить варианты, по умолчанию самый спокойный). Выбор хранится на устройстве (localStorage), как другие мелкие настройки
// шапки, и действует сразу на всех страницах (его читают WaterSavedAnim.vue шапки и Дашборда). Копия лежит в web-header/src/lib и
// web-dashboard/src/lib — менять ОБЕ (страж: web-header/src/waterAnim.test.ts сверяет тела).
import { THEME_WATER } from './themeWater'

export const WATER_ANIM_KEY = 'water_saved_anim'
export const WATER_ANIMS = ['wave', 'drops', 'ripple'] as const
export type WaterAnim = (typeof WATER_ANIMS)[number]
export const DEFAULT_WATER_ANIM: WaterAnim = 'wave' // самый спокойный

export function sanitizeWaterAnim(v: unknown): WaterAnim {
  return typeof v === 'string' && (WATER_ANIMS as readonly string[]).includes(v) ? (v as WaterAnim) : DEFAULT_WATER_ANIM
}

// Вариант большой темы (BACKLOG 55.5): тема берётся из класса `theme-<ключ>` на <html> (его ставит prefs.ts/theme.ts на каждой странице)
function themeWaterAnim(): WaterAnim | null {
  try {
    for (const c of Array.from(document.documentElement.classList)) {
      const m = /^theme-(\w+)$/.exec(c)
      const v = m ? THEME_WATER[m[1]] : undefined
      if (v) return v
    }
  } catch {
    /* нет документа — тема не определяется */
  }
  return null
}

// Что выбрал пользователь: конкретный вариант или 'auto' («по теме»: ничего не сохранено)
export function getWaterAnimChoice(): WaterAnim | 'auto' {
  try {
    const v = localStorage.getItem(WATER_ANIM_KEY)
    return v && (WATER_ANIMS as readonly string[]).includes(v) ? (v as WaterAnim) : 'auto'
  } catch {
    return 'auto'
  }
}

// Какая анимация играет: ручной выбор главнее, иначе вариант большой темы, иначе спокойная волна
export function getWaterAnim(): WaterAnim {
  const c = getWaterAnimChoice()
  return c === 'auto' ? (themeWaterAnim() ?? DEFAULT_WATER_ANIM) : c
}

// 'auto' — «по теме»: выбор снимается. Любой конкретный вариант (и волна тоже) хранится явно и главнее темы.
export function setWaterAnim(v: WaterAnim | 'auto'): void {
  try {
    if (v === 'auto') localStorage.removeItem(WATER_ANIM_KEY)
    else localStorage.setItem(WATER_ANIM_KEY, v)
  } catch {
    /* хранилище недоступно (приватный режим) — выбор не запомнится; не страшно */
  }
}
