// Словарь глобального хедера: только строки окон воды/прогресса. Тексты взяты из web-dashboard/src/lib/i18n.ts дословно
// (там они и живут, пока Дашборд не переедет на этот же бандл). Язык — тот же localStorage `site_lang`.
const DICT = {
  en: {
    dash_water_modal_title: 'Water today',
    dash_water_date_label: 'Date (you can log water for past days)',
    dash_water_add_custom_btn: '+ Custom',
    dash_water_add_custom_prompt: 'How many ml to add?',
    dash_water_goal_label: 'Daily goal (ml)',
    dash_water_goal_manual_hint: 'Custom goal you set.',
    dash_water_goal_auto_hint: 'Calculated automatically from your latest weight (≈30ml per kg). Change and save to set your own.',
    dash_water_goal_save_btn: 'Change daily goal',
    dash_water_goal_saved: 'Daily goal changed',
    dash_water_info_manual: 'You set this goal manually. Tap Save below to change it.',
    dash_water_info_auto_prefix: 'Calculated from your weight:',
    dash_water_info_auto_kg: 'kg',
    dash_water_info_auto_ml_per_kg: 'ml/kg',
    dash_water_info_editable: 'You can change it below — it will stop updating automatically.',
    dash_water_info_no_weight: 'No weight on record yet, so a default of 2000 ml is used.',
    dash_close_btn: 'Close',
    dash_day_progress_label: 'Day done',
    dash_week_progress_label: 'Week',
    dash_day_progress_settings_title: '⚙️ Day and week progress',
    dash_day_progress_show: 'Show day-progress chart',
    dash_day_progress_include_planned: 'Count "Planned for today" items',
    dash_day_progress_include_metrics: 'Count daily metrics',
    dash_progress_day_place_label: 'Day circle',
    dash_progress_week_place_label: 'Week circle',
    dash_place_avatar: 'Ring around the avatar',
    dash_place_header: 'In the header',
    dash_place_off: 'Hidden',
    dash_place_profile: 'Next to the profile',
    dash_summary_done_h: 'Done',
    dash_summary_left_h: 'Left',
    dash_summary_bonus_h: '⭐ Bonus',
    dash_summary_done_of: '{done} of {total} items',
    dash_summary_bonus_line: '{base}% base + {bonus}% bonus',
    dash_summary_empty: 'Nothing is counted yet: no metrics or plans for this period.',
    dash_summary_weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    cancel: 'Cancel',
    save: 'Save',
    close: "Close",
    dash_save_error_generic: "Couldn't save: ",
    hdr_water_title: 'Water',
    hdr_open_settings: 'Progress settings',
  },
  ru: {
    dash_water_modal_title: 'Вода за сегодня',
    dash_water_date_label: 'Дата (можно внести воду за прошлые дни)',
    dash_water_add_custom_btn: '+ Своё',
    dash_water_add_custom_prompt: 'Сколько мл добавить?',
    dash_water_goal_label: 'Дневная норма (мл)',
    dash_water_goal_manual_hint: 'Норма задана вручную.',
    dash_water_goal_auto_hint: 'Посчитана автоматически по последнему весу (≈30мл на кг). Поменяй и сохрани, чтобы задать свою.',
    dash_water_goal_save_btn: 'Изменить дневную норму',
    dash_water_goal_saved: 'Дневная норма изменена',
    dash_water_info_manual: 'Эта норма задана вручную. Нажми «Сохранить» ниже, чтобы поменять.',
    dash_water_info_auto_prefix: 'Рассчитана по твоему весу:',
    dash_water_info_auto_kg: 'кг',
    dash_water_info_auto_ml_per_kg: 'мл/кг',
    dash_water_info_editable: 'Можешь поменять её ниже — тогда она перестанет пересчитываться сама.',
    dash_water_info_no_weight: 'Веса пока нет, поэтому используется значение по умолчанию — 2000 мл.',
    dash_close_btn: 'Закрыть',
    dash_day_progress_label: 'День сделан',
    dash_week_progress_label: 'Неделя',
    dash_day_progress_settings_title: '⚙️ Прогресс дня и недели',
    dash_day_progress_show: 'Показывать диаграмму дня',
    dash_day_progress_include_planned: 'Учитывать пункты «Запланировано на сегодня»',
    dash_day_progress_include_metrics: 'Учитывать дневные метрики',
    dash_progress_day_place_label: 'Кружок дня',
    dash_progress_week_place_label: 'Кружок недели',
    dash_place_avatar: 'Кольцом вокруг аватарки',
    dash_place_header: 'В шапке',
    dash_place_off: 'Не показывать',
    dash_place_profile: 'Рядом с профилем',
    dash_summary_done_h: 'Сделано',
    dash_summary_left_h: 'Осталось',
    dash_summary_bonus_h: '⭐ Бонус',
    dash_summary_done_of: '{done} из {total} пунктов',
    dash_summary_bonus_line: '{base}% основа + {bonus}% бонус',
    dash_summary_empty: 'Пока нечего считать: нет метрик и планов за этот период.',
    dash_summary_weekdays: 'Вс,Пн,Вт,Ср,Чт,Пт,Сб',
    cancel: 'Отмена',
    save: 'Сохранить',
    close: "Закрыть",
    dash_save_error_generic: 'Не удалось сохранить: ',
    hdr_water_title: 'Вода',
    hdr_open_settings: 'Настройки прогресса',
  },
} as const

export type DictKey = keyof (typeof DICT)['ru']

export function getLang(): 'en' | 'ru' {
  try {
    return (localStorage.getItem('site_lang') || 'en') === 'ru' ? 'ru' : 'en'
  } catch {
    return 'en'
  }
}

export function t(key: DictKey): string {
  return DICT[getLang()][key]
}
