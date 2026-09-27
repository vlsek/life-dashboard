// Мини-словарь только для этой страницы — ровно те строки, что использует эта итерация
// Дашборда (i18n.js целиком не модульный, чтобы его импортировать). Тексты скопированы
// дословно. Дашборд переносится по частям — здесь пока только стрики; остальные ключи
// (графики/вода/день/план) добавятся по мере переноса соответствующих блоков.

export function getLang(): 'en' | 'ru' {
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
    loading_ellipsis: 'Loading…',
    comm_load_error: "Couldn't load:",
    dash_close_btn: 'Close',
    dash_h1: '🏠 Dashboard',
    dash_streaks_h2: '🔥 Streaks',
    dash_streak_perfect_days: '🏆 Perfect days in a row',
    dash_streak_note_filled: '📝 Day note filled in',
    dash_streak_unit_weeks: 'wk',
    dash_streak_not_done_today: 'not done today',
    dash_streak_at_risk_warning: "⚠️ Today isn't counted yet — do something today or the streak breaks tomorrow.",
    dash_streak_more_hint: 'click for all streaks',
    dash_wip_notice:
      'This is an early, in-progress preview of the Dashboard pilot — only the streaks block has moved over so far. The rest (charts, daily metrics, water, weekly progress) is still being ported; use the full Dashboard for everything else in the meantime.',
    dash_wip_link: 'Open the full Dashboard →',
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
    loading_ellipsis: 'Загрузка…',
    comm_load_error: 'Не удалось загрузить:',
    dash_close_btn: 'Закрыть',
    dash_h1: '🏠 Дашборд',
    dash_streaks_h2: '🔥 Серии (streak)',
    dash_streak_perfect_days: '🏆 Идеальные дни подряд',
    dash_streak_note_filled: '📝 Заметка дня заполнена',
    dash_streak_unit_weeks: 'нед.',
    dash_streak_not_done_today: 'сегодня не сделано',
    dash_streak_at_risk_warning: '⚠️ Сегодня ещё не засчитано — сделай что-нибудь сегодня, иначе завтра серия прервётся.',
    dash_streak_more_hint: 'клик — показать все стрики',
    dash_wip_notice:
      'Это ранняя, ещё не законченная версия пилота Дашборда — пока перенесён только блок серий (streaks). Остальное (графики, дневные метрики, вода, недельный прогресс) ещё переносится; всем остальным пока пользуйся обычным Дашбордом.',
    dash_wip_link: 'Открыть обычный Дашборд →',
  },
} as const

export type DictKey = keyof (typeof DICT)['ru']

export function t(key: DictKey): string {
  return DICT[getLang()][key]
}

export function setLang(lang: 'en' | 'ru') {
  localStorage.setItem('site_lang', lang)
  location.reload()
}

export function locale(): string {
  return getLang() === 'en' ? 'en-US' : 'ru-RU'
}
