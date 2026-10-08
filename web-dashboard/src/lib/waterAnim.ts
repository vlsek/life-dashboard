// Какая анимация «записалось» играет при добавлении воды (BACKLOG 44.21, ответ владельца 2026-10-07: старая «как из 2000-х», заменить на
// современную; предложить варианты, по умолчанию самый спокойный). Выбор хранится на устройстве (localStorage), как другие мелкие настройки
// шапки, и действует сразу на всех страницах (его читают WaterSavedAnim.vue шапки и Дашборда). Копия лежит в web-header/src/lib и
// web-dashboard/src/lib — менять ОБЕ (страж: web-header/src/waterAnim.test.ts сверяет тела).
export const WATER_ANIM_KEY = 'water_saved_anim'
export const WATER_ANIMS = ['wave', 'drops', 'ripple'] as const
export type WaterAnim = (typeof WATER_ANIMS)[number]
export const DEFAULT_WATER_ANIM: WaterAnim = 'wave' // самый спокойный

export function sanitizeWaterAnim(v: unknown): WaterAnim {
  return typeof v === 'string' && (WATER_ANIMS as readonly string[]).includes(v) ? (v as WaterAnim) : DEFAULT_WATER_ANIM
}

export function getWaterAnim(): WaterAnim {
  try {
    return sanitizeWaterAnim(localStorage.getItem(WATER_ANIM_KEY))
  } catch {
    return DEFAULT_WATER_ANIM
  }
}

export function setWaterAnim(v: WaterAnim): void {
  try {
    if (v === DEFAULT_WATER_ANIM) localStorage.removeItem(WATER_ANIM_KEY)
    else localStorage.setItem(WATER_ANIM_KEY, v)
  } catch {
    /* хранилище недоступно (приватный режим) — выбор не запомнится; не страшно */
  }
}
