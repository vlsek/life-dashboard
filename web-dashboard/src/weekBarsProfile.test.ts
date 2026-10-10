import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProgressRing from './components/ProgressRing.vue'
import HeaderProgressBadge from './components/HeaderProgressBadge.vue'
import type { WeekDaySegment } from './lib/progress'

// BACKLOG 53.2: «семь столбиков» на Дашборде — в кольце недели профиля и в значке верхней панели.
const days: WeekDaySegment[] = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-0${i + 1}`, state: i < 3 ? 'past' : i === 3 ? 'today' : 'future', done: 1, total: 2, fill: i < 3 ? 0.5 : 0, bonus: 0, pct: 50 }))
const p = { basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'w' }

describe('семь столбиков на Дашборде', () => {
  it('кольцо недели в профиле: shape=bars и данные по 7 дням → столбики; без данных — обычное кольцо', () => {
    expect(mount(ProgressRing, { props: { ...p, size: 48, shape: 'bars', days } }).find('[data-test="week-bars"]').exists()).toBe(true)
    expect(mount(ProgressRing, { props: { ...p, size: 48, shape: 'bars', days: null } }).find('[data-test="week-bars"]').exists()).toBe(false)
    expect(mount(ProgressRing, { props: { ...p, size: 48, shape: 'heptagon', days } }).find('[data-test="week-bars"]').exists()).toBe(false)
  })
  it('значок в верхней панели: bars → столбики', async () => {
    document.body.innerHTML = '<div id="topbar-right"></div>'
    const w = mount(HeaderProgressBadge, { props: { kind: 'week', ...p, shape: 'bars', days }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('#topbar-right [data-test="week-bars"]')).toBeTruthy()
    expect(document.querySelector('#topbar-right [data-test="week-heptagon"]')).toBeNull()
    w.unmount()
  })
})
