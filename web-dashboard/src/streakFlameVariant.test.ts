// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StreakFlame from './components/StreakFlame.vue'
import {
  DEFAULT_STREAK_FLAME_VARIANT,
  STREAK_FLAME_VARIANTS,
  STREAK_FLAME_VARIANT_KEY,
  readStreakFlameVariant,
  writeStreakFlameVariant,
} from './lib/streakFlameVariant'

// BACKLOG 44.18в (срез 1): вид огонька серии — «единое пламя» (по умолчанию) или «три языка»; выбор делается в «Кастомизации».
describe('streakFlameVariant: реестр', () => {
  beforeEach(() => localStorage.clear())

  it('семь вариантов (срез 2 добавил кольцо, уголёк и свечу, срез 3 — факел и искру), по умолчанию — единое пламя', () => {
    expect([...STREAK_FLAME_VARIANTS]).toEqual(['flame', 'tongues', 'ring', 'ember', 'candle', 'torch', 'spark'])
    expect(DEFAULT_STREAK_FLAME_VARIANT).toBe('flame')
    expect(readStreakFlameVariant()).toBe('flame')
  })
  it('запись → чтение; мусор в хранилище игнорируется', () => {
    expect(writeStreakFlameVariant('tongues')).toBe(true)
    expect(localStorage.getItem(STREAK_FLAME_VARIANT_KEY)).toBe('tongues')
    expect(readStreakFlameVariant()).toBe('tongues')
    localStorage.setItem(STREAK_FLAME_VARIANT_KEY, 'dragon')
    expect(readStreakFlameVariant()).toBe('flame')
  })
})

describe('StreakFlame: вид «три языка»', () => {
  beforeEach(() => localStorage.clear())
  const tongues = (w: ReturnType<typeof mount>) => w.find('[data-test="streak-flame-tongues"]')

  it('по умолчанию — единое пламя, языков нет', () => {
    const w = mount(StreakFlame, { props: { lit: true, days: 30 } })
    expect(w.find('[data-test="streak-flame-live"]').exists()).toBe(true)
    expect(tongues(w).exists()).toBe(false)
  })
  it('выбрано «три языка»: от 7 дней — три языка и сердцевина, ступень в data-tier; на ступени 1 искры скрыты правилом CSS', () => {
    localStorage.setItem(STREAK_FLAME_VARIANT_KEY, 'tongues')
    const t1 = mount(StreakFlame, { props: { lit: true, days: 7 } })
    expect(tongues(t1).exists()).toBe(true)
    expect(t1.find('[data-test="streak-flame-live"]').exists()).toBe(false)
    expect(t1.findAll('.splash-tongues .tongue')).toHaveLength(4)
    expect(tongues(t1).attributes('data-tier')).toBe('1')
    expect(tongues(t1).classes()).toContain('streak-tongues')
    const t3 = mount(StreakFlame, { props: { lit: true, days: 100 } })
    expect(t3.findAll('.splash-tongues .spark').length).toBeGreaterThan(0)
    expect(tongues(t3).attributes('data-tier')).toBe('3')
    const css = readFileSync('src/style.css', 'utf-8')
    expect(css).toContain(".streak-tongues[data-tier='1'] .spark { display: none; }")
  })
  it('размер передаётся пламени; меньше 7 дней и не засчитанный стрик остаются как раньше при любом выборе', () => {
    localStorage.setItem(STREAK_FLAME_VARIANT_KEY, 'tongues')
    expect(tongues(mount(StreakFlame, { props: { lit: true, days: 30, size: 16 } })).attributes('width')).toBe('16')
    const short = mount(StreakFlame, { props: { lit: true, days: 6 } })
    expect(tongues(short).exists()).toBe(false)
    expect(short.find('svg').classes()).toContain('streak-flame')
    const dim = mount(StreakFlame, { props: { lit: false, days: 100 } })
    expect(tongues(dim).exists()).toBe(false)
    expect(dim.find('[data-test="streak-flame-live"]').exists()).toBe(false)
  })
})
