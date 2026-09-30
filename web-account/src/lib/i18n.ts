// Мини-словарь только для этой страницы — ровно те строки, что использует аккаунт
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
    icon_picker_search: 'Search icons (e.g. run, water)',
    icon_picker_no_results: 'No icons match — type your own emoji below instead.',
    icon_picker_custom: '…or type your own emoji',
    password_toggle_show: 'Show password',
    password_toggle_hide: 'Hide password',
    dash_saving_btn: 'Saving…',
    acc_title: 'Account',
    acc_h1: '👤 Account',
    acc_admin_link: '🛠 Administrator panel',
    acc_change_password_h3: '🔑 Change password',
    acc_new_password_label: 'New password',
    acc_confirm_password_label: 'Repeat new password',
    acc_change_password_btn: 'Change password',
    acc_password_too_short: 'Password must be at least 6 characters.',
    acc_passwords_mismatch: "Passwords don't match.",
    acc_password_changed_toast: 'Password changed ✓',
    acc_change_email_h3: '✉️ Change email',
    acc_current_email_label: 'Current email',
    acc_new_email_label: 'New email',
    acc_change_email_btn: 'Change email',
    acc_email_invalid: 'Enter a valid email address.',
    acc_email_same: 'This is already your current email.',
    acc_email_change_requested_toast: 'Confirmation link sent to both addresses ✉️',
    acc_error_prefix: 'Error: ',
    acc_google_h3: '🔗 Google account',
    acc_link_google_btn: 'Link Google',
    acc_google_linked: '✅ Google account is linked — you can also sign in with it.',
    acc_google_not_linked: "Google isn't linked yet. Link it so you can sign in with Google too, without a password.",
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
    icon_picker_search: 'Поиск иконки (например, бег, вода)',
    icon_picker_no_results: 'Ничего не найдено — впиши свой эмодзи ниже.',
    icon_picker_custom: '…или впиши свой эмодзи',
    password_toggle_show: 'Показать пароль',
    password_toggle_hide: 'Скрыть пароль',
    dash_saving_btn: 'Сохраняю…',
    acc_title: 'Аккаунт',
    acc_h1: '👤 Аккаунт',
    acc_admin_link: '🛠 Панель администратора',
    acc_change_password_h3: '🔑 Сменить пароль',
    acc_new_password_label: 'Новый пароль',
    acc_confirm_password_label: 'Повтори новый пароль',
    acc_change_password_btn: 'Сменить пароль',
    acc_password_too_short: 'Пароль должен быть не короче 6 символов.',
    acc_passwords_mismatch: 'Пароли не совпадают.',
    acc_password_changed_toast: 'Пароль изменён ✓',
    acc_change_email_h3: '✉️ Сменить почту',
    acc_current_email_label: 'Текущая почта',
    acc_new_email_label: 'Новая почта',
    acc_change_email_btn: 'Сменить почту',
    acc_email_invalid: 'Введите корректный email.',
    acc_email_same: 'Это и есть твоя текущая почта.',
    acc_email_change_requested_toast: 'Письмо с подтверждением отправлено на обе почты ✉️',
    acc_error_prefix: 'Ошибка: ',
    acc_google_h3: '🔗 Google-аккаунт',
    acc_link_google_btn: 'Привязать Google',
    acc_google_linked: '✅ Google-аккаунт привязан — можешь входить и через него тоже.',
    acc_google_not_linked: 'Google пока не привязан. Привяжи, чтобы можно было входить и через Google, без пароля.',
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
