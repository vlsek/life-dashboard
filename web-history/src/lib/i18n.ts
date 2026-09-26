// Мини-словарь только для этой страницы — ровно те строки, что использует история
// (i18n.js целиком не модульный, чтобы его импортировать). Тексты скопированы дословно.

export function getLang(): 'en' | 'ru' {
  // Ровно как getLang() в i18n.js: по умолчанию "en", если ключ не задан
  try {
    return (localStorage.getItem('site_lang') || 'en') === 'ru' ? 'ru' : 'en'
  } catch {
    return 'en'
  }
}

const DICT = {
  en: {
    nav_open_menu: 'Open menu',
    nav_more: 'More sections',
    nav_dashboard: '🏠 Dashboard',
    nav_goals: '🎯 Goals',
    nav_skills: '🥋 Skills',
    nav_workouts: '🏋️ Workouts',
    nav_challenges: '🏁 Challenges',
    nav_english: '🌐 Languages',
    nav_calendar: '🗓️ Calendar',
    nav_milestones: '🚩 Milestones',
    nav_shop: '🛍️ Shop',
    nav_community: '🏆 Community',
    nav_history: '🕘 History',
    nav_account_title: 'Account',
    theme_dark: '🌑 Dark',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Light',
    theme_pink: '🌸 Pink',
    logout: 'Log out',
    pilot_badge: 'Vue pilot',
    hist_title: 'History',
    hist_h1: '🕘 History',
    hist_intro:
      "Progress by day and week. The fuller a day is filled, the more you got done; fully green means 100%. Tap a day to see the details.",
    hist_today_btn: 'Today',
    hist_week_col: 'Wk',
    hist_weeks_h2: '📊 Weeks',
    hist_stat_avg: 'Average',
    hist_stat_perfect: 'Perfect days',
    hist_stat_days: 'Days tracked',
    hist_no_data: 'No data for this period yet.',
    hist_future_day: "This day hasn't happened yet.",
    hist_done_of: 'done',
    hist_metrics_h: 'Metrics',
    hist_planned_h: 'Plans',
    hist_notes_h: 'Notes',
    hist_not_scheduled: 'not scheduled this day',
    hist_sets_word: 'sets',
    hist_reps_word: 'reps',
    dash_schedule_weekly_short: '×/wk',
    cal_goal_suffix: 'goal',
    dash_close_btn: 'Close',
    dash_weekdays_short: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
  },
  ru: {
    nav_open_menu: 'Открыть меню',
    nav_more: 'Остальные разделы',
    nav_dashboard: '🏠 Дашборд',
    nav_goals: '🎯 Цели',
    nav_skills: '🥋 Навыки',
    nav_workouts: '🏋️ Тренировки',
    nav_challenges: '🏁 Челленджи',
    nav_english: '🌐 Языки',
    nav_calendar: '🗓️ Календарь',
    nav_milestones: '🚩 Вехи',
    nav_shop: '🛍️ Магазин',
    nav_community: '🏆 Сообщество',
    nav_history: '🕘 История',
    nav_account_title: 'Аккаунт',
    theme_dark: '🌑 Тёмная',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Светлая',
    theme_pink: '🌸 Розовая',
    logout: 'Выйти',
    pilot_badge: 'Пилот на Vue',
    hist_title: 'История',
    hist_h1: '🕘 История',
    hist_intro:
      'Прогресс по дням и неделям. Чем полнее закрашен день, тем больше выполнено; полностью зелёный — 100%. Нажми на день, чтобы увидеть подробности.',
    hist_today_btn: 'Сегодня',
    hist_week_col: 'Нед.',
    hist_weeks_h2: '📊 Недели',
    hist_stat_avg: 'Средний',
    hist_stat_perfect: 'Идеальных дней',
    hist_stat_days: 'Дней с данными',
    hist_no_data: 'За этот период данных пока нет.',
    hist_future_day: 'Этот день ещё не наступил.',
    hist_done_of: 'выполнено',
    hist_metrics_h: 'Метрики',
    hist_planned_h: 'Планы',
    hist_notes_h: 'Заметки',
    hist_not_scheduled: 'в этот день не по расписанию',
    hist_sets_word: 'подх.',
    hist_reps_word: 'повт.',
    dash_schedule_weekly_short: '×/нед.',
    cal_goal_suffix: 'цель',
    dash_close_btn: 'Закрыть',
    dash_weekdays_short: 'Пн,Вт,Ср,Чт,Пт,Сб,Вс',
  },
} as const

export type DictKey = keyof (typeof DICT)['ru']

export function t(key: DictKey): string {
  return DICT[getLang()][key]
}

export function setLang(lang: 'en' | 'ru') {
  // Как и на остальном сайте: большая часть контента рендерится JS-ом, простой и
  // надёжный способ переключить язык везде — перезагрузить страницу.
  localStorage.setItem('site_lang', lang)
  location.reload()
}

export function locale(): string {
  return getLang() === 'en' ? 'en-US' : 'ru-RU'
}
