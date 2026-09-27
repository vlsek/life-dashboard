// Мини-словарь только для этой страницы — ровно те строки, что использует Community
// (i18n.js целиком не модульный, чтобы его импортировать). Тексты скопированы дословно.
// Секция "Сравнение по активностям" (category leaderboard + личный график) сюда
// намеренно не перенесена — см. TODO в App.vue.

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
    comm_title: 'Community',
    comm_h1: '🏆 Community',
    comm_privacy_1: 'Others can see: your public name (set below), total points, streak, and your "what I did today" note — if you wrote one.',
    comm_friends_h2: '🤝 Friends',
    comm_leaderboard_h2: '🥇 Leaderboard (all time)',
    comm_scope_everyone: 'Everyone',
    comm_scope_friends: 'Friends only',
    comm_today_h2: '📝 What they did today',
    comm_no_name: 'No name',
    comm_no_follows: 'Not following anyone yet.',
    comm_search_placeholder: "friend's email or nickname",
    comm_follow_btn: '➕ Follow',
    comm_user_not_found_email: 'No user found with that email.',
    comm_user_not_found_name: 'No user found with that nickname.',
    comm_thats_you: "That's you 🙂",
    comm_follow_error: "Couldn't follow (maybe already following): ",
    comm_follow_added_toast: 'Follow added ✓',
    comm_load_error: "Couldn't load:",
    comm_empty: 'Nothing here yet.',
    comm_perfect_streak_title: 'Perfect days in a row:',
    comm_today_word: 'today',
    comm_public_profile_title: 'Public profile',
    comm_display_name_label: 'How others see you in the community',
    comm_visibility_label: 'Show me in leaderboards and the community feed',
    comm_visibility_hint: "If turned off, others won't see you, but you'll still see yourself in the lists.",
    comm_public_profile_btn: '⚙️ Public profile',
    loading_ellipsis: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
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
    comm_title: 'Сообщество',
    comm_h1: '🏆 Сообщество',
    comm_privacy_1: 'Другим видно: твоё публичное имя (задаётся ниже), сумму баллов, streak, и заметку "что сделал сегодня" — если сам её написал.',
    comm_friends_h2: '🤝 Друзья',
    comm_leaderboard_h2: '🥇 Лидерборд (всё время)',
    comm_scope_everyone: 'Все',
    comm_scope_friends: 'Только друзья',
    comm_today_h2: '📝 Что сделали сегодня',
    comm_no_name: 'Без имени',
    comm_no_follows: 'Пока ни на кого не подписан.',
    comm_search_placeholder: 'email или ник друга',
    comm_follow_btn: '➕ Подписаться',
    comm_user_not_found_email: 'Пользователь с таким email не найден.',
    comm_user_not_found_name: 'Пользователь с таким ником не найден.',
    comm_thats_you: 'Это ты 🙂',
    comm_follow_error: 'Не удалось подписаться (возможно, уже подписан): ',
    comm_follow_added_toast: 'Подписка добавлена ✓',
    comm_load_error: 'Не удалось загрузить:',
    comm_empty: 'Пока пусто.',
    comm_perfect_streak_title: 'Идеальных дней подряд:',
    comm_today_word: 'сегодня',
    comm_public_profile_title: 'Публичный профиль',
    comm_display_name_label: 'Как тебя видят другие в сообществе',
    comm_visibility_label: 'Показывать меня в лидербордах и ленте сообщества',
    comm_visibility_hint: 'Если выключить — тебя не увидят другие, но сам себя ты по-прежнему видишь в списках.',
    comm_public_profile_btn: '⚙️ Публичный профиль',
    loading_ellipsis: 'Загрузка…',
    save: 'Сохранить',
    cancel: 'Отмена',
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
