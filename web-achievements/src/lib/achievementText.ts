import { t, type DictKey } from './i18n'
import type { AchievementDef } from './achievements'

// Тексты достижений лежат в словаре страницы под ключами ach_t_<key> (название), ach_c_<key> («первые шаги») и
// ach_cond_<группа> (шаблон «…: {n}» для остальных). Тест achievementText.test.ts следит, чтобы у каждого достижения реестра
// были все тексты на обоих языках.
export function achievementTitle(def: AchievementDef): string {
  return t(('ach_t_' + def.key) as DictKey)
}

export function achievementCondition(def: AchievementDef): string {
  if (def.group === 'first') return t(('ach_c_' + def.key) as DictKey)
  return t(('ach_cond_' + def.group) as DictKey).replace('{n}', String(def.target))
}

export function groupTitle(group: string): string {
  return t(('ach_group_' + group) as DictKey)
}
