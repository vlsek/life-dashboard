import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FrameDecor from './components/FrameDecor.vue'
import { FRAME_DECOR_KEYS, frameDecor } from './lib/frameDecor'
import { FRAME_SHADOWS } from './lib/frames'
import { ITEMS } from './lib/customization'
import { t } from './lib/i18n'

// Файлы читаем через node:fs; имя модуля собрано строкой, чтобы vue-tsc не требовал @types/node для тестов пилота.
async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}
const body = (s: string) => s.split('\n').filter((_l, i, a) => !a.slice(0, i + 1).every((x) => x.startsWith('//'))).join('\n').trim()
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length

// BACKLOG 44.18з (срез 1): рамки-орнаменты «не кругом» — SVG-слой вокруг аватара (lib/frameDecor.ts + FrameDecor.vue).
describe('реестр орнаментов', () => {
  it('три рамки с орнаментом: венок, лианы, вензель; у остальных и у мусора — пустая строка', () => {
    expect(FRAME_DECOR_KEYS).toEqual(['frame_wreath', 'frame_vines', 'frame_flourish', 'frame_tyre', 'frame_helm'])
    for (const k of FRAME_DECOR_KEYS) expect(frameDecor(k).length, k).toBeGreaterThan(200)
    for (const k of ['frame_neon', 'frame_gold', 'нет_такой', '', null, undefined]) expect(frameDecor(k as never)).toBe('')
  })
  it('венок: листья по обеим ветвям, лента и две ягоды; лианы: стебель, листья и цветы; вензель: кольцо, четыре завитка и четыре ромба', () => {
    const w = frameDecor('frame_wreath')
    expect(count(w, /<ellipse /g)).toBe(2 * 11 * 2 + 2) // 2 ветви × 11 пар листьев + две полоски ленты (заливка и контур)
    expect(count(w, /fill="#d8434e"/g)).toBe(2)
    const v = frameDecor('frame_vines')
    expect(count(v, /<path /g)).toBe(1)
    expect(count(v, /<ellipse /g)).toBe(30)
    expect(count(v, /fill="#ff7aa8"/g)).toBe(6)
    const f = frameDecor('frame_flourish')
    expect(count(f, /<g transform=/g)).toBe(4)
    expect(count(f, /<rect /g)).toBe(4)
    expect(f).toContain('<circle cx="50" cy="50" r="52"')
  })
  it('все координаты орнамента лежат в разумных пределах слоя (−20…120 при viewBox 0…100), без «улетевших» точек', () => {
    for (const k of FRAME_DECOR_KEYS) {
      const s = frameDecor(k)
      const pts = [...s.matchAll(/c[xy]="(-?[\d.]+)"/g)].map((m) => Number(m[1]))
      expect(pts.length, k).toBeGreaterThan(0)
      for (const v of pts) expect(v, k).toBeGreaterThan(-20)
      for (const v of pts) expect(v, k).toBeLessThan(120)
    }
  })
  it('«Шина»: покрышка, 24 блока протектора, светлая боковина и вентиль; «Штурвал»: обод и восемь рукоятей с набалдашниками', () => {
    const ty = frameDecor('frame_tyre')
    expect(count(ty, /<rect /g)).toBe(24)
    expect(count(ty, /<circle /g)).toBe(4) // покрышка, боковина, внешний контур, вентиль
    const h = frameDecor('frame_helm')
    expect(count(h, /<line /g)).toBe(8)
    expect(count(h, /<circle /g)).toBe(2 + 8 + 8) // два кольца обода, восемь набалдашников, восемь заклёпок
  })
  it('результат стабилен: повторный вызов возвращает ту же строку', () => {
    expect(frameDecor('frame_wreath')).toBe(frameDecor('frame_wreath'))
  })
})

describe('FrameDecor.vue', () => {
  const avatar = '<span data-test="the-avatar" class="av"></span>'
  it('у рамки с орнаментом: обёртка, аватар внутри и SVG поверх (не влияет на вёрстку)', () => {
    const w = mount(FrameDecor, { props: { frame: 'frame_wreath' }, slots: { default: avatar } })
    expect(w.find('[data-test="frame-decor-wrap"]').exists()).toBe(true)
    expect(w.find('[data-test="frame-decor-wrap"] [data-test="the-avatar"]').exists()).toBe(true)
    const svg = w.get('svg[data-test="frame-decor"]')
    expect(svg.attributes('viewBox')).toBe('0 0 100 100')
    expect(svg.attributes('style')).toContain('overflow: visible')
    expect(svg.attributes('style')).toContain('pointer-events: none')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.html()).toContain('<ellipse')
  })
  it('у рамки БЕЗ орнамента, без рамки и с мусором — только сам аватар, ни обёртки, ни SVG (разметка как раньше)', () => {
    for (const frame of ['frame_neon', null, undefined, 'нет_такой']) {
      const w = mount(FrameDecor, { props: { frame }, slots: { default: avatar } })
      expect(w.find('[data-test="the-avatar"]').exists(), String(frame)).toBe(true)
      expect(w.find('[data-test="frame-decor-wrap"]').exists(), String(frame)).toBe(false)
      expect(w.find('svg').exists(), String(frame)).toBe(false)
    }
  })
})

describe('каталог и копии', () => {
  it('каждая рамка с орнаментом — платный предмет каталога: есть тень-кольцо, название и редкость', () => {
    for (const k of FRAME_DECOR_KEYS) {
      expect(FRAME_SHADOWS[k], k).toBeTruthy()
      const item = ITEMS.find((i) => i.key === k)
      expect(item?.category, k).toBe('avatar_frame')
      expect(item?.source, k).toBe('points')
      expect(t(`cust_item_${k}` as never), k).not.toBe('')
    }
  })
  it('копии frameDecor.ts (header, community, account, dashboard) и FrameDecor.vue (header, community, account) совпадают с оригиналом (страж)', async () => {
    const ts = body(await readSrc('./lib/frameDecor.ts'))
    const vue = (await readSrc('./components/FrameDecor.vue')).trim()
    for (const d of ['web-header', 'web-community', 'web-account', 'web-dashboard']) {
      expect(body(await readSrc(`../../${d}/src/lib/frameDecor.ts`)), d).toBe(ts)
      if (d !== 'web-dashboard') expect((await readSrc(`../../${d}/src/components/FrameDecor.vue`)).trim(), d).toBe(vue) // в Дашборде свой слой в AvatarProgress.vue
    }
  })
})
