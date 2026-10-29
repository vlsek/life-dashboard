// Мини-словарь только для этой страницы — ровно те строки, что использует вход/регистрация
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
    theme_dark: '🌑 Dark',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Light',
    theme_label: 'Theme',
    theme_pink: '🌸 Pink',
    theme_mint: '🌿 Mint',
    theme_sepia: '📜 Sepia',
    theme_solarlight: '🌞 Solarized Light',
    theme_nord: '❄️ Nord',
    theme_mocha: '✨ Orchid',
    theme_amoled: '⚫ AMOLED',
    theme_contrast: '◐ High contrast',
    theme_dracula: '🧛 Dracula',
    theme_gruvbox: '🍂 Gruvbox',
    theme_tokyonight: '🌃 Tokyo Night',
    theme_forest: '🌲 Forest',
    theme_ocean: '🌊 Ocean',
    theme_sunset: '🌇 Sunset',
    theme_twilight: '🔮 Twilight',
    theme_neon: '🟢 Neon',
    theme_lavender: '💜 Lavender',
    theme_sky: '🌤️ Sky',
    theme_peach: '🍑 Peach',
    theme_graphite: '🪨 Graphite',
    theme_emerald: '🛰️ Emerald Obsidian',
    theme_moonlight: '🌆 Moonlight Synth',
    theme_phosphor: '📟 Matrix Phosphor',
    theme_nightfall: '🌌 Tokyo Nightfall',
    theme_velvet: '🍑 Velvet Dusk',
    theme_frost: '🧊 Nord Frost',
    theme_alpine: '🏔️ Paper Alpine',
    theme_matcha: '🍵 Matcha Latte',
    theme_cyberday: '⚡ Cyberpunk Day',
    theme_vintage: '📜 Vintage Paper',
    theme_glass: '🪟 Executive Glass',
    theme_meadow: '🌾 Summer Meadow',
    theme_autumn: '🍂 Autumn Harvest',
    theme_sakura: '🌸 Cherry Blossom',
    theme_snow: '❄️ Snowfield',
    theme_ember: '🔥 Ember',
    theme_grass: '🌱 Fresh Grass',
    theme_clinic: '🩺 Mint Clinic',
    login_title: 'Personal Dashboard',
    login_subtitle: 'Habits, goals and progress — in one place',
    login_theme_light: 'Light',
    login_theme_dark: 'Dark',
    tab_login: 'Log in',
    tab_register: 'Sign up',
    email_label: 'Email',
    password_label: 'Password',
    password_hint_register: 'At least 6 characters',
    login_btn: 'Log in',
    register_btn: 'Sign up',
    login_or_divider: 'or',
    login_about_title: 'About the project',
    login_about_text: 'Life Dashboard is a personal project by a DevOps engineer: daily metrics, goals, skills, workouts, challenges and rewards in one place. It is improved bit by bit.',
    login_about_resume: 'Resume →',
    login_google_btn: 'Continue with Google',
    login_please_wait: 'Please wait…',
    acc_saved_title: 'Accounts on this device',
    acc_enter_as: 'Continue as',
    acc_no_email: 'account',
    acc_adding_hint: 'Adding an account: sign in to another one (up to 3 on this device).',
    acc_cancel_add: 'Cancel — go back to my account',
    login_fill_fields: 'Fill in email and password.',
    login_error_prefix: 'Error: ',
    err_network: 'No connection to the server. Check your internet and try again.',
    err_forbidden: 'No access. Sign in again and retry.',
    err_in_use: "This can't be changed while it is in use.",
    err_validation: 'Please check the entered values.',
    err_generic_save: 'Could not save. Please try again.',
    err_generic_delete: 'Could not delete. Please try again.',
    err_generic_load: 'Could not load the data. Refresh the page and try again.',
    err_generic_upload: 'Could not upload the file. Please try again.',
    login_error_generic: 'Could not sign in. Please try again.',
    login_signup_check_email: 'Done! Check your email and follow the link to confirm your registration, then sign in.',
    password_toggle_show: 'Show password',
    password_toggle_hide: 'Hide password',
  },
  ru: {
    theme_dark: '🌑 Тёмная',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Светлая',
    theme_label: 'Тема',
    theme_pink: '🌸 Розовая',
    theme_mint: '🌿 Mint (мятная)',
    theme_sepia: '📜 Сепия',
    theme_solarlight: '🌞 Solarized Light',
    theme_nord: '❄️ Nord',
    theme_mocha: '✨ Орхидея',
    theme_amoled: '⚫ AMOLED (чёрная)',
    theme_contrast: '◐ Высокий контраст',
    theme_dracula: '🧛 Дракула',
    theme_gruvbox: '🍂 Gruvbox',
    theme_tokyonight: '🌃 Ночной Токио',
    theme_forest: '🌲 Лес',
    theme_ocean: '🌊 Океан',
    theme_sunset: '🌇 Закат',
    theme_twilight: '🔮 Сумерки',
    theme_neon: '🟢 Неон',
    theme_lavender: '💜 Лаванда',
    theme_sky: '🌤️ Небо',
    theme_peach: '🍑 Персик',
    theme_graphite: '🪨 Графит',
    theme_emerald: '🛰️ Изумрудный обсидиан',
    theme_moonlight: '🌆 Лунный синтвейв',
    theme_phosphor: '📟 Зелёный фосфор',
    theme_nightfall: '🌌 Токийские сумерки',
    theme_velvet: '🍑 Бархатные сумерки',
    theme_frost: '🧊 Арктический иней',
    theme_alpine: '🏔️ Альпийская бумага',
    theme_matcha: '🍵 Матча-латте',
    theme_cyberday: '⚡ Неоновый день',
    theme_vintage: '📜 Чернильная бумага',
    theme_glass: '🪟 Бизнес-стекло',
    theme_meadow: '🌾 Летний луг',
    theme_autumn: '🍂 Осенняя',
    theme_sakura: '🌸 Сакура',
    theme_snow: '❄️ Ледяная',
    theme_ember: '🔥 Огненная',
    theme_grass: '🌱 Травяная',
    theme_clinic: '🩺 Мятная больничная',
    login_title: 'Личный дашборд',
    login_subtitle: 'Привычки, цели и прогресс — в одном месте',
    login_theme_light: 'Светлая',
    login_theme_dark: 'Тёмная',
    tab_login: 'Вход',
    tab_register: 'Регистрация',
    email_label: 'Email',
    password_label: 'Пароль',
    password_hint_register: 'Минимум 6 символов',
    login_btn: 'Войти',
    register_btn: 'Зарегистрироваться',
    login_or_divider: 'или',
    login_about_title: 'О проекте',
    login_about_text: 'Life Dashboard — личный проект DevOps-инженера: метрики дня, цели, навыки, тренировки, челленджи и награды в одном месте. Развивается понемногу.',
    login_about_resume: 'Резюме →',
    login_google_btn: 'Продолжить с Google',
    login_please_wait: 'Подожди…',
    acc_saved_title: 'Записи на этом устройстве',
    acc_enter_as: 'Войти как',
    acc_no_email: 'запись',
    acc_adding_hint: 'Добавление записи: войди в другую (до 3 на этом устройстве).',
    acc_cancel_add: 'Отмена — вернуться в мою запись',
    login_fill_fields: 'Заполни email и пароль.',
    login_error_prefix: 'Ошибка: ',
    err_network: 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.',
    err_forbidden: 'Нет доступа. Войди заново и повтори.',
    err_in_use: 'Это нельзя изменить, пока оно используется.',
    err_validation: 'Проверь введённые значения.',
    err_generic_save: 'Не получилось сохранить. Попробуй ещё раз.',
    err_generic_delete: 'Не получилось удалить. Попробуй ещё раз.',
    err_generic_load: 'Не получилось загрузить данные. Обнови страницу и попробуй ещё раз.',
    err_generic_upload: 'Не получилось загрузить файл. Попробуй ещё раз.',
    login_error_generic: 'Не получилось войти. Попробуй ещё раз.',
    login_signup_check_email: 'Готово! Проверь почту и перейди по ссылке, чтобы подтвердить регистрацию, потом войди.',
    password_toggle_show: 'Показать пароль',
    password_toggle_hide: 'Скрыть пароль',
  },
} as const

