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

export function t(key: DictKey): string {
  return DICT[getLang()][key]
}

export function setLang(lang: 'en' | 'ru') {
  // Как и на остальном сайте: большая часть контента рендерится JS-ом, простой и
  // надёжный способ переключить язык везде — перезагрузить страницу.
  localStorage.setItem('site_lang', lang)
  location.reload()
}
