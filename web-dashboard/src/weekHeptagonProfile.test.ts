import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в newGoalCopy.test.ts).
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import ProgressRing from './components/ProgressRing.vue'
import ProgressSettingsModal from './components/ProgressSettingsModal.vue'
import { computeWeekDaySegments, getWeekDates, weekDaysAriaLabel, type WeekDaySegment } from './lib/progress'
import { getDayProgressSettings, setDayProgressSettings, type DayProgressSettings } from './lib/progressSettings'

// BACKLOG 17:05, срез 2: профиль Дашборда рисует семиугольник недели по дням. Расчёт и геометрия — КОПИИ из web-header (бандлы независимы);
// сверки падают, если копии разошлись: менять нужно обе стороны вместе (правило копий, docs/HANDOFF.md).
const read = (p: string): string => readFileSync(p, 'utf-8')
function body(src: string, name: string): string {
  const start = src.indexOf(`export function ${name}(`)
  if (start < 0) throw new Error(`нет функции ${name}`)
  const open = src.indexOf('{\n', start)
  const end = src.indexOf('\n}\n', open)
  return src.slice(open, end).replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim()
}

describe('копии расчёта и геометрии недели совпадают с web-header', () => {
  it.each([
    ['lib/progress.ts', 'computeWeekDaySegments'],
    ['lib/progress.ts', 'weekDaysAriaLabel'],
    ['lib/ringPlacement.ts', 'heptagonSegments'],
  ])('%s → %s — тот же код', (file, fn) => {
    expect(body(read('src/' + file), fn)).toBe(body(read('../web-header/src/' + file), fn))
  })
})

const S: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: false, dayPlace: 'avatar', weekPlace: 'profile' }
const dates = getWeekDates(new Date(2026, 9, 7))
const days = computeWeekDaySegments(S, [], {}, dates, dates[2], {
  [dates[0]]: [{ text: 'a', done: true }],
  [dates[1]]: [{ text: 'a', done: true }, { text: 'b', done: false }],
  [dates[2]]: [{ text: 'a', done: false }, { text: 'b', done: true, bonus: true }],
}, [])!
const base = { basePct: 0.5, bonusPct: 0, totalPct: 50, title: 'Неделя: 50%' }

describe('ProgressRing недели: стороны по дням', () => {
  it('7 сторон, заливка только у дней с прогрессом, бонус золотом, подпись для скринридера', () => {
    const w = mount(ProgressRing, { props: { ...base, size: 48, shape: 'heptagon', days } })
    expect(w.find('[data-test="week-track"]').element.tagName.toLowerCase()).toBe('polygon') // цельный контур, как у прежнего кольца (45.3)
    expect(w.findAll('g[data-day]')).toHaveLength(7)
    expect(w.findAll('[data-test="week-seg-fill"]')).toHaveLength(2) // пн и вт; сегодня 0 из 1 базовых
    expect(w.findAll('[data-test="week-seg-bonus"]')).toHaveLength(1)
    expect(w.findAll('[data-state="future"]')).toHaveLength(4)
    expect(w.findAll('[data-test="week-seg-today"]')).toHaveLength(1) // сегодняшняя грань светлее
    expect(w.find('[data-test="hept-track"]').exists()).toBe(false)
    expect(w.attributes('aria-label')).toMatch(/100 %, \w+ 50 %, \w+ 20 %, \w+, \w+, \w+, \w+$/)
  })
  it('без данных по дням — прежний семиугольник с общим процентом; круг — как раньше', () => {
    expect(mount(ProgressRing, { props: { ...base, shape: 'heptagon', days: null } }).find('[data-test="hept-track"]').exists()).toBe(true)
    expect(mount(ProgressRing, { props: { ...base, shape: 'heptagon', days: days.slice(0, 3) } }).find('[data-test="hept-track"]').exists()).toBe(true)
    const circle = mount(ProgressRing, { props: { ...base, days } })
    expect(circle.find('circle').exists()).toBe(true)
    expect(circle.find('[data-test="week-track"]').exists()).toBe(false)
  })
})

describe('настройка «Вид недели» в Дашборде', () => {
  it('в окне: по умолчанию семиугольник, выбор «Прежний (круг)» уходит в save', async () => {
    const w = mount(ProgressSettingsModal, { props: { initial: S } })
    const sel = w.find('[data-test="week-shape"]')
    expect((sel.element as HTMLSelectElement).value).toBe('heptagon')
    await sel.setValue('classic')
    await w.find('button[style*="--accent"]').trigger('click')
    expect((w.emitted('save')![0][0] as DayProgressSettings).weekShape).toBe('classic')
  })
  it('чтение: нет поля → семиугольник; classic сохраняется; мусор → семиугольник', () => {
    localStorage.clear()
    expect(getDayProgressSettings().weekShape).toBe('heptagon')
    localStorage.setItem('day_progress_settings', JSON.stringify({ ...S, weekShape: 'classic' }))
    expect(getDayProgressSettings().weekShape).toBe('classic')
    localStorage.setItem('day_progress_settings', JSON.stringify({ ...S, weekShape: 'wat' }))
    expect(getDayProgressSettings().weekShape).toBe('heptagon')
  })
  it('запись: переданный вид главнее сохранённого, не переданный — сохраняется прежний', () => {
    localStorage.clear()
    localStorage.setItem('day_progress_settings', JSON.stringify({ ...S, weekShape: 'classic' }))
    setDayProgressSettings({ ...S, weekShape: 'heptagon' })
    expect(JSON.parse(localStorage.getItem('day_progress_settings')!).weekShape).toBe('heptagon')
    localStorage.setItem('day_progress_settings', JSON.stringify({ ...S, weekShape: 'classic' }))
    setDayProgressSettings(S)
    expect(JSON.parse(localStorage.getItem('day_progress_settings')!).weekShape).toBe('classic')
  })
})

describe('weekDaysAriaLabel (копия)', () => {
  it('будущие дни — без процента', () => {
    const d: WeekDaySegment[] = days
    expect(weekDaysAriaLabel(d, 'Вс,Пн,Вт,Ср,Чт,Пт,Сб')).toBe('Пн 100 %, Вт 50 %, Ср 20 %, Чт, Пт, Сб, Вс')
  })
})
