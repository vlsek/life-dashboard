import { THEME_UNLOCK, type ThemeKey } from './theme'
import { t } from './i18n'

// Условие получения закрытой темы-награды (BACKLOG 49.10): окно по нажатию на закрытую тему говорит, ЧТО сделать. Ключ достижения имеет вид
// `<группа>_<число>` (goals_50, words_100…); текст условия — по группе («Выполнено целей: 50»), как на странице «Достижения». Новая закрытая
// тема с неизвестной группой условия не ломает окно (покажем только название достижения), но страж `themeUnlockInfo.test.ts` напомнит добавить группу.
export const UNLOCK_GROUPS: Record<string, string> = {
  skills: 'cust_theme_cond_skills',
  words: 'cust_theme_cond_words',
  learned: 'cust_theme_cond_learned',
  goals: 'cust_theme_cond_goals',
  books: 'cust_theme_cond_books',
  workouts: 'cust_theme_cond_workouts',
  challenges: 'cust_theme_cond_challenges',
  milestones: 'cust_theme_cond_milestones',
}

export interface ThemeUnlockInfo {
  achievementKey: string
  achievementName: string
  condition: string | null // null — группа не описана
}

export function themeUnlockInfo(theme: ThemeKey): ThemeUnlockInfo | null {
  const ach = THEME_UNLOCK[theme]
  if (!ach) return null
  const m = /^([a-z]+)_(\d+)$/.exec(ach)
  const tpl = m ? UNLOCK_GROUPS[m[1]] : undefined
  return {
    achievementKey: ach,
    achievementName: t(('cust_ach_' + ach) as never),
    condition: m && tpl ? t(tpl as never).replace('{n}', m[2]) : null,
  }
}
