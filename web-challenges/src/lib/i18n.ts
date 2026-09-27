// Мини-словарь только для этой страницы — ровно те строки, что использует Challenges
// (i18n.js целиком не модульный, чтобы его импортировать). Тексты скопированы дословно
// из ch_* ключей i18n.js.

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
    ch_title: 'Challenges',
    ch_h1: '🏆 Challenges',
    ch_catalog_btn: '📋 Pick from catalog',
    ch_custom_btn: '➕ Custom challenge',
    ch_active_h2: '🔥 Active',
    ch_completed_h2: '✅ Completed',
    ch_catalog_title: '📋 Challenge catalog',
    ch_started_toast: 'Challenge started ✓',
    ch_custom_title: 'Custom challenge',
    ch_field_title: 'Title',
    ch_field_icon: 'Icon (emoji)',
    ch_field_type: 'Type',
    ch_type_daily_fixed: 'Fixed daily target (e.g. 100 push-ups a day)',
    ch_type_daily_progressive: 'Growing daily target (starts small, grows each day)',
    ch_type_daily_boolean: 'Daily habit — just check a box (e.g. no sugar)',
    ch_type_cumulative: 'Cumulative count with a list (e.g. read 100 books)',
    ch_field_duration: 'Duration, days',
    ch_field_daily_target: 'Daily target',
    ch_field_start_value: 'Day 1 target',
    ch_field_increment: 'Daily increment',
    ch_field_unit: 'Unit (e.g. reps, ml)',
    ch_field_target_count: 'Overall target count',
    ch_field_item_label: 'What to call one item (e.g. book)',
    ch_migration_hint: "most likely migrations/019_challenges.sql hasn't been run in Supabase yet",
    ch_no_active: 'No active challenges yet — pick one from the catalog or make your own.',
    ch_no_completed: 'Nothing completed yet.',
    ch_confirm_abandon: 'Abandon this challenge? Its progress will be hidden (not deleted).',
    ch_completed_toast: 'Challenge completed 🎉',
    ch_day_label: 'Day',
    ch_completed_days: 'done:',
    ch_done_today_label: 'Done today',
    ch_target_today: "Today's target:",
    ch_duration_over_note: 'Duration is over.',
    ch_mark_completed_btn: '🎉 Mark as completed',
    ch_item_placeholder_prefix: 'Which',
    ch_item_placeholder_generic: 'Item (optional note)',
    save: 'Save',
    cancel: 'Cancel',
    comm_load_error: "Couldn't load:",
    dash_save_error_generic: "Couldn't save: ",
    dash_delete_error_generic: "Couldn't delete: ",
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
    ch_title: 'Челленджи',
    ch_h1: '🏆 Челленджи',
    ch_catalog_btn: '📋 Выбрать из каталога',
    ch_custom_btn: '➕ Свой челлендж',
    ch_active_h2: '🔥 Активные',
    ch_completed_h2: '✅ Завершённые',
    ch_catalog_title: '📋 Каталог челленджей',
    ch_started_toast: 'Челлендж начат ✓',
    ch_custom_title: 'Свой челлендж',
    ch_field_title: 'Название',
    ch_field_icon: 'Иконка (эмодзи)',
    ch_field_type: 'Тип',
    ch_type_daily_fixed: 'Фиксированная дневная цель (напр. 100 отжиманий в день)',
    ch_type_daily_progressive: 'Растущая дневная цель (начинается с малого, растёт каждый день)',
    ch_type_daily_boolean: 'Ежедневная привычка — просто галочка (напр. без сахара)',
    ch_type_cumulative: 'Общий счётчик со списком (напр. прочитать 100 книг)',
    ch_field_duration: 'Длительность, дней',
    ch_field_daily_target: 'Дневная цель',
    ch_field_start_value: 'Цель на 1-й день',
    ch_field_increment: 'Прирост в день',
    ch_field_unit: 'Единица (напр. раз, мл)',
    ch_field_target_count: 'Общая цель (количество)',
    ch_field_item_label: 'Как называть один пункт (напр. книга)',
    ch_migration_hint: 'вероятно, ещё не прогнана migrations/019_challenges.sql в Supabase',
    ch_no_active: 'Пока нет активных челленджей — выбери из каталога или заведи свой.',
    ch_no_completed: 'Пока ничего не завершено.',
    ch_confirm_abandon: 'Бросить этот челлендж? Прогресс скроется (не удалится).',
    ch_completed_toast: 'Челлендж завершён 🎉',
    ch_day_label: 'День',
    ch_completed_days: 'выполнено:',
    ch_done_today_label: 'Сделано сегодня',
    ch_target_today: 'Цель на сегодня:',
    ch_duration_over_note: 'Срок челленджа истёк.',
    ch_mark_completed_btn: '🎉 Отметить завершённым',
    ch_item_placeholder_prefix: 'Какая',
    ch_item_placeholder_generic: 'Пункт (заметка, необязательно)',
    save: 'Сохранить',
    cancel: 'Отмена',
    comm_load_error: 'Не удалось загрузить:',
    dash_save_error_generic: 'Не удалось сохранить: ',
    dash_delete_error_generic: 'Не удалось удалить: ',
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
