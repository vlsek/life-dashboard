import { EMOJI_TO_SVG, ICON_PATHS } from './icons'

// Эмодзи в тексте интерфейса → единые SVG-иконки (BACKLOG 1.3 «Замена эмодзи на SVG» + повторы владельца 17:05 и 12:00).
// Тексты в i18n.ts остаются с эмодзи (их же использует классика и plainLabel), а при выводе EmojiText.vue заменяет известные
// эмодзи на <Icon>. Неизвестные эмодзи остаются текстом — ничего не пропадает. Отдельная карта, а не правка EMOJI_TO_SVG: та решает
// судьбу эмодзи в метриках пользователя (там 🎂 или 👤 должны остаться как выбрал человек). Одинаковая копия во всех пилотах.
// Для мест, где SVG не вставить (title, placeholder, aria-label, option), есть stripEmoji(): убирает эмодзи и лишний пробел.
const UI_EXTRA: Record<string, string> = {
  '👤': 'user',
  '🎨': 'paintbrush',
  '🎂': 'cake',
  '👀': 'eye',
  '⚙': 'gear',
  '➕': 'plus',
  '📷': 'camera',
  '⚠': 'alert',
  '📋': 'checklist',
  '🌐': 'english',
  '🏁': 'challenges',
  '🚩': 'milestones',
  '🛍': 'shop',
  '🕘': 'history',
  '🥋': 'skills',
  '🌸': 'flower',
  '✕': 'x',
  '✅': 'done',
  '🏆': 'trophy',
  '🏋': 'workouts',
  '📈': 'chart',
  '📊': 'chart',
  '📲': 'phone',
  '⬆': 'upload',
  'ℹ': 'info',
  '☰': 'menu',
  '💧': 'droplet',
  '🔥': 'flame',
  '⭐': 'star',
  '🎉': 'party',
  '📅': 'calendar',
  '🗓': 'calendar',
  '✉': 'mail',
  '🔗': 'link',
  '📌': 'pin',
  '🤝': 'community',
  '📝': 'note',
  '🎯': 'goals',
  '📖': 'book',
  '📚': 'book',
  '✨': 'sparkles',
  '🛠': 'wrench',
  '🔑': 'key',
  '🥇': 'medal',
  '🔢': 'hash',
  '🙂': 'smile',
  '🏠': 'home',
  '💾': 'save',
  '🔔': 'bell',
  '🔐': 'lock',
  '👋': 'hand',
  '💰': 'wallet',
  // Иконки пресетов (BACKLOG «Эмодзи в данных-пресетах»): шаблоны челленджей, пресеты навыков. Подобраны из уже существующих SVG; данные в базе остаются эмодзи.
  '🥶': 'snow', // «Холодный душ каждый день»
  '🍬': 'cake', // «Без сахара»
  '🗣': 'english', // «Выучить 100 новых слов»
  '⌨': 'laptop', // навык «Слепая печать»
  '🌉': 'stretch', // навык «Мостик»
  '😗': 'music', // навык «Свист пальцами»
  '🤸': 'stretch', // навыки «Шпагат»
  '🤹': 'sparkles', // навык «Жонглирование»
  '🤾': 'yoga', // навык «Стойка на руках»
  '🫁': 'lungs', // дыхание
  '🛒': 'cart',
  '💡': 'bulb',
  '💪': 'dumbbell',
  '🦵': 'squat',
  '🧭': 'compass',
  '🪙': 'coin',
  '✎': 'edit',
}

export const UI_EMOJI_TO_SVG: Record<string, string> = { ...(EMOJI_TO_SVG as Record<string, string>), ...UI_EXTRA }

export type EmojiSegment = { kind: 'text'; value: string } | { kind: 'icon'; name: string; char: string }

const VS16 = '\uFE0F'

// Режет строку на текст и иконки. Ключи в карте хранятся без VS16 (\uFE0F), а в тексте он обычно есть (⚙️) — склеиваем.
// Если после иконки сразу идёт один пробел, он убирается (отступ даёт CSS): «📌 Планы» → [иконка][«Планы»].
export function splitEmojiText(text: string): EmojiSegment[] {
  const out: EmojiSegment[] = []
  let buf = ''
  const chars = Array.from(text)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const name = UI_EMOJI_TO_SVG[ch]
    if (name && (ICON_PATHS as Record<string, string>)[name]) {
      let consumed = ch
      if (chars[i + 1] === VS16) {
        consumed += VS16
        i++
      }
      if (buf) {
        out.push({ kind: 'text', value: buf })
        buf = ''
      }
      out.push({ kind: 'icon', name, char: consumed })
      if (chars[i + 1] === ' ') i++ // пробел после иконки заменяет CSS-отступ
    } else {
      buf += ch
    }
  }
  if (buf) out.push({ kind: 'text', value: buf })
  return out
}

// Пиктограммы (эмодзи и символы-картинки), но не типографика: ✓ ✕ → … — остаются.
const KEEP = new Set(['✓', '✔', '✕', '✖', '→', '←', '↑', '↓', '…', '—', '–', '·', '•', '×', '±', '↻', '↶', '▾', '▴', '★', '☆']) // ★ ☆ — текстовые ссылки на глиф кнопки «бонус» в пояснениях, не картинки
const PICTO = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{2B05}-\u{2B07}\u{2705}\u{2728}\u{23F0}\u{231B}\u{2139}\u{2194}-\u{2199}\u{21A9}\u{21AA}\u{2934}\u{2935}][\uFE0F\u200D]?/gu

// Есть ли в тексте пиктограмма (кроме типографики). Нужен защитному тесту: ни одна строка интерфейса не должна оставлять эмодзи без SVG.
export function hasEmoji(text: string): boolean {
  for (const m of text.matchAll(PICTO)) if (!KEEP.has(m[0].replace(/[️‍]/g, ''))) return true
  return false
}

// Текст без эмодзи — для title / placeholder / aria-label / <option>, куда SVG не вставить: «🔥 Активные» → «Активные».
export function stripEmoji(text: string): string {
  return text
    .replace(PICTO, (m) => (KEEP.has(m.replace(/[\uFE0F\u200D]/g, '')) ? m : ''))
    .replace(/^\s+/, '')
    .replace(/ {2,}/g, ' ')
}
