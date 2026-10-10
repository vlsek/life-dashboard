// Подсказки «что тут можно делать» (BACKLOG 49.4): короткий текст на каждую страницу. Показывается один раз при первом входе
// на страницу, потом — по значку «i» в верхней панели. Состояние «видел» хранится на устройстве. Файл — КОПИЯ в каждом пилоте
// (страж pageHintsAllPilots.test.ts следит, чтобы копии не разошлись).
export type HintLang = 'ru' | 'en'
export interface PageHintText {
  title: string
  tips: string[]
}

export const PAGE_HINTS: Record<string, Record<HintLang, PageHintText>> = {
  dashboard: {
    ru: { title: 'Дашборд', tips: ['Здесь ваши метрики дня: отмечайте выполненное, и растёт прогресс дня и недели.', 'Кнопка «Настроить» меняет набор и порядок блоков, графики можно листать по периодам.', 'За выполненные метрики начисляются баллы — их можно тратить в магазине.'] },
    en: { title: 'Dashboard', tips: ['These are your daily metrics: tick what you did and your day and week progress grows.', '"Customize" changes the blocks and their order; charts can be paged by period.', 'Finished metrics earn points you can spend in the shop.'] },
  },
  goals: {
    ru: { title: 'Цели', tips: ['Добавьте цель, разбейте её на шаги или этапы и отмечайте продвижение.', 'У цели можно задать срок и категорию, а напоминание о дедлайне включается в настройках.', 'Выполненные цели дают баллы и достижения.'] },
    en: { title: 'Goals', tips: ['Add a goal, split it into steps or stages and mark your progress.', 'A goal can have a deadline and a category; the deadline reminder is in the settings.', 'Finished goals give points and achievements.'] },
  },
  skills: {
    ru: { title: 'Навыки и книги', tips: ['Ведите навыки и книги: идеи, в работе, освоено, прочитано.', 'Двигайте прогресс навыка, отмечайте «освоено» — это приносит баллы.', 'Когда навыков больше трёх, появляются поиск и сортировка.'] },
    en: { title: 'Skills and books', tips: ['Track skills and books: ideas, in progress, mastered, read.', 'Move a skill\'s progress and mark it mastered to earn points.', 'With more than three skills, search and sorting appear.'] },
  },
  workouts: {
    ru: { title: 'Тренировки', tips: ['Записывайте подходы к упражнениям, на карте мышц видно нагрузку.', 'Готовые программы и шаблоны можно выбрать в каталоге и подстроить под себя.', 'Прогресс по упражнениям показывают деревья и графики.'] },
    en: { title: 'Workouts', tips: ['Log your sets; the muscle map shows the load.', 'Pick ready programs and templates in the catalog and adjust them.', 'Progress per exercise is shown by trees and charts.'] },
  },
  challenges: {
    ru: { title: 'Челленджи', tips: ['Выберите челлендж из каталога или создайте свой: на каждый день или накопительный.', 'Отмечайте дни — кольцо показывает прогресс, серия подряд растёт.', 'Завершённые челленджи дают достижения.'] },
    en: { title: 'Challenges', tips: ['Pick a challenge from the catalog or make your own: daily or cumulative.', 'Mark days — the ring shows progress and your streak grows.', 'Completed challenges give achievements.'] },
  },
  english: {
    ru: { title: 'Языки', tips: ['Добавляйте слова и фразы, отмечайте выученное.', 'Можно вести несколько языков сразу.', 'Новые и выученные слова считаются в достижениях.'] },
    en: { title: 'Languages', tips: ['Add words and phrases and mark what you have learned.', 'You can keep several languages at once.', 'Added and learned words count towards achievements.'] },
  },
  calendar: {
    ru: { title: 'Календарь', tips: ['Здесь планы и дедлайны по дням.', 'Нажмите на день, чтобы добавить или посмотреть записи.', 'Прогресс прошедших дней смотрите во вкладке «История».'] },
    en: { title: 'Calendar', tips: ['Plans and deadlines by day.', 'Tap a day to add or view entries.', 'Progress of past days is in the History tab.'] },
  },
  history: {
    ru: { title: 'История', tips: ['Прогресс по дням, неделям и месяцам: заливка дня показывает, сколько сделано.', 'Нажмите на день, чтобы увидеть подробности и поправить отметки.', 'Недели и месяцы сворачиваются в статистику.'] },
    en: { title: 'History', tips: ['Progress by day, week and month: the fill of a day shows how much was done.', 'Tap a day to see details and fix marks.', 'Weeks and months roll up into statistics.'] },
  },
  milestones: {
    ru: { title: 'Вехи', tips: ['Вехи — важные повторяющиеся события и достижения, которые вы отмечаете.', 'Добавьте веху и отмечайте её выполнение; история сохраняется.', 'Отметки вех учитываются в достижениях.'] },
    en: { title: 'Milestones', tips: ['Milestones are important recurring events and wins you mark.', 'Add a milestone and mark it done; the history is kept.', 'Milestone marks count towards achievements.'] },
  },
  shop: {
    ru: { title: 'Магазин', tips: ['Тратьте заработанные баллы на награды, которые придумали сами.', 'Добавьте свою награду и цену, покупки сохраняются в истории.', 'Баланс баллов виден в верхней панели.'] },
    en: { title: 'Shop', tips: ['Spend the points you earned on rewards you came up with.', 'Add your own reward and price; purchases are kept in history.', 'Your points balance is in the top bar.'] },
  },
  achievements: {
    ru: { title: 'Достижения', tips: ['Достижения открываются сами, когда вы набираете нужные числа в разделах.', 'У каждого раздела своя лесенка ступеней — видно, сколько осталось.', 'Открытые достижения остаются у вас навсегда.'] },
    en: { title: 'Achievements', tips: ['Achievements unlock by themselves as your numbers grow in each section.', 'Every section has its own ladder of steps, so you can see how much is left.', 'Unlocked achievements stay with you for good.'] },
  },
  customization: {
    ru: { title: 'Кастомизация', tips: ['Темы, рамки и другие оформления: выберите, что нравится.', 'Избранные темы быстро переключаются из меню.', 'Часть предметов открывается за достижения.'] },
    en: { title: 'Customization', tips: ['Themes, frames and other looks: pick what you like.', 'Favorite themes switch quickly from the menu.', 'Some items unlock through achievements.'] },
  },
  community: {
    ru: { title: 'Сообщество', tips: ['Добавляйте друзей и сравнивайте прогресс в рейтинге.', 'Лента показывает достижения друзей.', 'Что видят другие, настраивается в профиле.'] },
    en: { title: 'Community', tips: ['Add friends and compare progress in the leaderboard.', 'The feed shows your friends\' achievements.', 'What others see is set in your profile.'] },
  },
  account: {
    ru: { title: 'Аккаунт', tips: ['Профиль, имя, аватар и данные для входа.', 'Здесь же настройки приватности и выход из аккаунта.', 'Изменения сохраняются сразу.'] },
    en: { title: 'Account', tips: ['Profile, name, avatar and sign-in details.', 'Privacy settings and sign-out are here too.', 'Changes are saved right away.'] },
  },
}

export const PAGE_HINT_LABELS: Record<HintLang, { info: string; ok: string; close: string }> = {
  ru: { info: 'О странице', ok: 'Понятно', close: 'Закрыть' },
  en: { info: 'About this page', ok: 'Got it', close: 'Close' },
}

const seenKey = (page: string) => `page_hint_seen_${page}`

export function hasSeenHint(page: string): boolean {
  try {
    return localStorage.getItem(seenKey(page)) === '1'
  } catch {
    return true // без хранилища не навязываем подсказку на каждом заходе
  }
}

export function markHintSeen(page: string): void {
  try {
    localStorage.setItem(seenKey(page), '1')
  } catch {
    /* ничего: значок «i» остаётся доступен */
  }
}

export function hintFor(page: string, lang: string): PageHintText | null {
  const entry = PAGE_HINTS[page]
  if (!entry) return null
  return entry[lang === 'en' ? 'en' : 'ru']
}
