// Сворачивание отдельного упражнения (BACKLOG 3.1). Состояние — по id упражнения, в localStorage,
// как у категорий (`workouts_collapsed:*`), но с другим префиксом, чтобы ключи не пересекались.
export const EXERCISE_COLLAPSE_PREFIX = 'workouts_ex_collapsed:'

export const exerciseCollapseKey = (id: string): string => EXERCISE_COLLAPSE_PREFIX + id

export function readExerciseCollapsed(id: string): boolean {
  try {
    return localStorage.getItem(exerciseCollapseKey(id)) === '1'
  } catch {
    return false
  }
}

export function writeExerciseCollapsed(id: string, collapsed: boolean): void {
  try {
    // Развёрнутое состояние — значение по умолчанию, ключ для него не храним.
    if (collapsed) localStorage.setItem(exerciseCollapseKey(id), '1')
    else localStorage.removeItem(exerciseCollapseKey(id))
  } catch {
    /* ignore */
  }
}
