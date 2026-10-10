import { t, type DictKey } from './i18n'
import type { AchievementDef } from './achievements'
import { REWARD_STATUS, type Reward, type RewardStatus } from './rewards'

// Тексты достижений лежат в словаре страницы под ключами ach_t_<key> (название), ach_c_<key> («первые шаги») и
// ach_cond_<группа> (шаблон «…: {n}» для остальных). Тест achievementText.test.ts следит, чтобы у каждого достижения реестра
// были все тексты на обоих языках.
export function achievementTitle(def: AchievementDef): string {
  return t(('ach_t_' + def.key) as DictKey)
}

export function achievementCondition(def: AchievementDef): string {
  if (def.group === 'first' || def.group === 'secret') return t(('ach_c_' + def.key) as DictKey)
  return t(('ach_cond_' + def.group) as DictKey).replace('{n}', String(def.target))
}

export function groupTitle(group: string): string {
  return t(('ach_group_' + group) as DictKey)
}

// «Награда: 20 монет» / «Награда (скоро): рамка «Чернильная»» / «…: тема «Сепия»». Статус по умолчанию — из REWARD_STATUS (rewards.ts):
// пока награда не выдаётся по-настоящему, обещать её без «скоро» нельзя.
export function rewardText(r: Reward, status: RewardStatus = REWARD_STATUS[r.kind]): string {
  const what =
    r.kind === 'coins'
      ? t('ach_reward_coins').replace('{n}', String(r.amount))
      : r.kind === 'item'
        ? t('ach_reward_item').replace('{name}', t(('ach_reward_item_' + r.key) as DictKey))
        : t('ach_reward_theme').replace('{name}', t(('ach_reward_theme_' + r.key) as DictKey))
  return t(status === 'active' ? 'ach_reward_line' : 'ach_reward_line_soon').replace('{what}', what)
}
