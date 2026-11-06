import { describe, expect, it, vi } from 'vitest'
import { CARD_H, CARD_W, badgeSvg, cardFileName, drawCard, shareOrDownload, wrapText, type CardSpec } from './shareCard'
import { gradeShape } from './gradeShape'
import { RARITY_COLOR } from './rewards'

const spec: CardSpec = { grade: 'rare', icon: 'skills', title: 'Первая неделя', gradeLabel: 'Редкое', condition: 'Выполняй все метрики дня', message: '', appName: 'Life Dashboard', dateText: '4 ноября 2026' }

describe('gradeShape (общая форма значка)', () => {
  it('круг у обычного и необычного (у необычного внутреннее кольцо 22), многоугольники у остальных, у легендарного кольцо 20', () => {
    expect(gradeShape('common')).toMatchObject({ circle: true, innerRadius: null })
    expect(gradeShape('uncommon')).toMatchObject({ circle: true, innerRadius: 22 })
    expect(gradeShape('rare').polygon?.split(' ').length).toBe(6)
    expect(gradeShape('epic').polygon?.split(' ').length).toBe(20)
    expect(gradeShape('legendary')).toMatchObject({ innerRadius: 20 })
    expect(gradeShape('legendary').polygon?.split(' ').length).toBe(28)
  })
})

describe('badgeSvg', () => {
  it('самодостаточный SVG: цвет грейда записан явно, иконка вложена, без currentColor и CSS-переменных', () => {
    const s = badgeSvg('rare', 'skills')
    expect(s).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(s).toContain(RARITY_COLOR.rare)
    expect(s).toContain('<polygon')
    expect(s).toContain('<circle cx="12" cy="9" r="5.5"/>') // фрагмент иконки skills
    expect(s).not.toContain('var(--')
  })
  it('необычное — круг и внутреннее кольцо; неизвестная иконка не ломает', () => {
    const s = badgeSvg('uncommon', 'нет-такой-иконки')
    expect(s).toContain('r="28"'); expect(s).toContain('r="22"')
  })
})

describe('wrapText', () => {
  const m = (s: string) => s.length * 10 // 10 px на символ
  it('переносит по словам', () => {
    expect(wrapText(m, 'один два три четыре', 80, 5)).toEqual(['один два', 'три', 'четыре'])
  })
  it('режет слишком длинное слово по символам', () => {
    expect(wrapText(m, 'супердлинноеслово', 60, 5)).toEqual(['суперд', 'линное', 'слово'])
  })
  it('лишние строки обрезаются многоточием, которое тоже умещается в ширину', () => {
    const r = wrapText(m, 'а б в г д е ж з и к л м н о п', 40, 2)
    expect(r.length).toBe(2)
    expect(r[1].endsWith('…')).toBe(true)
    expect(m(r[1])).toBeLessThanOrEqual(40)
  })
  it('пустой текст — пусто', () => { expect(wrapText(m, '   ', 100, 3)).toEqual([]) })
})

describe('drawCard', () => {
  function rec() {
    const texts: string[] = []; const images: unknown[][] = []; const rects: unknown[][] = []
    const grad = () => ({ addColorStop: vi.fn() })
    const ctx = { fillStyle: '' as unknown, font: '', textAlign: 'left' as CanvasTextAlign, textBaseline: 'alphabetic' as CanvasTextBaseline, fillRect: (...a: unknown[]) => rects.push(a), fillText: (s: string) => texts.push(s), measureText: (s: string) => ({ width: s.length * 20 }), createLinearGradient: grad, createRadialGradient: grad, drawImage: (...a: unknown[]) => images.push(a), save: () => {}, restore: () => {} }
    return { ctx: ctx as never, texts, images, rects }
  }
  it('рисует фон на весь холст, значок, подписи и дату', () => {
    const { ctx, texts, images, rects } = rec()
    drawCard(ctx, spec, {} as CanvasImageSource)
    expect(rects[0]).toEqual([0, 0, CARD_W, CARD_H])
    expect(images.length).toBe(1)
    expect(texts).toEqual(expect.arrayContaining(['LIFE DASHBOARD', 'РЕДКОЕ', 'Первая неделя', 'Выполняй все метрики дня', '4 ноября 2026']))
  })
  it('без картинки значка рисует только текст', () => {
    const { ctx, images, texts } = rec()
    drawCard(ctx, spec, null)
    expect(images.length).toBe(0)
    expect(texts.length).toBeGreaterThan(3)
  })
})

describe('shareOrDownload', () => {
  const blob = new Blob(['x'], { type: 'image/png' })
  it('Web Share с файлом, если браузер умеет: возвращает shared и ничего не скачивает', async () => {
    const share = vi.fn(async () => {}); Object.defineProperty(navigator, 'share', { value: share, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    expect(await shareOrDownload(blob, 'a.png', 'текст')).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })
  it('отмена в окне «Поделиться» — cancelled, без скачивания', async () => {
    Object.defineProperty(navigator, 'share', { value: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) }, configurable: true })
    expect(await shareOrDownload(blob, 'a.png', 't')).toBe('cancelled')
  })
  it('нет Web Share (или он упал не по отмене) — скачивает файл', async () => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true })
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x'); globalThis.URL.revokeObjectURL = vi.fn()
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download) })
    expect(await shareOrDownload(blob, 'life.png', 't')).toBe('downloaded')
    expect(names).toEqual(['life.png'])
  })
})

describe('cardFileName', () => {
  it('безопасное имя из ключа', () => {
    expect(cardFileName('streak_7')).toBe('life-dashboard-streak_7.png')
    expect(cardFileName('a b/c?')).toBe('life-dashboard-a-b-c-.png')
    expect(cardFileName('')).toBe('life-dashboard-achievement.png')
  })
})
