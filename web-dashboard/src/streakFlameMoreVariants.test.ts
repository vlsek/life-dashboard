// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StreakFlame from './components/StreakFlame.vue'
import { STREAK_FLAME_VARIANT_KEY, writeStreakFlameVariant } from './lib/streakFlameVariant'

// BACKLOG 44.18в (срез 2): новые бесплатные виды огонька серии — «Огненное кольцо» (ring), «Уголёк» (ember), «Свеча» (candle).
const CASES = [
  { variant: 'ring', test: 'streak-flame-ring', cls: 'streak-ring' },
  { variant: 'ember', test: 'streak-flame-ember', cls: 'sf-ember' },
  { variant: 'candle', test: 'streak-flame-candle', cls: 'sf-candle' },
] as const
const hasAny = (w: ReturnType<typeof mount>) => CASES.some((c) => w.find(`[data-test="${c.test}"]`).exists())

describe.each(CASES)('StreakFlame: вид «$variant»', ({ variant, test, cls }) => {
  beforeEach(() => {
    localStorage.clear()
    writeStreakFlameVariant(variant)
  })
  const el = (w: ReturnType<typeof mount>) => w.find(`[data-test="${test}"]`)

  it('от 7 дней рисуется именно он (не единое пламя и не три языка); ступень серии в data-tier', () => {
    for (const [days, tier] of [[7, '1'], [30, '2'], [100, '3']] as const) {
      const w = mount(StreakFlame, { props: { lit: true, days } })
      expect(el(w).exists()).toBe(true)
      expect(el(w).classes()).toContain(cls)
      expect(el(w).attributes('data-tier')).toBe(tier)
      expect(w.find('[data-test="streak-flame-live"]').exists()).toBe(false)
      expect(w.find('[data-test="streak-flame-tongues"]').exists()).toBe(false)
    }
  })
  it('размер: по умолчанию 22, свой size переопределяет и ширину, и высоту', () => {
    const a = mount(StreakFlame, { props: { lit: true, days: 30 } })
    expect([el(a).attributes('width'), el(a).attributes('height')]).toEqual(['22', '22'])
    const b = mount(StreakFlame, { props: { lit: true, days: 30, size: 14 } })
    expect([el(b).attributes('width'), el(b).attributes('height')]).toEqual(['14', '14'])
  })
  it('серия короче 7 дней и не засчитанная сегодня — обычный огонёк/контур, нового вида нет', () => {
    expect(hasAny(mount(StreakFlame, { props: { lit: true, days: 6 } }))).toBe(false)
    expect(hasAny(mount(StreakFlame, { props: { lit: true } }))).toBe(false)
    const dim = mount(StreakFlame, { props: { lit: false, days: 100 } })
    expect(hasAny(dim)).toBe(false)
    expect(dim.find('svg[stroke-dasharray]').exists()).toBe(true)
  })
})

describe('StreakFlame: разметка новых видов', () => {
  beforeEach(() => localStorage.clear())
  it('«Уголёк»: гало, камень, трещинки, сердце и три искры; «Свеча»: тело, фитиль, пламя из двух слоёв и три искры', () => {
    writeStreakFlameVariant('ember')
    const e = mount(StreakFlame, { props: { lit: true, days: 100 } })
    for (const c of ['.ember-halo', '.ember-rock', '.ember-crack', '.ember-core']) expect(e.find(c).exists()).toBe(true)
    expect(e.findAll('.spark')).toHaveLength(3)
    writeStreakFlameVariant('candle')
    const c = mount(StreakFlame, { props: { lit: true, days: 100 } })
    for (const k of ['.candle-body', '.candle-wick', '.candle-flame-out', '.candle-flame-in']) expect(c.find(k).exists()).toBe(true)
    expect(c.findAll('.spark')).toHaveLength(3)
  })
  it('в хранилище лежит неизвестный вид — единое пламя', () => {
    localStorage.setItem(STREAK_FLAME_VARIANT_KEY, 'dragon')
    expect(mount(StreakFlame, { props: { lit: true, days: 30 } }).find('[data-test="streak-flame-live"]').exists()).toBe(true)
  })
})

describe('CSS новых видов (style.css)', () => {
  const css = readFileSync('src/style.css', 'utf-8')
  it('ступени: на ступени 1 искр нет, на ступени 2 скрыта третья; свечение и скорость растут', () => {
    expect(css).toContain(".sf-ember[data-tier='1'] .spark, .sf-candle[data-tier='1'] .spark,")
    expect(css).toContain(".sf-ember[data-tier='2'] .spark-b, .sf-candle[data-tier='2'] .spark-b { display: none; }")
    expect(css).toContain(".sf-ember[data-tier='3'], .sf-candle[data-tier='3'] { --sf-speed: 0.7; --sf-glow: 0.75; }")
  })
  it('анимации гасятся и системным «уменьшить движение», и общим выключателем html[data-motion=off]', () => {
    const block = css.slice(css.indexOf('/* streak-flame-more:start */'), css.indexOf('/* streak-flame-more:end */'))
    expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.sf-ember, \.sf-ember \*, \.sf-candle, \.sf-candle \* \{ animation: none !important; \}/)
    expect(block).toContain("html[data-motion='off'] .sf-ember")
    expect(block).toContain("html[data-motion='off'] .sf-candle")
  })
})
