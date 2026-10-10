import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import HeaderProgressBadge from './components/HeaderProgressBadge.vue'
import type { WeekDaySegment } from './lib/progress'

// BACKLOG 53.3 🐞: на Дашборде значок недели в верхней панели рисовался СТАРЫМ «скруглённым квадратом», а на остальных страницах (общая шапка) — семиугольником.
const days: WeekDaySegment[] = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-0${i + 1}`, state: i < 3 ? 'past' : i === 3 ? 'today' : 'future', done: 1, total: 2, fill: i < 3 ? 0.5 : 0, bonus: 0, pct: 50 }))
const base = { basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'w' }

describe('значок недели в шапке Дашборда', () => {
  it('вид по умолчанию и данные по 7 дням — семиугольник, как в общей шапке', async () => {
    document.body.innerHTML = '<div id="topbar-right"></div>'
    const w = mount(HeaderProgressBadge, { props: { kind: 'week', ...base, shape: 'heptagon', days }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('#topbar-right [data-test="week-heptagon"]')).toBeTruthy()
    expect(document.querySelector('#topbar-right rect')).toBeNull()
    w.unmount()
  })
  it('вид «классика» или нет данных по дням — прежний квадрат; день — круг', async () => {
    document.body.innerHTML = '<div id="topbar-right"></div>'
    const classic = mount(HeaderProgressBadge, { props: { kind: 'week', ...base, shape: 'classic', days }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('#topbar-right rect')).toBeTruthy()
    classic.unmount()
    document.body.innerHTML = '<div id="topbar-right"></div>'
    const noDays = mount(HeaderProgressBadge, { props: { kind: 'week', ...base, shape: 'heptagon', days: null }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('#topbar-right rect')).toBeTruthy()
    noDays.unmount()
    document.body.innerHTML = '<div id="topbar-right"></div>'
    const day = mount(HeaderProgressBadge, { props: { kind: 'day', ...base, shape: 'heptagon', days }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('#topbar-right [data-test="week-heptagon"]')).toBeNull()
    day.unmount()
  })
  it('WeekHeptagon.vue — копия файла общей шапки (расхождение ронает тест)', () => {
    const own = readFileSync('src/components/WeekHeptagon.vue', 'utf8') as string
    const header = readFileSync('../web-header/src/components/WeekHeptagon.vue', 'utf8') as string
    const norm = (s: string) => s.replace(/\/\/ КОПИЯ[^\n]*\n/g, '').trim()
    expect(norm(own)).toBe(norm(header))
  })
})
