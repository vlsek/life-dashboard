// Вид огонька серии (стрика) — BACKLOG 44.18в: пять бесплатных вариантов. Срез 1: «Единое пламя» (flame) — нынешнее живое пламя
// заставки, «Три языка» (tongues) — прежнее пламя из трёх языков с искрами. Срез 2: «Огненное кольцо» (ring) — кольцо заставки с огоньком,
// «Уголёк» (ember) — тлеющий уголь, «Свеча» (candle) — свеча с живым язычком. Выбор делается в «Кастомизации» и запоминается в
// localStorage (`streak_flame_variant`, тот же origin у всех страниц); Дашборд читает его при показе огонька, поэтому новый вид
// виден со следующей загрузки. КОПИЯ лежит в web-dashboard и web-customization (менять ВМЕСТЕ — страж streakFlamePicker.test.ts).
export const STREAK_FLAME_VARIANTS = ['flame', 'tongues', 'ring', 'ember', 'candle'] as const
export type StreakFlameVariant = (typeof STREAK_FLAME_VARIANTS)[number]
export const DEFAULT_STREAK_FLAME_VARIANT: StreakFlameVariant = 'flame'
export const STREAK_FLAME_VARIANT_KEY = 'streak_flame_variant'

export const isStreakFlameVariant = (v: unknown): v is StreakFlameVariant => (STREAK_FLAME_VARIANTS as readonly unknown[]).includes(v)

export function readStreakFlameVariant(): StreakFlameVariant {
  try {
    const stored = localStorage.getItem(STREAK_FLAME_VARIANT_KEY)
    if (isStreakFlameVariant(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_STREAK_FLAME_VARIANT
}

// true — выбор запомнен (в приватном режиме localStorage может быть недоступен)
export function writeStreakFlameVariant(v: StreakFlameVariant): boolean {
  try {
    localStorage.setItem(STREAK_FLAME_VARIANT_KEY, v)
    return true
  } catch {
    return false
  }
}
