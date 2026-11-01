import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — чтение исходника соседнего пилота для стража копии (как brandFlame.test.ts)
import { readFileSync } from 'node:fs'
import { DRAFT_KEY, elapsedSec, formatElapsed, onWorkoutsPage, readActive } from './lib/activeWorkoutBadge'
import ActiveWorkoutBadge from './components/ActiveWorkoutBadge.vue'

const draft = (o: object = {}) => JSON.stringify({ v: 1, started_at: new Date(Date.now() - 125000).toISOString(), ...o })

describe('плашка «Идёт тренировка»', () => {
  it('страж копии: ключ и формат те же, что в web-workouts/src/lib/activeWorkout.ts', () => {
    const src = readFileSync('../web-workouts/src/lib/activeWorkout.ts', 'utf-8') as string
    expect(src).toContain(`DRAFT_KEY = '${DRAFT_KEY}'`)
    expect(src).toContain('manual_minutes')
  })
  it('чтение: нет/мусор/чужой формат → null; задним числом — фиксированная длительность', () => {
    const s = (v: string | null) => ({ getItem: () => v })
    expect(readActive(s(null))).toBeNull(); expect(readActive(s('{oops'))).toBeNull(); expect(readActive(s('{"v":2}'))).toBeNull()
    const a = readActive(s(draft({ manual_minutes: 45 })))!
    expect(elapsedSec(a, Date.now())).toBe(2700); expect(formatElapsed(2700)).toBe('45:00'); expect(formatElapsed(3909)).toBe('1:05:09')
  })
  it('страница тренировок определяется по пути', () => {
    expect(onWorkoutsPage('/workouts/')).toBe(true); expect(onWorkoutsPage('/workouts')).toBe(true); expect(onWorkoutsPage('/dashboard/')).toBe(false); expect(onWorkoutsPage('/workouts-x/')).toBe(false)
  })
  describe('компонент', () => {
    beforeEach(() => { localStorage.clear(); localStorage.setItem('site_lang', 'ru') })
    it('нет черновика — нет плашки', () => { expect(mount(ActiveWorkoutBadge).find('[data-test="active-workout-badge"]').exists()).toBe(false) })
    it('есть черновик — ссылка на /workouts/ с временем', () => {
      localStorage.setItem(DRAFT_KEY, draft())
      const w = mount(ActiveWorkoutBadge); const a = w.find('[data-test="active-workout-badge"]')
      expect(a.attributes('href')).toBe('/workouts/'); expect(a.text()).toMatch(/^02:0\d$/); expect(a.attributes('aria-label')).toContain('Идёт тренировка')
      w.unmount()
    })
  })
})
