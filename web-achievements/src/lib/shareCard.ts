// Картинка нового достижения для шаринга (BACKLOG 78.3, срез 1): PNG 1080×1350 — значок грейда, название, условие, строка приложения.
// Значок рисуем как самодостаточный SVG (цвета записаны в самом SVG, без CSS-переменных) и кладём на canvas через drawImage; текст — на canvas.
import { ICON_PATHS } from './icons'
import { gradeShape } from './gradeShape'
import { RARITY_COLOR, type Rarity } from './rewards'

export const CARD_W = 1080
export const CARD_H = 1350

export interface CardSpec {
  grade: Rarity
  icon: string
  title: string // название достижения
  gradeLabel: string // «Редкое»
  condition: string // за что
  message: string // тёплая строка
  appName: string
  dateText: string
}

// Самодостаточный SVG значка: форма грейда (заливка 18% цвета + контур) и иконка в центре.
export function badgeSvg(grade: Rarity, icon: string, size = 640): string {
  const c = RARITY_COLOR[grade]
  const s = gradeShape(grade)
  const body = s.circle ? `<circle cx="32" cy="32" r="28" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="2.5"/>` : `<polygon points="${s.polygon}" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`
  const inner = s.innerRadius ? `<circle cx="32" cy="32" r="${s.innerRadius}" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.7"/>` : ''
  const frag = (ICON_PATHS as Record<string, string>)[icon] || ''
  // иконка 24×24 → 28×28 в центре; currentColor заменяем цветом грейда
  const glyph = frag ? `<svg x="18" y="18" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" color="${c}">${frag}</svg>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" overflow="visible">${body}${inner}${glyph}</svg>`
}

// Перенос по словам; `measure` — ширина строки (ctx.measureText). Лишнее обрезается многоточием; слово длиннее строки режется по символам.
export function wrapText(measure: (s: string) => number, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  const push = (l: string) => lines.push(l)
  for (let w of words) {
    while (measure(w) > maxWidth && w.length > 1) { // слишком длинное слово
      let k = w.length - 1
      while (k > 1 && measure(w.slice(0, k)) > maxWidth) k--
      if (cur) { push(cur); cur = '' }
      push(w.slice(0, k)); w = w.slice(k)
    }
    const next = cur ? cur + ' ' + w : w
    if (measure(next) <= maxWidth) cur = next
    else { if (cur) push(cur); cur = w }
  }
  if (cur) push(cur)
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines)
    let last = cut[maxLines - 1]
    while (last.length > 1 && measure(last + '…') > maxWidth) last = last.slice(0, -1)
    cut[maxLines - 1] = last.replace(/[\s.,;:!?-]+$/, '') + '…'
    return cut
  }
  return lines
}

type Ctx = Pick<CanvasRenderingContext2D, 'fillRect' | 'fillText' | 'measureText' | 'createLinearGradient' | 'createRadialGradient' | 'drawImage' | 'save' | 'restore'> & { fillStyle: unknown; font: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline }

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif'

// Рисует карточку. `badge` — готовая картинка значка (Image/ImageBitmap) или null (тогда только текст).
export function drawCard(ctx: Ctx, spec: CardSpec, badge: CanvasImageSource | null): void {
  const c = RARITY_COLOR[spec.grade]
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H)
  bg.addColorStop(0, '#171b26'); bg.addColorStop(1, '#0d0f16')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CARD_W, CARD_H)
  const glow = ctx.createRadialGradient(CARD_W / 2, 470, 40, CARD_W / 2, 470, 520)
  glow.addColorStop(0, c + '55'); glow.addColorStop(1, c + '00')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, CARD_W, CARD_H)
  if (badge) ctx.drawImage(badge, CARD_W / 2 - 280, 190, 560, 560)
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#9aa3b5'; ctx.font = `600 34px ${FONT}`
  ctx.fillText(spec.appName.toUpperCase(), CARD_W / 2, 120)
  ctx.fillStyle = c; ctx.font = `700 40px ${FONT}`
  ctx.fillText(spec.gradeLabel.toUpperCase(), CARD_W / 2, 830)
  ctx.fillStyle = '#ffffff'; ctx.font = `800 76px ${FONT}`
  const measure = (s: string) => ctx.measureText(s).width
  let y = 930
  const titleLines = wrapText(measure, spec.title, 900, 2)
  for (const line of titleLines) { ctx.fillText(line, CARD_W / 2, y); y += 90 }
  ctx.fillStyle = '#c3cadb'; ctx.font = `400 40px ${FONT}`
  y += 10
  // при двухстрочном названии условию остаётся две строки, чтобы не наезжать на дату
  for (const line of wrapText(measure, spec.condition, 880, titleLines.length > 1 ? 2 : 3)) { ctx.fillText(line, CARD_W / 2, y); y += 56 }
  ctx.fillStyle = '#7f889b'; ctx.font = `400 32px ${FONT}`
  ctx.fillText(spec.dateText, CARD_W / 2, CARD_H - 70)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image')); i.src = src })
}

// PNG-блоб карточки. Если значок не загрузился — карточка без значка, но с текстом.
export async function renderCardBlob(spec: CardSpec): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W; canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  let badge: HTMLImageElement | null = null
  const url = URL.createObjectURL(new Blob([badgeSvg(spec.grade, spec.icon)], { type: 'image/svg+xml' }))
  try { badge = await loadImage(url) } catch { badge = null } finally { URL.revokeObjectURL(url) }
  drawCard(ctx, spec, badge)
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'))
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

// «Поделиться» (Web Share с файлом), а если нельзя — «Скачать». Отмена пользователем (AbortError) — не ошибка.
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text }); return 'shared' } catch (e) { if ((e as Error)?.name === 'AbortError') return 'cancelled' /* иначе — запасной путь: скачать */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

export const cardFileName = (key: string) => `life-dashboard-${key.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'achievement'}.png`
