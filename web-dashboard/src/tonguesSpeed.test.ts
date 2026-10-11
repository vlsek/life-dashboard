// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 58.3: «три языка пламени» были очень быстрыми — вернули медленную и приятную. Скорость — ОДНА ручка --tongue-slow
// (1 = как в оригинале 1.3 с, больше = медленнее) на всех поверхностях: заставка до загрузки, заставка в приложении, предпросмотр в Кастомизации, огонёк серии.
const BASE = { c: 1.3, l: 0.95, r: 1.15, core: 0.8 } as const
const slowOf = (css: string, selector: string): number => {
  const m = css.match(new RegExp(selector.replace(/[.\[\]]/g, '\\$&') + ' \\{[^}]*--tongue-slow: ([0-9.]+);'))
  expect(m, selector + ' задаёт --tongue-slow').not.toBeNull()
  return Number(m![1])
}

describe('«три языка»: скорость', () => {
  const dash = readFileSync('src/style.css', 'utf-8')
  const cust = readFileSync('../web-customization/src/style.css', 'utf-8')
  const html = readFileSync('index.html', 'utf-8')

  it('замедление ощутимое (от 1.5 до 3 раз медленнее оригинала) и одинаковое везде', () => {
    const vals = [slowOf(dash, '.splash-tongues'), slowOf(cust, '.splash-tongues'), slowOf(html, '.pre-tongues')]
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(1.5)
      expect(v).toBeLessThanOrEqual(3)
    }
    expect(new Set(vals).size).toBe(1)
  })

  it('все четыре анимации языков считаются от ручки, а не от жёстких секунд (заставка в приложении, Кастомизация, статичная заставка)', () => {
    for (const k of Object.keys(BASE) as (keyof typeof BASE)[]) {
      const d = BASE[k] + 's'
      const re = (name: string) => new RegExp('animation: ' + name + ' calc\\(' + d.replace('.', '\\.') + ' \\* var\\(--tongue-slow\\)\\)')
      expect(dash, 'dashboard tongue-' + k).toMatch(re('tongue-' + k))
      expect(cust, 'customization tongue-' + k).toMatch(re('tongue-' + k))
      expect(html, 'pre tongues ' + k).toMatch(re({ c: 'pre-tc', l: 'pre-tl', r: 'pre-tr', core: 'pre-tk' }[k]))
    }
    expect(dash).not.toMatch(/animation: tongue-[a-z]+ [0-9.]+s/) // жёстких секунд не осталось
    expect(cust).not.toMatch(/animation: tongue-[a-z]+ [0-9.]+s/)
  })

  it('у огонька серии скорость растёт со ступенью (1 → 0.85 → 0.7), как у прежнего пламени стрика', () => {
    expect(dash).toMatch(/\.streak-tongues \{ --tier-speed: 1; \}/)
    expect(dash).toMatch(/\.streak-tongues\[data-tier='2'\] \{ --tier-speed: 0\.85; \}/)
    expect(dash).toMatch(/\.streak-tongues\[data-tier='3'\] \{ --tier-speed: 0\.7; \}/)
    for (const k of Object.keys(BASE) as (keyof typeof BASE)[])
      expect(dash).toContain('.streak-tongues .tongue-' + k + ' { animation-duration: calc(' + BASE[k] + 's * var(--tongue-slow) * var(--tier-speed)); }')
  })

  it('эффективные длительности: ступень 1 в «Три языка» не быстрее заставки; ступень 3 всё ещё не быстрее оригинала', () => {
    const slow = slowOf(dash, '.splash-tongues')
    for (const base of Object.values(BASE)) {
      expect(base * slow).toBeGreaterThanOrEqual(base * 1.5) // заставка
      expect(base * slow * 0.7).toBeGreaterThanOrEqual(base * 1.0) // самая быстрая ступень огонька — не быстрее исходных значений
    }
  })
})
