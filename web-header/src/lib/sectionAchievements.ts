import { sb } from './supabase'

// BACKLOG 49.6: в каждом разделе — сворачиваемый блок «Какие достижения тут можно получить». Данные — КОПИЯ лесенок из web-achievements
// (`ACHIEVEMENTS`): тест sectionAchievements.test.ts сверяет ключи и пороги с реестром, расхождение роняет тест. Скрытые (49.1) сюда не входят.
export interface LadderStep {
  key: string
  target: number
}
export interface Ladder {
  group: string // ключ группы реестра: по нему берутся тексты gh_secach_g_<group> / gh_secach_c_<group>
  steps: readonly LadderStep[]
}

const s = (key: string, target: number): LadderStep => ({ key, target })

export const SECTION_LADDERS: Readonly<Record<string, readonly Ladder[]>> = {
  dashboard: [
    { group: 'streak', steps: [s('streak_5', 5), s('streak_10', 10), s('streak_30', 30), s('streak_100', 100)] },
    { group: 'perfect', steps: [s('perfect_days_1', 1), s('perfect_days_10', 10), s('perfect_days_30', 30), s('perfect_days_100', 100)] },
    { group: 'points', steps: [s('points_100', 100), s('points_500', 500), s('points_1000', 1000)] },
    { group: 'weeks', steps: [s('mega_productivity', 1)] },
  ],
  goals: [{ group: 'goals', steps: [s('first_goal', 1), s('goals_10', 10), s('goals_25', 25), s('goals_50', 50)] }],
  skills: [{ group: 'skills', steps: [s('first_skill', 1), s('skills_5', 5), s('skills_10', 10), s('skills_25', 25)] }],
  challenges: [{ group: 'challenges', steps: [s('challenges_1', 1), s('challenges_5', 5), s('challenges_10', 10), s('challenges_25', 25)] }],
  workouts: [{ group: 'workouts', steps: [s('first_workout', 1), s('workouts_10', 10), s('workouts_50', 50), s('workouts_100', 100), s('workouts_250', 250)] }],
  milestones: [{ group: 'milestones', steps: [s('milestones_1', 1), s('milestones_5', 5), s('milestones_10', 10), s('milestones_25', 25)] }],
  languages: [
    { group: 'words_added', steps: [s('words_10', 10), s('words_25', 25), s('words_50', 50), s('words_100', 100)] },
    { group: 'words_learned', steps: [s('learned_10', 10), s('learned_25', 25), s('learned_50', 50), s('learned_100', 100)] },
  ],
}

// Раздел по адресу страницы (/goals/, /goals/index.html, /goals.html); нет раздела — null.
export function sectionFor(pathname: string): string | null {
  const m = pathname.match(/^\/([a-z]+)(?:\/|\/index\.html|\.html)?$/)
  const key = m ? m[1] : null
  return key && SECTION_LADDERS[key] ? key : null
}

export function sectionKeys(section: string): string[] {
  return (SECTION_LADDERS[section] || []).flatMap((l) => l.steps.map((st) => st.key))
}

// Какие из ступеней раздела уже получены (один запрос). Ошибка/нет сети — пустое множество (блок всё равно покажет список).
export async function loadUnlockedKeys(userId: string, section: string): Promise<Set<string>> {
  try {
    const { data, error } = await sb.from('user_achievements').select('key').eq('user_id', userId).in('key', sectionKeys(section))
    if (error || !data) return new Set()
    return new Set((data as { key: string }[]).map((r) => r.key))
  } catch {
    return new Set()
  }
}
