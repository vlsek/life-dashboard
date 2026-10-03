// Урезанная копия icons.ts дашборда: шапке нужны только два вида иконок — капля (метрика воды) и весы
// (параметр «вес» для авто-нормы воды). Полный набор иконок здесь не нужен.
export type IconName = 'droplet' | 'scale'

// Пути SVG для <EmojiText> (BACKLOG «Эмодзи: вода и шапка»): копия нужных иконок из web-dashboard/src/lib/icons.ts (24×24, stroke).
export const ICON_PATHS: Record<string, string> = {
  droplet: '<path d="M12 3.5c3.5 4.5 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10.5z"/>',
  scale: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><path d="M8 10.5a4.6 4.2 0 0 1 8 0"/><path d="M12 12.6l1.8-2.2"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  workouts: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  edit: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z"/><path d="M14.5 6.5l3 3"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 15l4-5 3 3 5-6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
}
const EMOJI_TO_SVG: Record<string, IconName> = {
  '💧': 'droplet',
  '💦': 'droplet',
  '⚖': 'scale',
}

export function metricIconKey(icon: string | null | undefined): IconName | null {
  if (!icon) return null
  if (icon.startsWith('svg:')) {
    const k = icon.slice(4)
    return k === 'droplet' || k === 'scale' ? k : null
  }
  const norm = icon.replace(/\uFE0F/g, '').replace(/\u200D[\u2640\u2642]/g, '').trim()
  return EMOJI_TO_SVG[norm] || null
}
