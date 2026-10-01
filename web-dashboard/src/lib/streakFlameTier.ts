// Ступени «живого пламени» у счётчика стрика на главной (BACKLOG 18: «горит анимированно при стрике от 7 дней»).
// Чистая логика без Vue: компонент StreakFlame.vue берёт ступень отсюда, пороги меняются в одном месте.
//   0 — меньше 7 дней: обычный огонёк (как раньше, с лёгким мерцанием);
//   1 — от 7 дней: живое пламя заставки (три языка + сердцевина);
//   2 — от 30 дней: ярче свечение, быстрее мерцание, две искры;
//   3 — от 100 дней: самое яркое свечение и четыре искры.
export const STREAK_FLAME_THRESHOLDS = [7, 30, 100] as const
export type StreakFlameTier = 0 | 1 | 2 | 3

export function streakFlameTier(days: number | null | undefined): StreakFlameTier {
  if (typeof days !== 'number' || !Number.isFinite(days)) return 0
  let tier = 0
  for (const threshold of STREAK_FLAME_THRESHOLDS) if (days >= threshold) tier++
  return tier as StreakFlameTier
}

// Серия в днях: недельные серии (unit === 'w') считаются в неделях, неделя = 7 дней.
export function streakDays(streak: number, unit?: 'w'): number {
  return unit === 'w' ? streak * 7 : streak
}
