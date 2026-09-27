// Мини-словарь только для этой страницы — ровно те строки, что использует история
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
    pilot_badge: 'Vue pilot',
    nav_install_app: 'Install app',
    nav_tour: 'How it works',
    nav_about: 'About the project',
    close: 'Close',
    install_title: '📲 Install app',
    install_ios_steps: 'On iPhone/iPad: tap the Share button ⬆️ at the bottom of Safari, then "Add to Home Screen" → "Add".',
    install_generic_steps: 'Open your browser\'s menu (usually ⋮ in the top-right corner) and pick "Install app" or "Add to Home screen".',
    tour_back: 'Back',
    tour_next: 'Next',
    tour_skip: 'Skip',
    tour_done: "Let's go!",
    tour_1_title: 'Welcome!',
    tour_1_text:
      'This is your personal dashboard: one place for daily habits, long-term goals, skills, workouts and progress.\n\nA short tour — 7 quick steps. You can reopen it any time from the side menu ("How it works").',
    tour_2_title: 'Dashboard',
    tour_2_text:
      'Every day you tick off your daily metrics (yes/no, numbers, sets) and can add items to "Planned for today". The circle shows how much of the day is done (the History section shows every day and week as a calendar), the flame is your streak, and points are what you earn for completed things.\n\nThe ⚙️ icons next to blocks let you customize what is shown.',
    tour_3_title: 'Goals',
    tour_3_text:
      "Long-term goals live in the Goals section. Split a big goal into stages, mark progress, and drop any goal into today's plan so it counts toward your day and week.",
    tour_4_title: 'Skills, workouts, English',
    tour_4_text:
      '🥋 Skills — things you are mastering, with progress and books.\n🏋️ Workouts — exercises and sets (reps, weight, time), plus ready-made programs.\n🌐 Languages — a vocabulary for any language you learn: add the words you meet, mark what you learned.',
    tour_5_title: 'Challenges, shop, community',
    tour_5_text:
      '🏁 Challenges — pick one from the catalog or create your own to push yourself.\n🛍️ Shop — spend earned points on things you allow yourself to buy.\n🏆 Community — add friends and compare on the leaderboard. Others only see what you allow.',
    tour_6_title: 'Calendar and milestones',
    tour_6_text:
      "Tap a day in the calendar to write a plan or a note — it goes straight into what you did that day. Handy for looking back and planning ahead.\n\n🚩 Milestones — recurring things with a date (an oil change, consumables): note when you did it and how often to repeat, and the page shows what's due.",
    tour_7_title: 'Getting around',
    tour_7_text:
      "☰ opens the side menu (language, theme, account, install as an app). »»» reveals quick links to every section. 💧 in the header is the water tracker: tap it to log water, also for past days.\n\nThat's it — enjoy!",
    about_title: 'ℹ️ About the project',
    about_creator_title: 'Who made this',
    about_creator_text:
      'DevOps and infrastructure engineer. Life Dashboard is my personal project: a tracker for goals, habits and metrics that I build for myself and keep improving bit by bit.',
    about_portfolio_link: 'More about me in the portfolio →',
    about_feedback_intro: 'Found a bug or have a suggestion? Write to:',
    hist_title: 'History',
    hist_h1: '🕘 History',
    hist_intro:
      "Progress by day and week. The fuller a day is filled, the more you got done; fully green means 100%. Tap a day to see the details.",
    hist_today_btn: 'Today',
    hist_week_col: 'Wk',
    hist_weeks_h2: '📊 Weeks',
    hist_stat_avg: 'Average',
    hist_stat_perfect: 'Perfect days',
    hist_stat_days: 'Days tracked',
    hist_no_data: 'No data for this period yet.',
    hist_future_day: "This day hasn't happened yet.",
    hist_done_of: 'done',
    hist_metrics_h: 'Metrics',
    hist_planned_h: 'Plans',
    hist_notes_h: 'Notes',
    hist_not_scheduled: 'not scheduled this day',
    hist_sets_word: 'sets',
    hist_reps_word: 'reps',
    dash_schedule_weekly_short: '×/wk',
    cal_goal_suffix: 'goal',
    dash_close_btn: 'Close',
    dash_weekdays_short: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
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
    nav_install_app: 'Установить приложение',
    nav_tour: 'Как пользоваться',
    nav_about: 'О проекте',
    close: 'Закрыть',
    install_title: '📲 Установить приложение',
    install_ios_steps: 'На iPhone/iPad: нажми кнопку «Поделиться» ⬆️ внизу Safari, затем «На экран «Домой»» → «Добавить».',
    install_generic_steps: 'Открой меню браузера (обычно ⋮ в правом верхнем углу) и выбери «Установить приложение» или «Добавить на главный экран».',
    tour_back: 'Назад',
    tour_next: 'Далее',
    tour_skip: 'Пропустить',
    tour_done: 'Поехали!',
    tour_1_title: 'Добро пожаловать!',
    tour_1_text:
      'Это твой личный дашборд: в одном месте ежедневные привычки, долгосрочные цели, навыки, тренировки и прогресс.\n\nКороткий тур — 7 быстрых шагов. Открыть его снова можно в любой момент из бокового меню («Как пользоваться»).',
    tour_2_title: 'Дашборд',
    tour_2_text:
      'Каждый день отмечаешь ежедневные метрики (да/нет, числа, подходы) и можешь добавлять пункты в «Запланировано на сегодня». Кружок показывает, насколько выполнен день (раздел «История» показывает каждый день и неделю календарём), огонёк — твой стрик, а баллы копятся за выполненное.\n\nИконки ⚙️ рядом с блоками позволяют настроить, что показывать.',
    tour_3_title: 'Цели',
    tour_3_text:
      'Долгосрочные цели живут в разделе «Цели». Большую цель можно разбить на этапы, отмечать прогресс и закидывать в план на сегодня — тогда она идёт в счёт дня и недели.',
    tour_4_title: 'Навыки, тренировки, английский',
    tour_4_text:
      '🥋 Навыки — то, что осваиваешь, с прогрессом и книгами.\n🏋️ Тренировки — упражнения и подходы (повторения, вес, время), плюс готовые программы.\n🌐 Языки — словарь для любого изучаемого языка: добавляй слова, которые встретил, отмечай выученные.',
    tour_5_title: 'Челленджи, магазин, сообщество',
    tour_5_text:
      '🏁 Челленджи — выбери из каталога или создай свой, чтобы себя подтолкнуть.\n🛍️ Магазин — трать накопленные баллы на то, что «разрешаешь себе купить».\n🏆 Сообщество — добавляй друзей и сравнивайся в лидерборде. Другие видят только то, что ты разрешил.',
    tour_6_title: 'Календарь и вехи',
    tour_6_text:
      'Нажми на день в календаре, чтобы записать план или заметку — она сразу попадёт в то, что ты сделал за этот день. Удобно оглядываться назад и планировать вперёд.\n\n🚩 Вехи — регулярные дела с датой (замена масла, расходники): отметь, когда сделал и как часто повторять, и раздел покажет, что пора.',
    tour_7_title: 'Как ориентироваться',
    tour_7_text:
      '☰ открывает боковое меню (язык, тема, аккаунт, установка как приложения). »»» раскрывает быстрые ссылки на все разделы. 💧 в шапке — трекер воды: нажми, чтобы внести воду, в том числе за прошлые дни.\n\nВот и всё — приятного пользования!',
    about_title: 'ℹ️ О проекте',
    about_creator_title: 'Кто это сделал',
    about_creator_text:
      'DevOps- и инфраструктурный инженер. Life Dashboard — мой личный проект: трекер целей, привычек и метрик, который я делаю для себя и понемногу развиваю.',
    about_portfolio_link: 'Больше обо мне — в портфолио →',
    about_feedback_intro: 'Нашёл баг или есть предложение? Пиши:',
    hist_title: 'История',
    hist_h1: '🕘 История',
    hist_intro:
      'Прогресс по дням и неделям. Чем полнее закрашен день, тем больше выполнено; полностью зелёный — 100%. Нажми на день, чтобы увидеть подробности.',
    hist_today_btn: 'Сегодня',
    hist_week_col: 'Нед.',
    hist_weeks_h2: '📊 Недели',
    hist_stat_avg: 'Средний',
    hist_stat_perfect: 'Идеальных дней',
    hist_stat_days: 'Дней с данными',
    hist_no_data: 'За этот период данных пока нет.',
    hist_future_day: 'Этот день ещё не наступил.',
    hist_done_of: 'выполнено',
    hist_metrics_h: 'Метрики',
    hist_planned_h: 'Планы',
    hist_notes_h: 'Заметки',
    hist_not_scheduled: 'в этот день не по расписанию',
    hist_sets_word: 'подх.',
    hist_reps_word: 'повт.',
    dash_schedule_weekly_short: '×/нед.',
    cal_goal_suffix: 'цель',
    dash_close_btn: 'Закрыть',
    dash_weekdays_short: 'Пн,Вт,Ср,Чт,Пт,Сб,Вс',
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
