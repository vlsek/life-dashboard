import { describe, expect, it } from 'vitest'

// Файлы читаем через node:fs; имя модуля собрано строкой, чтобы vue-tsc не требовал @types/node для тестов пилота.
async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}
// Тело файла без ведущих строк-комментариев (в копиях они свои)
const body = (s: string) => s.split('\n').filter((_l, i, a) => !a.slice(0, i + 1).every((x) => x.startsWith('//'))).join('\n').trim()

describe('копии frames.ts совпадают (страж от расхождения)', () => {
  it('web-header, web-community и web-account держат ту же таблицу и функцию, что страница «Кастомизация»', async () => {
    const orig = body(await readSrc('./frames.ts'))
    expect(orig).toContain('FRAME_SHADOWS')
    expect(body(await readSrc('../../../web-header/src/lib/customFrame.ts'))).toBe(orig)
    expect(body(await readSrc('../../../web-community/src/lib/customFrame.ts'))).toBe(orig)
    expect(body(await readSrc('../../../web-account/src/lib/customFrame.ts'))).toBe(orig)
  })
})

describe('стили анимированных рамок есть везде, где рисуется аватар (страж)', () => {
  it('в style.css Кастомизации, Сообщества и Аккаунта и header.css шапки: keyframes, класс и отключение при reduced-motion', async () => {
    const { FRAME_ANIMATIONS } = await import('./frames')
    const files = ['./../style.css', '../../../web-community/src/style.css', '../../../web-header/src/header.css', '../../../web-account/src/style.css']
    for (const f of files) {
      const css = await readSrc(f)
      for (const cls of Object.values(FRAME_ANIMATIONS)) {
        expect(css, f + ' ' + cls).toContain('@keyframes ' + cls)
        expect(css, f + ' ' + cls).toMatch(new RegExp('\\.' + cls + ' \\{ animation: ' + cls))
      }
      // одно правило reduced-motion перечисляет ВСЕ анимированные классы
      const list = Object.values(FRAME_ANIMATIONS).map((c) => '\\.' + c).join(', ')
      expect(css, f).toContain('@media (prefers-reduced-motion: reduce) { ' + list.replace(/\\\./g, '.') + ' { animation: none; } }')
    }
  })
})

describe('рамки-награды лесенок: каждая нарисована и подписана (страж)', () => {
  const NEW = ['frame_ink', 'frame_neuron', 'frame_target', 'frame_gear', 'frame_bookmark', 'frame_steel', 'frame_cup', 'frame_beacon', 'frame_rare_challenges', 'frame_rare_milestones']
  it('у каждой есть тень (кольцо 4px цвета) и названия RU/EN и «за достижение» RU/EN', async () => {
    const { FRAME_SHADOWS } = await import('./frames')
    const i18n = await readSrc('./i18n.ts')
    const { ITEMS } = await import('./customization')
    for (const k of NEW) {
      expect(FRAME_SHADOWS[k], k).toMatch(/0 0 0 4px #[0-9a-f]{6}/i)
      expect([...i18n.matchAll(new RegExp('cust_item_' + k + ':', 'g'))].length, 'название ' + k).toBe(2)
      const ach = ITEMS.find((i) => i.key === k)!.achievement!
      expect([...i18n.matchAll(new RegExp('cust_ach_' + ach + ':', 'g'))].length, 'достижение ' + ach).toBe(2)
    }
  })
  it('анимированы ровно две «редкие» (victory, course), остальные новые — статичные', async () => {
    const { FRAME_ANIMATIONS } = await import('./frames')
    expect(FRAME_ANIMATIONS.frame_rare_challenges).toBe('cust-frame-victory')
    expect(FRAME_ANIMATIONS.frame_rare_milestones).toBe('cust-frame-course')
    for (const k of NEW.filter((x) => !x.startsWith('frame_rare_'))) expect(FRAME_ANIMATIONS[k], k).toBeUndefined()
  })
  it('рамки различимы: у новых нет двух одинаковых теней, и ни одна не повторяет старую', async () => {
    const { FRAME_SHADOWS } = await import('./frames')
    const all = Object.entries(FRAME_SHADOWS)
    expect(new Set(all.map(([, s]) => s)).size - 0).toBeGreaterThanOrEqual(all.length - 1) // допускается один старый дубль (золотая/королевская)
    for (const k of NEW) expect(all.filter(([, s]) => s === FRAME_SHADOWS[k]).length, k).toBe(1)
  })
})
