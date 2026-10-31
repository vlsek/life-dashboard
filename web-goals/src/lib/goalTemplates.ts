// Каталог шаблонов целей (BACKLOG 76.8): готовые цели с этапами и сложностью; данные в репозитории, не в базе.
// Выбор шаблона НЕ создаёт цель: открывается обычная форма, уже заполненная, — можно поправить и сохранить.
// Срок и горизонт в шаблоне не задаются — их выбирает человек сам (без колонки horizon часть горизонтов недоступна).
import type { Difficulty, GoalFormInitial } from './types'
import { pointsForDifficulty } from './goals'

export type GoalTemplateGroup = 'sport' | 'study' | 'health' | 'money' | 'home' | 'create'

export interface GoalTemplate {
  id: string
  group: GoalTemplateGroup
  stages: number
  difficulty: Exclude<Difficulty, null>
  ru: { name: string }
  en: { name: string }
}

export const TEMPLATE_GROUP_ORDER: readonly GoalTemplateGroup[] = ['sport', 'health', 'study', 'money', 'home', 'create']

// Название группы одновременно служит категорией цели (категории у целей — свободный текст, как у уже введённых).
export const TEMPLATE_GROUP_LABEL: Record<GoalTemplateGroup, { ru: string; en: string }> = {
  sport: { ru: 'Спорт', en: 'Sport' },
  health: { ru: 'Здоровье', en: 'Health' },
  study: { ru: 'Учёба', en: 'Study' },
  money: { ru: 'Финансы', en: 'Money' },
  home: { ru: 'Дом', en: 'Home' },
  create: { ru: 'Творчество', en: 'Creative' },
}

export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  { id: 'sport_10k', group: 'sport', stages: 6, difficulty: 'medium', ru: { name: 'Пробежать 10 км без остановки' }, en: { name: 'Run 10 km without stopping' } },
  { id: 'sport_pullups', group: 'sport', stages: 5, difficulty: 'medium', ru: { name: 'Подтянуться 10 раз подряд' }, en: { name: 'Do 10 pull-ups in a row' } },
  { id: 'sport_split', group: 'sport', stages: 8, difficulty: 'hard', ru: { name: 'Сесть на шпагат' }, en: { name: 'Do the splits' } },
  { id: 'sport_30', group: 'sport', stages: 30, difficulty: 'hard', ru: { name: '30 тренировок' }, en: { name: '30 workouts' } },
  { id: 'health_checkup', group: 'health', stages: 3, difficulty: 'easy', ru: { name: 'Пройти плановый осмотр' }, en: { name: 'Get a routine check-up' } },
  { id: 'health_sleep', group: 'health', stages: 4, difficulty: 'medium', ru: { name: 'Наладить режим сна' }, en: { name: 'Fix my sleep schedule' } },
  { id: 'health_water', group: 'health', stages: 4, difficulty: 'easy', ru: { name: 'Привыкнуть пить воду по норме' }, en: { name: 'Build a habit of drinking enough water' } },
  { id: 'study_book', group: 'study', stages: 10, difficulty: 'medium', ru: { name: 'Прочитать большую книгу' }, en: { name: 'Read a big book' } },
  { id: 'study_course', group: 'study', stages: 12, difficulty: 'hard', ru: { name: 'Пройти онлайн-курс до конца' }, en: { name: 'Finish an online course' } },
  { id: 'study_lang', group: 'study', stages: 6, difficulty: 'hard', ru: { name: 'Выйти на новый уровень языка' }, en: { name: 'Reach the next language level' } },
  { id: 'money_cushion', group: 'money', stages: 6, difficulty: 'hard', ru: { name: 'Накопить подушку безопасности' }, en: { name: 'Build an emergency fund' } },
  { id: 'money_budget', group: 'money', stages: 3, difficulty: 'easy', ru: { name: 'Составить бюджет и вести его месяц' }, en: { name: 'Make a budget and keep it for a month' } },
  { id: 'home_declutter', group: 'home', stages: 5, difficulty: 'medium', ru: { name: 'Разобрать хлам по комнатам' }, en: { name: 'Declutter room by room' } },
  { id: 'home_repair', group: 'home', stages: 4, difficulty: 'medium', ru: { name: 'Закончить давний ремонт' }, en: { name: 'Finish an overdue repair' } },
  { id: 'create_project', group: 'create', stages: 5, difficulty: 'medium', ru: { name: 'Довести личный проект до готового' }, en: { name: 'Finish a personal project' } },
  { id: 'create_write', group: 'create', stages: 10, difficulty: 'medium', ru: { name: 'Написать 10 текстов' }, en: { name: 'Write 10 pieces' } },
]

export function templatesByGroup(): [GoalTemplateGroup, GoalTemplate[]][] {
  return TEMPLATE_GROUP_ORDER.map((g) => [g, GOAL_TEMPLATES.filter((t) => t.group === g)] as [GoalTemplateGroup, GoalTemplate[]]).filter(([, l]) => l.length)
}

// Черновик для обычной формы цели; баллы считаются по сложности, как у любой цели.
export function templateDraft(tpl: GoalTemplate, lang: 'ru' | 'en'): GoalFormInitial {
  return { name: tpl[lang].name, points: pointsForDifficulty(tpl.difficulty), category: TEMPLATE_GROUP_LABEL[tpl.group][lang], stages: tpl.stages, difficulty: tpl.difficulty, deadline: '' }
}
