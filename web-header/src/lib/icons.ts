// Урезанная копия icons.ts дашборда: шапке нужны только два вида иконок — капля (метрика воды) и весы
// (параметр «вес» для авто-нормы воды). Полный набор иконок здесь не нужен.
export type IconName = 'droplet' | 'scale'
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
