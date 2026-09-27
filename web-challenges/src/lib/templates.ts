import { getLang } from './i18n'
import type { ChallengeTemplate } from './types'

// Каталог готовых челленджей — портировано дословно из CHALLENGE_TEMPLATES_RU/EN
// в challenges.js. Зашит в код, как и в оригинале (ничего специфичного для БД).
const CHALLENGE_TEMPLATES_RU: ChallengeTemplate[] = [
  {
    id: 'pushups_100_30', icon: '💪', title: '100 отжиманий каждый день — месяц',
    description: 'Каждый день отжиматься минимум 100 раз (можно за несколько подходов). 30 дней подряд.',
    type: 'daily_fixed', durationDays: 30, dailyTarget: 100, unit: 'раз',
  },
  {
    id: 'pushups_progressive_30', icon: '📈', title: 'Отжимания с шагом +5 в день — месяц',
    description: 'Начинаешь с 10 отжиманий в первый день, каждый следующий день цель растёт на 5. К концу месяца — больше 150 за день.',
    type: 'daily_progressive', durationDays: 30, startValue: 10, dailyIncrement: 5, unit: 'раз',
  },
  {
    id: 'no_sugar_21', icon: '🍬', title: 'Без сахара — 21 день',
    description: '21 день без добавленного сахара. Просто отмечаешь каждый день галочкой.',
    type: 'daily_boolean', durationDays: 21,
  },
  {
    id: 'cold_shower_30', icon: '🥶', title: 'Холодный душ каждый день — месяц',
    description: '30 дней подряд заканчивать душ холодной водой.',
    type: 'daily_boolean', durationDays: 30,
  },
  {
    id: 'read_100_books', icon: '📚', title: 'Прочитать 100 книг',
    description: 'Без ограничения по времени — веди учёт каждой прочитанной книги.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'книга',
  },
  {
    id: 'words_100', icon: '🗣️', title: 'Выучить 100 новых слов',
    description: 'Веди учёт каждого выученного слова.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'слово',
  },
]
const CHALLENGE_TEMPLATES_EN: ChallengeTemplate[] = [
  {
    id: 'pushups_100_30', icon: '💪', title: '100 push-ups every day — a month',
    description: 'Do at least 100 push-ups every day (can be split into sets). 30 days in a row.',
    type: 'daily_fixed', durationDays: 30, dailyTarget: 100, unit: 'reps',
  },
  {
    id: 'pushups_progressive_30', icon: '📈', title: 'Push-ups +5 per day — a month',
    description: 'Start with 10 push-ups on day one, the target grows by 5 each day. By the end of the month — over 150 in a day.',
    type: 'daily_progressive', durationDays: 30, startValue: 10, dailyIncrement: 5, unit: 'reps',
  },
  {
    id: 'no_sugar_21', icon: '🍬', title: 'No sugar — 21 days',
    description: '21 days without added sugar. Just check a box each day.',
    type: 'daily_boolean', durationDays: 21,
  },
  {
    id: 'cold_shower_30', icon: '🥶', title: 'Cold shower every day — a month',
    description: 'End your shower with cold water for 30 days in a row.',
    type: 'daily_boolean', durationDays: 30,
  },
  {
    id: 'read_100_books', icon: '📚', title: 'Read 100 books',
    description: 'No time limit — keep track of every book you finish.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'book',
  },
  {
    id: 'words_100', icon: '🗣️', title: 'Learn 100 new words',
    description: 'Keep track of every word you learn.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'word',
  },
]

export function challengeTemplates(): ChallengeTemplate[] {
  return getLang() === 'en' ? CHALLENGE_TEMPLATES_EN : CHALLENGE_TEMPLATES_RU
}
