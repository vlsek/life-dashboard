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
      'This is an early, in-progress preview of the Dashboard pilot — the streaks, water and day/week progress blocks have moved over so far. The rest (charts, daily metrics, plan for today) is still being ported; use the full Dashboard for everything else in the meantime.',
    dash_wip_link: 'Open the full Dashboard →',
    dash_save_error_generic: "Couldn't save: ",
    dash_water_metric_name: 'Water',
    dash_water_modal_title: 'Water today',
    dash_water_add_custom_btn: '+ Custom',
    dash_water_add_custom_prompt: 'How many ml to add?',
    dash_water_goal_label: 'Daily goal (ml)',
    dash_water_date_label: 'Date (you can log water for past days)',
    dash_water_goal_manual_hint: 'Custom goal you set.',
    dash_water_goal_auto_hint: 'Calculated automatically from your latest weight (≈30ml per kg). Change and save to set your own.',
    dash_water_goal_save_btn: 'Save goal',
    dash_water_setup_prompt: 'Set up water tracking — tap to create',
    dash_water_info_manual: 'You set this goal manually. Tap Save below to change it.',
    dash_water_info_auto_prefix: 'Calculated from your weight:',
    dash_water_info_auto_kg: 'kg',
    dash_water_info_auto_ml_per_kg: 'ml/kg',
    dash_water_info_no_weight: 'No weight on record yet, so a default of 2000 ml is used.',
    dash_water_info_editable: 'You can change it below — it will stop updating automatically.',
    dash_day_progress_label: 'Day done',
    dash_week_progress_label: 'Week',
    dash_day_progress_settings_title: '⚙️ Day and week progress',
    dash_day_progress_show: 'Show day-progress chart',
    dash_day_progress_include_planned: 'Count "Planned for today" items',
    dash_day_progress_include_metrics: 'Count daily metrics',
    dash_progress_day_place_label: 'Day circle',
    dash_progress_week_place_label: 'Week circle',
    dash_place_avatar: 'Ring around the avatar',
    dash_place_profile: 'Next to the profile',
    dash_place_header: 'In the header',
    dash_place_off: 'Hidden',
    save: 'Save',
    cancel: 'Cancel',
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
      'Это ранняя, ещё не законченная версия пилота Дашборда — пока перенесены блоки серий (streaks), воды и дневного/недельного прогресса. Остальное (графики, дневные метрики, план на сегодня) ещё переносится; всем остальным пока пользуйся обычным Дашбордом.',
    dash_wip_link: 'Открыть обычный Дашборд →',
    dash_save_error_generic: 'Не удалось сохранить: ',
    dash_water_metric_name: 'Вода',
    dash_water_modal_title: 'Вода за сегодня',
    dash_water_add_custom_btn: '+ Своё',
    dash_water_add_custom_prompt: 'Сколько мл добавить?',
    dash_water_goal_label: 'Дневная норма (мл)',
    dash_water_date_label: 'Дата (можно внести воду за прошлые дни)',
    dash_water_goal_manual_hint: 'Норма задана вручную.',
    dash_water_goal_auto_hint: 'Посчитана автоматически по последнему весу (≈30мл на кг). Поменяй и сохрани, чтобы задать свою.',
    dash_water_goal_save_btn: 'Сохранить норму',
    dash_water_setup_prompt: 'Настроить учёт воды — нажми, чтобы создать',
    dash_water_info_manual: 'Эта норма задана вручную. Нажми «Сохранить» ниже, чтобы поменять.',
    dash_water_info_auto_prefix: 'Рассчитана по твоему весу:',
    dash_water_info_auto_kg: 'кг',
    dash_water_info_auto_ml_per_kg: 'мл/кг',
    dash_water_info_no_weight: 'Веса пока нет, поэтому используется значение по умолчанию — 2000 мл.',
    dash_water_info_editable: 'Можешь поменять её ниже — тогда она перестанет пересчитываться сама.',
    dash_day_progress_label: 'День сделан',
    dash_week_progress_label: 'Неделя',
    dash_day_progress_settings_title: '⚙️ Прогресс дня и недели',
    dash_day_progress_show: 'Показывать диаграмму дня',
    dash_day_progress_include_planned: 'Учитывать пункты «Запланировано на сегодня»',
    dash_day_progress_include_metrics: 'Учитывать дневные метрики',
    dash_progress_day_place_label: 'Кружок дня',
    dash_progress_week_place_label: 'Кружок недели',
    dash_place_avatar: 'Кольцом вокруг аватарки',
    dash_place_profile: 'Рядом с профилем',
    dash_place_header: 'В шапке',
    dash_place_off: 'Не показывать',
    save: 'Сохранить',
    cancel: 'Отмена',
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
