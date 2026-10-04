// Мини-словарь только для этой страницы — ровно те строки, что использует календарь
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
    nav_favorites: 'Favorites',
    nav_favorites_empty: 'Add pages to favorites with the heart at the top of a page',
    nav_dashboard: '🏠 Dashboard',
    nav_goals: '🎯 Goals',
    nav_skills: '🥋 Skills',
    nav_workouts: '🏋️ Workouts',
    nav_challenges: '🏁 Challenges',
    nav_english: '🌐 Languages',
    nav_calendar: '🗓️ Calendar',
    nav_milestones: '🚩 Milestones',
    nav_shop: '🛍️ Shop',
    nav_achievements: '🏅 Achievements',
    nav_customization: '🎨 Customization',
    nav_community: '🏆 Community',
    nav_history: '🕘 History',
    nav_account_title: 'Account',
    theme_dark: '🌑 Dark',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Light',
    theme_pink: '🌸 Pink',
    theme_mint: '🌿 Mint',
    theme_sepia: '📜 Sepia',
    theme_solarlight: '🌞 Solarized Light',
    theme_nord: '❄️ Nord',
    theme_mocha: '☕ Catppuccin Mocha',
    theme_amoled: '⚫ AMOLED',
    theme_contrast: '◐ High contrast',
    logout: 'Log out',
    cal_title: 'Calendar',
    cal_prev: '‹',
    cal_next: '›',
    cal_today_btn: 'Today',
    cal_plan_for: '📌 Plan for',
    cal_empty: 'Nothing here yet.',
    cal_goal_suffix: 'goal',
    cal_new_item_placeholder: 'New plan item…',
    cal_hint:
      "This is your plan for the day — it'll show up in \"📌 Today's goals\" on the dashboard. Goals from the Goals section aren't added here, only your own items.",
    cal_items_word: 'item(s)',
    cal_done_word: 'done',
    save: 'Save',
    cancel: 'Cancel',
    saved_toast: 'Saved ✓',
    dash_save_error_generic: "Couldn't save: ",
    comm_load_error: "Couldn't load:",
    dash_close_btn: 'Close',
    close: "Close",
    changelog_title: "📋 What's new",
    changelog_empty: "No history yet.",
  },
  ru: {
    nav_open_menu: 'Открыть меню',
    nav_more: 'Остальные разделы',
    nav_favorites: 'Избранное',
    nav_favorites_empty: 'Добавьте страницы в избранное — сердечком вверху страницы',
    nav_dashboard: '🏠 Дашборд',
    nav_goals: '🎯 Цели',
    nav_skills: '🥋 Навыки',
    nav_workouts: '🏋️ Тренировки',
    nav_challenges: '🏁 Челленджи',
    nav_english: '🌐 Языки',
    nav_calendar: '🗓️ Календарь',
    nav_milestones: '🚩 Вехи',
    nav_shop: '🛍️ Магазин',
    nav_achievements: '🏅 Достижения',
    nav_customization: '🎨 Кастомизация',
    nav_community: '🏆 Сообщество',
    nav_history: '🕘 История',
    nav_account_title: 'Аккаунт',
    theme_dark: '🌑 Тёмная',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Светлая',
    theme_pink: '🌸 Розовая',
    theme_mint: '🌿 Mint (мятная)',
    theme_sepia: '📜 Сепия',
    theme_solarlight: '🌞 Solarized Light',
    theme_nord: '❄️ Nord',
    theme_mocha: '☕ Catppuccin Mocha',
    theme_amoled: '⚫ AMOLED (чёрная)',
    theme_contrast: '◐ Высокий контраст',
    logout: 'Выйти',
    cal_title: 'Календарь',
    cal_prev: '‹',
    cal_next: '›',
    cal_today_btn: 'Сегодня',
    cal_plan_for: '📌 План на',
    cal_empty: 'Пока пусто.',
    cal_goal_suffix: 'цель',
    cal_new_item_placeholder: 'Новый пункт плана…',
    cal_hint:
      'Это план на день — попадёт в «📌 Цели на сегодня» на дашборде. Отдельные цели из раздела «Цели» сюда не добавляются, только свои пункты.',
    cal_items_word: 'пункт(ов)',
    cal_done_word: 'выполнено',
    save: 'Сохранить',
    cancel: 'Отмена',
    saved_toast: 'Сохранено ✓',
    dash_save_error_generic: 'Не удалось сохранить: ',
    comm_load_error: 'Не удалось загрузить:',
    dash_close_btn: 'Закрыть',
    close: "Закрыть",
    changelog_title: "📋 Что нового",
    changelog_empty: "История пока пуста.",
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
