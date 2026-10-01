// Мини-словарь только для этой страницы — ровно те строки, что использует онбординг
// (i18n.js целиком не модульный, чтобы его импортировать). Тексты скопированы дословно.

export function getLang(): 'en' | 'ru' {
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
    onb_title: 'Tell us about yourself',
    onb_h1: '👋 A couple of questions to start',
    onb_intro: 'This helps pick the right metrics for your goal right away. You can change anything later.',
    loading_ellipsis: 'Loading…',
    onb_field_usecase: 'How do you plan to use this?',
    onb_usecase_goals: '🎯 Goals & habit tracker',
    onb_usecase_planner: '📋 Daily planner / to-do list',
    onb_usecase_both: '✨ Both',
    onb_field_gender: 'Gender',
    onb_gender_male: 'Male',
    onb_gender_female: 'Female',
    dash_birthdate_title: 'Date of birth',
    onb_height_placeholder: 'e.g. 178',
    onb_field_height: 'Height (cm)',
    onb_weight_placeholder: 'e.g. 78.5',
    onb_field_weight: 'Weight (kg)',
    onb_field_priority: "What's your current priority?",
    onb_skills_placeholder: 'e.g.: front split, pull-ups, English',
    onb_skills_label: 'Which skills do you want to learn? (comma-separated)',
    onb_step_counter: 'Step {n} of {m}',
    onb_next: 'Next →',
    onb_back: '← Back',
    onb_usecase_goals_desc: 'Habits, metrics, goals and streaks',
    onb_usecase_planner_desc: 'Plans for the day and reminders',
    onb_usecase_both_desc: 'The full set at once',
    onb_step_about_hint: 'All optional — this only fills in your profile.',
    onb_step_metrics_title: 'What do you want to track?',
    onb_metrics_hint: 'Start small — you can add or remove metrics on the dashboard at any time.',
    onb_metrics_recommended: 'Recommended for your goal',
    onb_metrics_other_show: '▾ More metrics ({n})',
    onb_metrics_other_hide: '▴ Hide extra metrics',
    onb_metric_bool: 'yes/no',
    onb_metric_multiselect: 'choice from options',
    onb_metric_less_than: 'less than',
    onb_metric_at_least: 'at least',
    onb_metric_auto: 'daily goal is calculated from your weight and height',
    onb_submit_btn: 'Done, go to dashboard →',
    onb_submitting: 'Setting up your dashboard…',
    onb_skip_btn: "Skip, I'll set it up myself",
    dash_birthdate_range_error: 'Date of birth must be between the year 1900 and today.',
    dash_save_error_generic: "Couldn't save: ",
    onb_save_form_error: "Couldn't save the form: ",
    onb_migration_hint_001b: "Most likely migrations/001_categories_follows_onboarding.sql hasn't been run in Supabase yet — it adds the required profile fields.",
    onb_migration_hint_001: "Most likely migrations/001_categories_follows_onboarding.sql hasn't been run in Supabase yet — it adds the onboarded field.",
    onb_body_param_weight: 'Weight',
    onb_kg_unit: 'kg',
    onb_body_param_fat: '% fat',
    onb_body_param_muscle: 'Muscle mass',
    onb_body_param_water: '% body water',
    onb_body_params_console_error: "Couldn't create body parameters:",
    onb_form_saved_metrics_failed: "Form saved, but couldn't create metrics: ",
    onb_profile_saved_metrics_failed: "Profile saved, but couldn't create metrics: ",
  },
  ru: {
    theme_dark: '🌑 Тёмная',
    theme_monet: '🎨 Monet',
    theme_light: '☀️ Светлая',
    theme_pink: '🌸 Розовая',
    onb_title: 'Расскажи о себе',
    onb_h1: '👋 Пара вопросов для старта',
    onb_intro: 'Это поможет сразу подобрать метрики под твою цель. Можно будет поменять что угодно позже.',
    loading_ellipsis: 'Загрузка…',
    onb_field_usecase: 'Как планируешь использовать?',
    onb_usecase_goals: '🎯 Трекер целей и привычек',
    onb_usecase_planner: '📋 Ежедневник / список дел',
    onb_usecase_both: '✨ И то, и другое',
    onb_field_gender: 'Пол',
    onb_gender_male: 'Мужской',
    onb_gender_female: 'Женский',
    dash_birthdate_title: 'Дата рождения',
    onb_height_placeholder: 'например, 178',
    onb_field_height: 'Рост (см)',
    onb_weight_placeholder: 'например, 78.5',
    onb_field_weight: 'Вес (кг)',
    onb_field_priority: 'Что для тебя сейчас в приоритете?',
    onb_skills_placeholder: 'например: продольный шпагат, подтягивания, английский язык',
    onb_skills_label: 'Какие навыки хочешь освоить? (через запятую)',
    onb_step_counter: 'Шаг {n} из {m}',
    onb_next: 'Далее →',
    onb_back: '← Назад',
    onb_usecase_goals_desc: 'Привычки, метрики, цели и серии',
    onb_usecase_planner_desc: 'Планы на день и напоминания',
    onb_usecase_both_desc: 'Всё сразу',
    onb_step_about_hint: 'Всё необязательно — это только для твоего профиля.',
    onb_step_metrics_title: 'Что хочешь отслеживать?',
    onb_metrics_hint: 'Начни с малого — метрики можно добавлять и убирать на главной в любой момент.',
    onb_metrics_recommended: 'Рекомендуем под твою цель',
    onb_metrics_other_show: '▾ Ещё метрики ({n})',
    onb_metrics_other_hide: '▴ Скрыть лишние метрики',
    onb_metric_bool: 'да/нет',
    onb_metric_multiselect: 'выбор из вариантов',
    onb_metric_less_than: 'меньше',
    onb_metric_at_least: 'не меньше',
    onb_metric_auto: 'норма на день считается по вашему весу и росту',
    onb_submit_btn: 'Готово, перейти к дашборду →',
    onb_submitting: 'Настраиваю дашборд…',
    onb_skip_btn: 'Пропустить, настрою сам',
    dash_birthdate_range_error: 'Дата рождения должна быть между 1900 годом и сегодня.',
    dash_save_error_generic: 'Не удалось сохранить: ',
    onb_save_form_error: 'Не удалось сохранить анкету: ',
    onb_migration_hint_001b: 'Скорее всего не прогнана миграция migrations/001_categories_follows_onboarding.sql в Supabase — там добавляются нужные поля профиля.',
    onb_migration_hint_001: 'Скорее всего не прогнана миграция migrations/001_categories_follows_onboarding.sql в Supabase — там добавляется поле onboarded.',
    onb_body_param_weight: 'Вес',
    onb_kg_unit: 'кг',
    onb_body_param_fat: '% жира',
    onb_body_param_muscle: 'Мышечная масса',
    onb_body_param_water: '% воды в теле',
    onb_body_params_console_error: 'Не удалось создать параметры тела:',
    onb_form_saved_metrics_failed: 'Анкета сохранена, но не удалось создать метрики: ',
    onb_profile_saved_metrics_failed: 'Профиль сохранён, но не удалось создать метрики: ',
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
  localStorage.setItem('site_lang', lang)
  location.reload()
}
