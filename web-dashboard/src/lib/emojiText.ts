import { EMOJI_TO_SVG, ICON_PATHS } from './icons'

// Эмодзи в тексте интерфейса → единые SVG-иконки (BACKLOG 🎨 «Замена эмодзи на SVG»). Тексты в i18n.ts остаются с эмодзи
// (их же использует классика и plainLabel), а при выводе EmojiText.vue заменяет известные эмодзи на <Icon>. Неизвестные
// эмодзи остаются текстом — ничего не пропадает. Отдельная карта, а не правка EMOJI_TO_SVG: та решает судьбу эмодзи в
// метриках пользователя (там 🎂 или 👤 должны остаться как выбрал человек).
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
