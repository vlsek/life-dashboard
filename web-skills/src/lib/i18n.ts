// Мини-словарь только для этой страницы — ровно те строки, что использует Skills
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
    skills_title: 'Skills',
    skills_h1: '🥋 Skills',
    skills_add_btn: '➕ Add skill',
    skills_suggestions_h3: '💡 Quick ideas',
    skills_active_h3: 'In progress',
    skills_mastered_h2: '✅ Mastered skills',
    skills_all_suggestions_added: 'All suggestions already added 🎉',
    skills_edit_title: 'Edit skill',
    skills_new_title: 'New skill',
    skills_field_name: 'Name',
    skills_field_step: 'Progress step per click (%)',
    skills_field_points: 'Points for mastering',
    skills_confirm_delete: 'Delete this skill?',
    skills_none_active: 'No skills in progress.',
    skills_none_mastered: 'Nothing mastered yet.',
    skills_books_h2: '📚 Books',
    skills_add_book_btn: '➕ Add book',
    skills_books_to_read_h3: 'Want to read',
    skills_books_done_h3: '✅ Read',
    skills_book_field_title: 'Book title',
    skills_book_field_author: 'Author (optional)',
    skills_book_field_points: 'Points for finishing',
    skills_book_new_title: 'New book',
    skills_book_edit_title: 'Edit book',
    skills_book_confirm_delete: 'Delete this book?',
    skills_book_list_empty: 'List is empty.',
    skills_book_none_read: 'Nothing read yet.',
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
    skills_title: 'Навыки',
    skills_h1: '🥋 Навыки',
    skills_add_btn: '➕ Добавить навык',
    skills_suggestions_h3: '💡 Быстрые идеи',
    skills_active_h3: 'В процессе',
    skills_mastered_h2: '✅ Освоенные навыки',
    skills_all_suggestions_added: 'Все подсказки уже добавлены 🎉',
    skills_edit_title: 'Изменить навык',
    skills_new_title: 'Новый навык',
    skills_field_name: 'Название',
    skills_field_step: 'Шаг прогресса за клик (%)',
    skills_field_points: 'Баллы за освоение',
    skills_confirm_delete: 'Удалить этот навык?',
    skills_none_active: 'Нет навыков в процессе.',
    skills_none_mastered: 'Пока ничего не освоено.',
    skills_books_h2: '📚 Книги',
    skills_add_book_btn: '➕ Добавить книгу',
    skills_books_to_read_h3: 'Хочу прочитать',
    skills_books_done_h3: '✅ Прочитано',
    skills_book_field_title: 'Название книги',
    skills_book_field_author: 'Автор (необязательно)',
    skills_book_field_points: 'Баллы за прочтение',
    skills_book_new_title: 'Новая книга',
    skills_book_edit_title: 'Изменить книгу',
    skills_book_confirm_delete: 'Удалить эту книгу?',
    skills_book_list_empty: 'Список пуст.',
    skills_book_none_read: 'Пока ничего не прочитано.',
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
