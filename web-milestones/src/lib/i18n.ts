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
    ms_title: 'Milestones',
    ms_h1: '🚩 Milestones',
    ms_no_active:
      'Nothing here yet. Add your first one, for example "Oil change" with the last date and "every 6 months".',
    ms_no_category: 'Other',
    ms_due_in: 'in',
    ms_due_today: 'due today',
    ms_overdue_by: 'overdue by',
    ms_days_short: 'd',
    ms_mark_done_title: 'Done',
    ms_mark_done_btn: 'Mark as done',
    ms_confirm_delete: 'Delete this milestone with its history?',
    ms_summary_overdue: 'Overdue:',
    ms_summary_soon: 'Due within 14 days:',
    ms_done_h2: '✅ Completed one-offs',
    ms_no_done: 'No completed one-off milestones yet.',
    comm_load_error: "Couldn't load:",
    dash_close_btn: 'Close',
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
    ms_title: 'Вехи',
    ms_h1: '🚩 Вехи',
    ms_no_active: 'Пока пусто. Добавь первую, например «Замена масла» с датой последнего раза и «каждые 6 месяцев».',
    ms_no_category: 'Прочее',
    ms_due_in: 'через',
    ms_due_today: 'срок сегодня',
    ms_overdue_by: 'просрочено на',
    ms_days_short: 'дн.',
    ms_mark_done_title: 'Сделано',
    ms_mark_done_btn: 'Отметить как сделанное',
    ms_confirm_delete: 'Удалить веху вместе с историей?',
    ms_summary_overdue: 'Просрочено:',
    ms_summary_soon: 'Скоро (14 дней):',
    ms_done_h2: '✅ Выполненные разовые',
    ms_no_done: 'Выполненных разовых вех пока нет.',
    comm_load_error: 'Не удалось загрузить:',
    dash_close_btn: 'Закрыть',
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
