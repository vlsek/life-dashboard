import type { AchievementDef, AchievementState, Counters } from './achievements'

// СКРЫТЫЕ достижения (BACKLOG 49.1, владелец 2026-10-09: «штук 10 скрытых, которых нет в разделе достижения и которые выдаются только по факту»).
// Они НЕ входят в `ACHIEVEMENTS`: их нет в списке, группах, счётчике «открыто N из M», «ближайших» и фильтре по грейду — страница о них молчит, пока
// человек не получит. Выдаются по тем же счётчикам (высокие пороги), одно — составное («Универсал»). Получение — то же окно «Новое достижение»,
// найденные потом видны в блоке «Секретные». Ключи НЕ менять после релиза (на них записи user_achievements). Наград (монеты/предметы) в срезе 1 нет.
export interface HiddenDef extends AchievementDef {
  compose?: (c: Counters) => number // значение, если одного счётчика мало (иначе берём c[def.counter])
}

// Разделы, где достаточно одного дела, чтобы считаться «попробовал»: цели, навыки, книги, тренировки, челленджи, слова, вехи.
const SECTION_COUNTERS = ['goalsDone', 'skillsMastered', 'booksDone', 'workoutDays', 'challengesDone', 'wordsAdded', 'milestonesDone'] as const
export const SECTION_TARGET = SECTION_COUNTERS.length
export const sectionsUsed = (c: Counters): number => SECTION_COUNTERS.filter((k) => (c[k] || 0) >= 1).length

export const HIDDEN_ACHIEVEMENTS: readonly HiddenDef[] = [
  { key: 'secret_year', group: 'secret', counter: 'streakBest', target: 365, icon: 'trophy' },
  { key: 'secret_perfect_200', group: 'secret', counter: 'perfectDays', target: 200, icon: 'party' },
  { key: 'secret_points_5000', group: 'secret', counter: 'pointsTotal', target: 5000, icon: 'piggybank' },
  { key: 'secret_marks_1000', group: 'secret', counter: 'metricDone', target: 1000, icon: 'sparkles' },
  { key: 'secret_weight_100', group: 'secret', counter: 'weightEntries', target: 100, icon: 'scale' },
  { key: 'secret_all_rounder', group: 'secret', counter: 'goalsDone', target: SECTION_TARGET, icon: 'compass', compose: sectionsUsed },
  { key: 'secret_mega_3', group: 'secret', counter: 'megaWeeks', target: 3, icon: 'pulse' },
  { key: 'secret_words_500', group: 'secret', counter: 'wordsAdded', target: 500, icon: 'brain' },
  { key: 'secret_workouts_500', group: 'secret', counter: 'workoutDays', target: 500, icon: 'boxing' },
  { key: 'secret_milestones_100', group: 'secret', counter: 'milestonesDone', target: 100, icon: 'hourglass' },
]

export const isHiddenKey = (key: string): boolean => HIDDEN_ACHIEVEMENTS.some((d) => d.key === key)

export function evaluateHidden(counters: Counters, defs: readonly HiddenDef[] = HIDDEN_ACHIEVEMENTS): AchievementState[] {
  return defs.map((def) => {
    const raw = def.compose ? def.compose(counters) : counters[def.counter]
    const value = Math.max(0, raw || 0)
    return { def, value, progress: Math.min(1, value / def.target), met: value >= def.target }
  })
}
