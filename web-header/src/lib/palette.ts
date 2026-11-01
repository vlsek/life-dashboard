// Командная палитра (BACKLOG 79.1, срез 1): быстрый переход на страницу или действие по набору букв.
// Поиск по данным (цели, навыки, метрики, заметки) — следующие срезы; здесь только страницы и два действия шапки.
import { HOTKEY_PAGES } from './hotkeys'

export type PaletteKind = 'page' | 'action'
export interface PaletteItem { id: string; kind: PaletteKind; ru: string; en: string; href?: string; hint?: string; needs?: 'water' } // needs — пункт показывается, только если условие выполнено

export const PALETTE_ITEMS: readonly PaletteItem[] = [
  ...HOTKEY_PAGES.map((p): PaletteItem => ({ id: 'page:' + p.letter, kind: 'page', ru: p.ru, en: p.en, href: p.href, hint: 'g ' + p.letter })),
  { id: 'action:water', kind: 'action', ru: 'Вода: записать стакан', en: 'Water: log a drink', needs: 'water' },
  { id: 'action:settings', kind: 'action', ru: 'Глобальные настройки', en: 'Global settings' },
  { id: 'action:hotkeys', kind: 'action', ru: 'Горячие клавиши', en: 'Keyboard shortcuts', hint: '?' },
]

// ё = е, регистр не важен; ищем по обоим языкам сразу (английское название работает и в русском интерфейсе)
export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

function score(item: PaletteItem, tokens: string[]): number {
  const labels = [norm(item.ru), norm(item.en)]
  let total = 0
  for (const tk of tokens) {
    let best = -1
    for (const l of labels) {
      const i = l.indexOf(tk)
      if (i < 0) continue
      const s = i === 0 ? 0 : l[i - 1] === ' ' ? 1 : 2 // начало названия лучше начала слова лучше середины
      if (best < 0 || s < best) best = s
    }
    if (best < 0) return -1
    total += best
  }
  return total
}

// Пустой запрос — всё в исходном порядке. Иначе: все слова запроса должны встретиться; сортировка по score, при равенстве — исходный порядок.
export function filterPalette(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return [...items]
  return items
    .map((it, i) => ({ it, i, s: score(it, tokens) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.it)
}

// Пункты, доступные сейчас: «вода» только при включённом учёте воды и существующей метрике (иначе окно воды не откроется)
export function availableItems(items: readonly PaletteItem[], ctx: { water: boolean }): PaletteItem[] {
  return items.filter((i) => !i.needs || (i.needs === 'water' && ctx.water))
}
