// «Справка» с поиском (BACKLOG 79.10): общие темы (баллы, серии, норма воды, офлайн, значки) + по теме на каждую страницу из уже написанных подсказок (`PAGE_HINTS`).
import { PAGE_HINTS, type HintLang } from './pageHints'
import { norm } from './palette'

export interface HelpTopic {
  id: string
  title: string
  paragraphs: string[] // абзацы или пункты
  href?: string // «Открыть страницу»
}

// Страницы из подсказок → адреса (ключ `english` — страница «Языки»).
const PAGE_HREF: Record<string, string> = {
  dashboard: '/dashboard/', goals: '/goals/', skills: '/skills/', workouts: '/workouts/', challenges: '/challenges/', english: '/languages/', calendar: '/calendar/',
  history: '/history/', milestones: '/milestones/', shop: '/shop/', achievements: '/achievements/', customization: '/customization/', community: '/community/', account: '/account/',
}

const GENERAL: Record<HintLang, Omit<HelpTopic, 'href'>[]> = {
  ru: [
    { id: 'points', title: 'Как работают баллы', paragraphs: ['Баллы начисляются за выполненные метрики дня, достигнутые цели, освоенные навыки, прочитанные книги и завершённые челленджи.', 'Накопленные баллы можно тратить в магазине.', 'Книги, добавленные импортом из Goodreads, баллов не дают.'] },
    { id: 'streaks', title: 'Серии', paragraphs: ['Серия идеальных дней — это дни подряд, в которых все метрики выполнены полностью.', 'В челленджах отмечай дни: кольцо показывает прогресс, а серия подряд растёт.', 'Прогресс прошедших дней смотри на странице «История».'] },
    { id: 'water', title: 'Норма воды', paragraphs: ['Если у метрики воды не задана цель, норма считается сама: вес × 26 мл. Если вес не указан, берётся 1800 мл. Учитывается и вода из еды.', 'Свою цель можно задать в управлении метриками; вес берётся из твоей метрики «Вес», если она есть.', 'Анимацию «записалось» при добавлении воды выбирают в «Кастомизации».'] },
    { id: 'offline', title: 'Как работает офлайн', paragraphs: ['Записи, сделанные без связи, хранятся на этом устройстве и отправятся сами, когда появится сеть.', 'В шапке появляется облачко с числом записей, которые ждут отправки; зачёркнутое облачко — связи нет.', 'Если сервер отклонил запись, её можно повторить или удалить: нажми на облачко.'] },
    { id: 'icons', title: 'Что значат значки', paragraphs: ['Облачко в шапке — офлайн-очередь (ждут отправки, проблемы синхронизации, нет связи).', 'Значок «i» под шапкой открывает подсказку к текущей странице.', 'Ctrl/Cmd + K или «/» открывает палитру команд, «?» — шпаргалку по горячим клавишам.'] },
  ],
  en: [
    { id: 'points', title: 'How points work', paragraphs: ['Points are earned for finished daily metrics, reached goals, mastered skills, books read and completed challenges.', 'Collected points can be spent in the shop.', 'Books added by a Goodreads import give no points.'] },
    { id: 'streaks', title: 'Streaks', paragraphs: ['A perfect-day streak is days in a row where all metrics are fully completed.', 'In challenges, mark your days: the ring shows progress and the streak in a row grows.', 'See the progress of past days on the History page.'] },
    { id: 'water', title: 'Water goal', paragraphs: ['If the water metric has no goal set, the goal is calculated for you: weight × 26 ml. Without a weight it is 1800 ml. Water from food is taken into account.', 'You can set your own goal in metric management; the weight comes from your “Weight” metric, if you have one.', 'The “saved” animation shown when you add water is chosen in Customization.'] },
    { id: 'offline', title: 'How offline works', paragraphs: ['Entries made without a connection are kept on this device and sent automatically when the network is back.', 'A cloud appears in the header with the number of entries waiting to be sent; a crossed-out cloud means there is no connection.', 'If the server rejected an entry you can retry or delete it: tap the cloud.'] },
    { id: 'icons', title: 'What the icons mean', paragraphs: ['The cloud in the header is the offline queue (waiting to send, sync problems, no connection).', 'The “i” icon under the header opens a hint for the current page.', 'Ctrl/Cmd + K or “/” opens the command palette, “?” opens the hotkey cheat sheet.'] },
  ],
}

export function helpTopics(lang: HintLang): HelpTopic[] {
  const pages: HelpTopic[] = []
  for (const [key, v] of Object.entries(PAGE_HINTS)) {
    const h = v[lang]
    if (h) pages.push({ id: 'page:' + key, title: h.title, paragraphs: h.tips, href: PAGE_HREF[key] })
  }
  return [...GENERAL[lang], ...pages]
}

// Поиск без учёта регистра и «ё»; все слова запроса должны встретиться в названии или тексте. Совпадения в названии — выше.
export function searchHelp(topics: HelpTopic[], query: string): HelpTopic[] {
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return topics
  const scored: { t: HelpTopic; s: number }[] = []
  for (const t of topics) {
    const title = norm(t.title)
    const body = norm(t.paragraphs.join(' '))
    if (!words.every((w) => title.includes(w) || body.includes(w))) continue
    scored.push({ t, s: words.filter((w) => title.includes(w)).length })
  }
  return scored.map((x, i) => ({ ...x, i })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.t)
}
