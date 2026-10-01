import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { celebrationsEnabled, loadShown, saveShown, setCelebrationsEnabled, useStreakCelebration } from './useStreakCelebration'
import StreakMilestoneModal from '../components/StreakMilestoneModal.vue'
import LayoutModal from '../components/LayoutModal.vue'
import type { StreakItem } from './streaks'
import type { Milestone } from './streakMilestones'

const perfect = (streak: number): StreakItem => ({ kind: 'perfect_days', streak, todayCounted: true })

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('celebrations are on by default and the switch is remembered', () => {
    expect(celebrationsEnabled()).toBe(true)
    setCelebrationsEnabled(false)
    expect(celebrationsEnabled()).toBe(false)
    setCelebrationsEnabled(true)
    expect(celebrationsEnabled()).toBe(true)
  })
  it('shown state is stored per user and tolerates garbage', () => {
    expect(loadShown('u1')).toBeNull()
    saveShown('u1', { perfect_days: [5] })
    expect(loadShown('u1')).toEqual({ perfect_days: [5] })
    expect(loadShown('u2')).toBeNull()
    localStorage.setItem('streak_milestones_shown:u3', '{broken')
    expect(loadShown('u3')).toBeNull()
    localStorage.setItem('streak_milestones_shown:u4', '[1,2]')
    expect(loadShown('u4')).toBeNull()
  })
})

describe('useStreakCelebration', () => {
  it('shows a pop-up for a reached threshold once, and not again after reload', async () => {
    saveShown('u1', { perfect_days: [5] })
    const streaks = ref<StreakItem[]>([])
    const c = useStreakCelebration(() => 'u1', streaks)
    streaks.value = [perfect(10)]
    await nextTick()
    expect(c.pending.value).toMatchObject({ key: 'perfect_days', threshold: 10 })
    c.close()
    expect(c.pending.value).toBeNull()
    // «перезагрузка»: новый экземпляр, те же данные
    const again = useStreakCelebration(() => 'u1', ref([perfect(10)]))
    again.evaluate()
    expect(again.pending.value).toBeNull()
  })
  it('waits for the user id and does not evaluate without it', async () => {
    saveShown('u1', {})
    const uid = ref<string | null>(null)
    const streaks = ref<StreakItem[]>([perfect(5)])
    const c = useStreakCelebration(() => uid.value, streaks)
    streaks.value = [perfect(5)]
    await nextTick()
    expect(c.pending.value).toBeNull()
    uid.value = 'u1'
    await nextTick()
    expect(c.pending.value?.threshold).toBe(5)
  })
  it('does not show anything when celebrations are turned off, but remembers what was reached', async () => {
    setCelebrationsEnabled(false)
    saveShown('u1', {})
    const streaks = ref<StreakItem[]>([])
    const c = useStreakCelebration(() => 'u1', streaks)
    streaks.value = [perfect(31)]
    await nextTick()
    expect(c.pending.value).toBeNull()
    setCelebrationsEnabled(true)
    c.evaluate()
    expect(c.pending.value).toBeNull() // старые серии не обрушиваются после включения
    expect(loadShown('u1')?.perfect_days).toEqual([5, 10, 30])
  })
  it('"don\'t show again" turns the setting off and closes the pop-up', async () => {
    saveShown('u1', {})
    const streaks = ref<StreakItem[]>([])
    const c = useStreakCelebration(() => 'u1', streaks)
    streaks.value = [perfect(5)]
    await nextTick()
    expect(c.pending.value).not.toBeNull()
    c.disable()
    expect(c.pending.value).toBeNull()
    expect(celebrationsEnabled()).toBe(false)
  })
  it('does not stack: while a pop-up is open no second one replaces it', async () => {
    saveShown('u1', {})
    const streaks = ref<StreakItem[]>([])
    const c = useStreakCelebration(() => 'u1', streaks)
    streaks.value = [perfect(10)]
    await nextTick()
    const first = c.pending.value
    streaks.value = [perfect(10), { kind: 'note_filled', streak: 5, todayCounted: true }]
    await nextTick()
    expect(c.pending.value).toBe(first)
  })
})

describe('StreakMilestoneModal', () => {
  const ms = (o: Partial<Milestone> = {}): Milestone => ({ key: 'perfect_days', threshold: 30, unit: 'd', kind: 'perfect_days', metricName: null, streak: 30, ...o })
  it('shows the number, the unit, what the streak is for, and a message', () => {
    const w = mount(StreakMilestoneModal, { props: { milestone: ms({ kind: 'metric', key: 'metric:a', metricName: 'Push-ups', threshold: 10 }) } })
    expect(w.find('[data-test="milestone-number"]').text()).toBe('10')
    expect(w.find('[data-test="milestone-unit"]').text().length).toBeGreaterThan(0)
    expect(w.find('[data-test="milestone-label"]').text()).toBe('Push-ups')
    expect(w.find('[data-test="milestone-message"]').text().length).toBeGreaterThan(10)
    expect(w.find('svg.streak-flame').exists()).toBe(true)
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    w.unmount()
  })
  it('emits close from the button and from the backdrop, and disable from the link', async () => {
    const w = mount(StreakMilestoneModal, { props: { milestone: ms() } })
    await w.find('[data-test="milestone-close"]').trigger('click')
    await w.find('.fixed').trigger('click')
    await w.find('[data-test="milestone-disable"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(2)
    expect(w.emitted('disable')).toHaveLength(1)
    w.unmount()
  })
  it('respects prefers-reduced-motion: animations and flash rings are switched off', () => {
    // стили scoped живут в SFC, в happy-dom их не прогнать — проверяем исходник компонента
    const src = readFileSync(resolve(process.cwd(), 'src/components/StreakMilestoneModal.vue'), 'utf-8')
    const block = src.slice(src.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(block).toContain('.celebrate-card')
    expect(block).toContain('.celebrate-flame')
    expect(block).toContain('animation: none')
    expect(block).toMatch(/\.celebrate-ring\s*\{\s*display:\s*none/)
  })
})

describe('LayoutModal celebrations switch', () => {
  it('reflects and changes the stored setting immediately', async () => {
    const w = mount(LayoutModal, { props: { initial: [{ key: 'profile', visible: true }, { key: 'charts', visible: true }, { key: 'daily', visible: true }] as any } })
    const box = w.find('[data-test="celebrate-toggle"]')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    await box.setValue(false)
    expect(celebrationsEnabled()).toBe(false)
    await box.setValue(true)
    expect(celebrationsEnabled()).toBe(true)
    w.unmount()
  })
})
