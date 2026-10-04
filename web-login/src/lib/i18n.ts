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
    theme_pink: '🌸 Pink',
    theme_mint: '🌿 Mint',
    theme_sepia: '📜 Sepia',
    theme_solarlight: '🌞 Solarized Light',
    theme_nord: '❄️ Nord',
    theme_mocha: '☕ Catppuccin Mocha',
    theme_amoled: '⚫ AMOLED',
    theme_contrast: '◐ High contrast',
    login_title: '🔐 Personal Dashboard',
    tab_login: 'Log in',
    tab_register: 'Sign up',
    email_label: 'Email',
    password_label: 'Password',
    login_btn: 'Log in',
    register_btn: 'Sign up',
    login_or_divider: 'or',
    login_google_btn: 'Continue with Google',
    login_please_wait: 'Please wait…',
    login_fill_fields: 'Fill in email and password.',
    login_error_prefix: 'Error: ',
    login_network_error_prefix: 'Network error: ',
    login_signup_check_email: 'Done! Check your email and follow the link to confirm your registration, then sign in.',
    login_unknown_error: 'unknown error',
    login_error_code: '(code ',
    login_unknown_error_console: 'unknown error — check the console (F12)',
    password_toggle_show: 'Show password',
    password_toggle_hide: 'Hide password',
  },
  ru: {
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
    login_title: '🔐 Личный дашборд',
    tab_login: 'Вход',
    tab_register: 'Регистрация',
    email_label: 'Email',
    password_label: 'Пароль',
    login_btn: 'Войти',
    register_btn: 'Зарегистрироваться',
    login_or_divider: 'или',
    login_google_btn: 'Продолжить с Google',
    login_please_wait: 'Подождите…',
    login_fill_fields: 'Заполни email и пароль.',
    login_error_prefix: 'Ошибка: ',
    login_network_error_prefix: 'Сетевая ошибка: ',
    login_signup_check_email: 'Готово! Проверь почту и перейди по ссылке, чтобы подтвердить регистрацию, потом войди.',
    login_unknown_error: 'неизвестная ошибка',
    login_error_code: '(код ',
    login_unknown_error_console: 'неизвестная ошибка — смотри консоль (F12)',
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
