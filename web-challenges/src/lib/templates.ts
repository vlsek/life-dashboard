import { getLang } from './i18n'
import type { ChallengeTemplate } from './types'

// Каталог готовых челленджей — портировано дословно из CHALLENGE_TEMPLATES_RU/EN
// в challenges.js. Зашит в код, как и в оригинале (ничего специфичного для БД).
const CHALLENGE_TEMPLATES_RU: ChallengeTemplate[] = [
  {
    id: 'pushups_100_30', category: 'sport', icon: '💪', title: '100 отжиманий каждый день — месяц',
    description: 'Каждый день отжиматься минимум 100 раз (можно за несколько подходов). 30 дней подряд.',
    type: 'daily_fixed', durationDays: 30, dailyTarget: 100, unit: 'раз',
  },
  {
    id: 'pushups_progressive_30', category: 'sport', icon: '📈', title: 'Отжимания с шагом +5 в день — месяц',
    description: 'Начинаешь с 10 отжиманий в первый день, каждый следующий день цель растёт на 5. К концу месяца — больше 150 за день.',
    type: 'daily_progressive', durationDays: 30, startValue: 10, dailyIncrement: 5, unit: 'раз',
  },
  {
    id: 'no_sugar_21', category: 'health', icon: '🍬', title: 'Без сахара — 21 день',
    description: '21 день без добавленного сахара. Просто отмечаешь каждый день галочкой.',
    type: 'daily_boolean', durationDays: 21,
  },
  {
    id: 'cold_shower_30', category: 'health', icon: '🥶', title: 'Холодный душ каждый день — месяц',
    description: '30 дней подряд заканчивать душ холодной водой.',
    type: 'daily_boolean', durationDays: 30,
  },
  {
    id: 'read_100_books', category: 'mind', icon: '📚', title: 'Прочитать 100 книг',
    description: 'Без ограничения по времени — веди учёт каждой прочитанной книги.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'книга',
  },
  {
    id: 'words_100', category: 'mind', icon: '🗣️', title: 'Выучить 100 новых слов',
    description: 'Веди учёт каждого выученного слова.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'слово',
  },
  // Расширение каталога (BACKLOG 44.6, срез 1)
  { id: 'steps_10k_30', icon: '🚶', category: 'sport', title: "10 000 шагов каждый день — месяц", description: "Каждый день проходить не меньше 10 000 шагов. Записывай число из шагомера.", type: 'daily_fixed', durationDays: 30, dailyTarget: 10000, unit: "шагов" },
  { id: 'run_every_other_30', icon: '🏃', category: 'sport', title: "Пробежка или прогулка каждый день — месяц", description: "30 дней подряд хотя бы 20 минут движения на улице. Отмечай каждый день галочкой.", type: 'daily_boolean', durationDays: 30 },
  { id: 'squats_50_30', icon: '🦵', category: 'sport', title: "50 приседаний каждый день — месяц", description: "Каждый день не меньше 50 приседаний (можно за несколько подходов).", type: 'daily_fixed', durationDays: 30, dailyTarget: 50, unit: "раз" },
  { id: 'plank_progressive_30', icon: '🏋', category: 'sport', title: "Планка: +5 секунд каждый день — месяц", description: "Начинаешь с 30 секунд, каждый день цель растёт на 5. К концу месяца — почти три минуты.", type: 'daily_progressive', durationDays: 30, startValue: 30, dailyIncrement: 5, unit: "сек" },
  { id: 'pullups_progressive_20', icon: '🏋', category: 'sport', title: "Подтягивания: +1 в день — 20 дней", description: "В первый день одно подтягивание, каждый следующий день на одно больше. К концу — 20 за день.", type: 'daily_progressive', durationDays: 20, startValue: 1, dailyIncrement: 1, unit: "раз" },
  { id: 'stretch_30', icon: '🧘', category: 'sport', title: "Растяжка каждый день — месяц", description: "10 минут растяжки или йоги каждый день. Просто отмечай галочкой.", type: 'daily_boolean', durationDays: 30 },
  { id: 'water_2l_30', icon: '💧', category: 'health', title: "Вода: 2 литра в день — месяц", description: "Каждый день выпивать не меньше 2000 мл воды.", type: 'daily_fixed', durationDays: 30, dailyTarget: 2000, unit: "мл" },
  { id: 'sleep_early_21', icon: '😴', category: 'health', title: "Ложиться до 23:00 — 21 день", description: "21 день подряд укладываться спать до 23:00. Отмечай каждый вечер.", type: 'daily_boolean', durationDays: 21 },
  { id: 'no_alcohol_30', icon: '🍎', category: 'health', title: "Без алкоголя — 30 дней", description: "Месяц без алкоголя. Каждый день отмечай галочкой.", type: 'daily_boolean', durationDays: 30 },
  { id: 'veggies_21', icon: '🥗', category: 'health', title: "Овощи в каждом приёме пищи — 21 день", description: "Добавлять овощи или зелень хотя бы в два приёма пищи в день.", type: 'daily_boolean', durationDays: 21 },
  { id: 'teeth_floss_21', icon: '🦷', category: 'health', title: "Зубная нить каждый вечер — 21 день", description: "Чистить зубы нитью каждый вечер. Привычка закрепляется за три недели.", type: 'daily_boolean', durationDays: 21 },
  { id: 'read_20_pages_30', icon: '📖', category: 'mind', title: "20 страниц в день — месяц", description: "Каждый день читать не меньше 20 страниц.", type: 'daily_fixed', durationDays: 30, dailyTarget: 20, unit: "стр." },
  { id: 'words_5_30', icon: '🗣️', category: 'mind', title: "5 новых слов в день — месяц", description: "Каждый день учить по 5 новых слов. К концу месяца — 150.", type: 'daily_fixed', durationDays: 30, dailyTarget: 5, unit: "слов" },
  { id: 'code_daily_30', icon: '💻', category: 'mind', title: "Код каждый день — месяц", description: "Хотя бы 30 минут практики программирования каждый день.", type: 'daily_boolean', durationDays: 30 },
  { id: 'journal_21', icon: '📝', category: 'mind', title: "Дневник — 21 день", description: "Каждый вечер записывать три вещи, за которые благодарен.", type: 'daily_boolean', durationDays: 21 },
  { id: 'focus_25', icon: '🧠', category: 'mind', title: "4 помодоро в день — 14 дней", description: "Каждый день 4 рабочих интервала по 25 минут без отвлечений.", type: 'daily_fixed', durationDays: 14, dailyTarget: 4, unit: "помодоро" },
  { id: 'save_daily_30', icon: '💰', category: 'life', title: "Откладывать деньги каждый день — месяц", description: "Каждый день откладывать любую сумму. Важна привычка, а не размер.", type: 'daily_boolean', durationDays: 30 },
  { id: 'tidy_10_21', icon: '🏠', category: 'life', title: "Уборка 10 минут в день — 21 день", description: "Каждый день 10 минут наводить порядок. Таймер в помощь.", type: 'daily_boolean', durationDays: 21 },
  { id: 'workouts_50', icon: '🏋', category: 'sport', title: "50 тренировок", description: "Без ограничения по времени — веди учёт каждой тренировки.", type: 'cumulative_count', targetCount: 50, itemLabel: "тренировка" },
  { id: 'skills_10', icon: '🎯', category: 'mind', title: "Освоить 10 навыков", description: "Без ограничения по времени — отмечай каждый освоенный навык.", type: 'cumulative_count', targetCount: 10, itemLabel: "навык" },
]
const CHALLENGE_TEMPLATES_EN: ChallengeTemplate[] = [
  {
    id: 'pushups_100_30', category: 'sport', icon: '💪', title: '100 push-ups every day — a month',
    description: 'Do at least 100 push-ups every day (can be split into sets). 30 days in a row.',
    type: 'daily_fixed', durationDays: 30, dailyTarget: 100, unit: 'reps',
  },
  {
    id: 'pushups_progressive_30', category: 'sport', icon: '📈', title: 'Push-ups +5 per day — a month',
    description: 'Start with 10 push-ups on day one, the target grows by 5 each day. By the end of the month — over 150 in a day.',
    type: 'daily_progressive', durationDays: 30, startValue: 10, dailyIncrement: 5, unit: 'reps',
  },
  {
    id: 'no_sugar_21', category: 'health', icon: '🍬', title: 'No sugar — 21 days',
    description: '21 days without added sugar. Just check a box each day.',
    type: 'daily_boolean', durationDays: 21,
  },
  {
    id: 'cold_shower_30', category: 'health', icon: '🥶', title: 'Cold shower every day — a month',
    description: 'End your shower with cold water for 30 days in a row.',
    type: 'daily_boolean', durationDays: 30,
  },
  {
    id: 'read_100_books', category: 'mind', icon: '📚', title: 'Read 100 books',
    description: 'No time limit — keep track of every book you finish.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'book',
  },
  {
    id: 'words_100', category: 'mind', icon: '🗣️', title: 'Learn 100 new words',
    description: 'Keep track of every word you learn.',
    type: 'cumulative_count', targetCount: 100, itemLabel: 'word',
  },
  // Расширение каталога (BACKLOG 44.6, срез 1)
  { id: 'steps_10k_30', icon: '🚶', category: 'sport', title: "10,000 steps every day — a month", description: "Walk at least 10,000 steps every day. Log the number from your pedometer.", type: 'daily_fixed', durationDays: 30, dailyTarget: 10000, unit: "steps" },
  { id: 'run_every_other_30', icon: '🏃', category: 'sport', title: "A run or walk every day — a month", description: "At least 20 minutes outdoors for 30 days in a row. Check a box each day.", type: 'daily_boolean', durationDays: 30 },
  { id: 'squats_50_30', icon: '🦵', category: 'sport', title: "50 squats every day — a month", description: "At least 50 squats every day (sets are fine).", type: 'daily_fixed', durationDays: 30, dailyTarget: 50, unit: "reps" },
  { id: 'plank_progressive_30', icon: '🏋', category: 'sport', title: "Plank: +5 seconds a day — a month", description: "Start at 30 seconds, the target grows by 5 each day. Almost three minutes by the end of the month.", type: 'daily_progressive', durationDays: 30, startValue: 30, dailyIncrement: 5, unit: "sec" },
  { id: 'pullups_progressive_20', icon: '🏋', category: 'sport', title: "Pull-ups: +1 a day — 20 days", description: "One pull-up on day one, one more each day after. 20 in a day by the end.", type: 'daily_progressive', durationDays: 20, startValue: 1, dailyIncrement: 1, unit: "reps" },
  { id: 'stretch_30', icon: '🧘', category: 'sport', title: "Stretching every day — a month", description: "10 minutes of stretching or yoga every day. Just check a box.", type: 'daily_boolean', durationDays: 30 },
  { id: 'water_2l_30', icon: '💧', category: 'health', title: "Water: 2 litres a day — a month", description: "Drink at least 2000 ml of water every day.", type: 'daily_fixed', durationDays: 30, dailyTarget: 2000, unit: "ml" },
  { id: 'sleep_early_21', icon: '😴', category: 'health', title: "In bed before 11 pm — 21 days", description: "Go to bed before 11 pm for 21 days in a row. Check a box each evening.", type: 'daily_boolean', durationDays: 21 },
  { id: 'no_alcohol_30', icon: '🍎', category: 'health', title: "No alcohol — 30 days", description: "A month without alcohol. Check a box every day.", type: 'daily_boolean', durationDays: 30 },
  { id: 'veggies_21', icon: '🥗', category: 'health', title: "Veggies with every meal — 21 days", description: "Add vegetables or greens to at least two meals a day.", type: 'daily_boolean', durationDays: 21 },
  { id: 'teeth_floss_21', icon: '🦷', category: 'health', title: "Floss every evening — 21 days", description: "Floss every evening. Three weeks is enough to make it a habit.", type: 'daily_boolean', durationDays: 21 },
  { id: 'read_20_pages_30', icon: '📖', category: 'mind', title: "20 pages a day — a month", description: "Read at least 20 pages every day.", type: 'daily_fixed', durationDays: 30, dailyTarget: 20, unit: "pages" },
  { id: 'words_5_30', icon: '🗣️', category: 'mind', title: "5 new words a day — a month", description: "Learn 5 new words every day. 150 by the end of the month.", type: 'daily_fixed', durationDays: 30, dailyTarget: 5, unit: "words" },
  { id: 'code_daily_30', icon: '💻', category: 'mind', title: "Code every day — a month", description: "At least 30 minutes of coding practice every day.", type: 'daily_boolean', durationDays: 30 },
  { id: 'journal_21', icon: '📝', category: 'mind', title: "Journal — 21 days", description: "Every evening write down three things you are grateful for.", type: 'daily_boolean', durationDays: 21 },
  { id: 'focus_25', icon: '🧠', category: 'mind', title: "4 pomodoros a day — 14 days", description: "Four 25-minute focused work sessions every day.", type: 'daily_fixed', durationDays: 14, dailyTarget: 4, unit: "pomodoros" },
  { id: 'save_daily_30', icon: '💰', category: 'life', title: "Save money every day — a month", description: "Put away any amount every day. The habit matters, not the size.", type: 'daily_boolean', durationDays: 30 },
  { id: 'tidy_10_21', icon: '🏠', category: 'life', title: "Tidy for 10 minutes a day — 21 days", description: "Tidy up for 10 minutes every day. A timer helps.", type: 'daily_boolean', durationDays: 21 },
  { id: 'workouts_50', icon: '🏋', category: 'sport', title: "50 workouts", description: "No time limit — keep track of every workout.", type: 'cumulative_count', targetCount: 50, itemLabel: "workout" },
  { id: 'skills_10', icon: '🎯', category: 'mind', title: "Master 10 skills", description: "No time limit — log every skill you master.", type: 'cumulative_count', targetCount: 10, itemLabel: "skill" },
]

export function challengeTemplates(): ChallengeTemplate[] {
  return getLang() === 'en' ? CHALLENGE_TEMPLATES_EN : CHALLENGE_TEMPLATES_RU
}