export type DictKey = keyof (typeof DICT)['ru']

// Язык устройства -> язык сайта (поддерживаются только RU и EN). Идём по предпочтениям устройства
// (navigator.languages) по порядку и берём первый поддерживаемый язык, например ['de-DE', 'ru'] -> 'ru';
// если ни одного нет — английский, как и раньше по умолчанию.
export function detectDeviceLang(languages?: readonly string[]): 'en' | 'ru' {
  let list: readonly string[] = languages ?? []
  if (!languages) {
    try {
      list = navigator.languages?.length ? navigator.languages : [navigator.language]
    } catch {
      list = []
    }
  }
  for (const raw of list) {
    const base = String(raw || '').toLowerCase().split(/[-_]/)[0]
    if (base === 'ru') return 'ru'
    if (base === 'en') return 'en'
  }
  return 'en'
}

// Первый заход нового пользователя: пока язык не сохранён, выбираем по устройству и сохраняем — дальше он
// переключает язык сам, и его выбор больше не перезаписывается. Вызывается один раз до монтирования приложения.
export function applyDeviceLangIfUnset(languages?: readonly string[]): void {
  try {
    if (localStorage.getItem('site_lang')) return
    localStorage.setItem('site_lang', detectDeviceLang(languages))
  } catch {
    /* localStorage недоступен (приватный режим) — остаётся язык по умолчанию */
  }
}

export function t(key: DictKey): string {
  return DICT[getLang()][key]
}

export function setLang(lang: 'en' | 'ru') {
  // Как и на остальном сайте: большая часть контента рендерится JS-ом, простой и
  // надёжный способ переключить язык везде — перезагрузить страницу.
  localStorage.setItem('site_lang', lang)
  location.reload()
}
