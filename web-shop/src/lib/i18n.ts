// Мини-словарь только для этой страницы — ровно те строки, что использует Shop
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
    nav_community: '🏆 Community',
    nav_history: '🕘 History',
    nav_account_title: 'Account',
    theme_dark: '🌑 Dark',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Light',
    theme_pink: '🌸 Pink',
    logout: 'Log out',
    shop_title: 'Shop',
    shop_h1: '🛍️ Points shop',
    shop_intro: 'Earn points from daily goals and long-term goals, spend them here — "permission to buy myself something".',
    shop_add_item_btn: '➕ Add item',
    loading_ellipsis: 'Loading…',
    dash_balance_label: '💰 Balance:',
    shop_points_word: 'points',
    shop_total_earned: 'Total earned:',
    shop_total_spent: 'Spent:',
    shop_list_empty: "List is empty — add something you'd like to allow yourself.",
    shop_bought_prefix: '✅ Bought',
    shop_buy_btn: 'Buy 🛒',
    shop_not_enough: 'Short by',
    shop_progress_ready: '✓ Enough to buy',
    shop_upload_error: "Couldn't upload image: ",
    shop_edit_title: 'Edit item',
    shop_new_title: 'New shop item',
    shop_field_name: 'Name',
    shop_field_link: 'Item link (optional)',
    shop_field_cost: 'Cost in points',
    shop_field_image: 'Image — paste a link OR upload a file below',
    shop_confirm_delete: 'Delete this item?',
    save: 'Save',
    cancel: 'Cancel',
    comm_load_error: "Couldn't load:",
    dash_save_error_generic: "Couldn't save: ",
    dash_delete_error_generic: "Couldn't delete: ",
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
    nav_community: '🏆 Сообщество',
    nav_history: '🕘 История',
    nav_account_title: 'Аккаунт',
    theme_dark: '🌑 Тёмная',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Светлая',
    theme_pink: '🌸 Розовая',
    logout: 'Выйти',
    shop_title: 'Магазин',
    shop_h1: '🛍️ Магазин за баллы',
    shop_intro: 'Копишь баллы за ежедневные цели и долгосрочные цели, тратишь здесь — "разрешаю себе купить".',
    shop_add_item_btn: '➕ Добавить товар',
    loading_ellipsis: 'Загрузка…',
    dash_balance_label: '💰 Баланс:',
    shop_points_word: 'баллов',
    shop_total_earned: 'Заработано всего:',
    shop_total_spent: 'Потрачено:',
    shop_list_empty: 'Список пуст — добавь, что хочешь себе разрешить.',
    shop_bought_prefix: '✅ Куплено',
    shop_buy_btn: 'Купить 🛒',
    shop_not_enough: 'Не хватает',
    shop_progress_ready: '✓ Хватает на покупку',
    shop_upload_error: 'Не удалось загрузить картинку: ',
    shop_edit_title: 'Изменить товар',
    shop_new_title: 'Новая позиция в магазине',
    shop_field_name: 'Название',
    shop_field_link: 'Ссылка на товар (необязательно)',
    shop_field_cost: 'Цена в баллах',
    shop_field_image: 'Картинка — вставь ссылку ИЛИ загрузи файл ниже',
    shop_confirm_delete: 'Удалить эту позицию?',
    save: 'Сохранить',
    cancel: 'Отмена',
    comm_load_error: 'Не удалось загрузить:',
    dash_save_error_generic: 'Не удалось сохранить: ',
    dash_delete_error_generic: 'Не удалось удалить: ',
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
