import { MUSCLE_IDS, type MuscleId } from './muscles'

// Синхронизация своей привязки упражнений к мышцам между устройствами (BACKLOG 22 «12:33», подпункт «синхронизация между
// устройствами»; миграция 038: колонка workout_exercises.muscle_groups text[]). Чистая логика без сети и localStorage:
// useWorkouts.load() строит план и исполняет его, а здесь — только решения, поэтому их можно проверить тестами.
//
// Правила:
//  1) Колонки в БД нет (миграция не применена) — ничего не делаем: привязка остаётся только на устройстве, как в v2.32.
//     Наличие колонки определяем по самой строке: select('*') отдаёт ключ muscle_groups (даже при null), пока колонка есть.
//  2) В БД есть непустая привязка — она главная: пишем её в локальный слой (по названию упражнения).
//  3) В БД пусто, а на устройстве есть своя привязка:
//       • первый проход на этом устройстве (флаг не стоит) — один раз загружаем её в БД (так не теряются привязки из v2.32);
//       • потом (флаг стоит) БД — источник правды, пусто в БД = «сбросили на другом устройстве» → локальную тоже убираем.
export interface SyncRow {
  id: string
  name: string
  muscle_groups?: unknown
}

export interface MuscleSyncPlan {
  hasColumn: boolean
  /** загрузить в БД (первый проход): упражнение → группы */
  toUpload: Array<{ id: string; name: string; muscles: MuscleId[] }>
  /** применить в локальный слой: название → группы (null — убрать локальную) */
  apply: Array<{ name: string; muscles: MuscleId[] | null }>
}

function cleanGroups(v: unknown): MuscleId[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((m): m is MuscleId => MUSCLE_IDS.includes(m as MuscleId)))]
}

export function planMuscleSync(rows: readonly SyncRow[], getLocal: (name: string) => MuscleId[] | null, uploaded: boolean): MuscleSyncPlan {
  const plan: MuscleSyncPlan = { hasColumn: false, toUpload: [], apply: [] }
  if (!rows.length || !('muscle_groups' in rows[0])) return plan
  plan.hasColumn = true
  for (const row of rows) {
    if (!('muscle_groups' in row)) continue
    const db = cleanGroups(row.muscle_groups)
    const local = getLocal(row.name)
    if (db.length) plan.apply.push({ name: row.name, muscles: db })
    else if (local && !uploaded) plan.toUpload.push({ id: row.id, name: row.name, muscles: local })
    else if (local && uploaded) plan.apply.push({ name: row.name, muscles: null })
  }
  return plan
}
