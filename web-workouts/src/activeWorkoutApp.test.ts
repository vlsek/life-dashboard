import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 69.2 срез 2: «Начать тренировку» → упражнение → подход → ✓ → «Завершить» пишет сессию + записи (или записи старого формата без таблицы сессий).
const h = vi.hoisted(() => ({
  exercises: [] as Record<string, unknown>[],
  inserted: [] as { table: string; row: Record<string, unknown> }[],
  sessionsTable: true,
  entries: [] as Record<string, unknown>[],
}))

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table === 'workout_sessions' && !h.sessionsTable) return Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Could not find the table in the schema cache' } }).then(res, rej)
          return Promise.resolve({ data: table === 'workout_exercises' ? h.exercises : table === 'workout_entries' ? h.entries : [], error: null }).then(res, rej)
        },
        insert: (row: Record<string, unknown>) => (h.inserted.push({ table, row }), Promise.resolve({ error: null })),
        upsert: () => Promise.resolve({ error: null }),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { useActiveWorkout } from './lib/useActiveWorkout'
import { useRoutines } from './lib/useRoutines'
import { resetSessionProbe } from './lib/sessionProbe'

const ex = { id: 'e1', user_id: 'u1', name: 'Жим лёжа', category: 'upper', tracks_weight: true, unit: 'kg', value_label: null, suggested_scheme: null, created_at: '2026-01-01' }
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises(); await flushPromises()
  return w
}
const q = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-testid="${id}"]`)
async function fillAndFinish(w: ReturnType<typeof mount>) {
  await q(w, 'aw-start').trigger('click')
  await q(w, 'aw-add-exercise').trigger('click')
  await q(w, 'aw-pick-e1').trigger('click')
  const inputs = q(w, 'aw-set-0-0').findAll('input')
  await inputs[0].setValue('60')
  await inputs[1].setValue('8')
  await q(w, 'aw-tick-0-0').trigger('click') // ✓
  await q(w, 'aw-finish').trigger('click')
  await flushPromises(); await flushPromises()
}

beforeEach(() => {
  localStorage.clear(); localStorage.setItem('site_lang', 'ru')
  h.exercises = [ex]; h.entries = []; h.inserted = []; h.sessionsTable = true
  useActiveWorkout().discard()
  resetSessionProbe()
})

describe('активная тренировка', () => {
  it('«Начать» открывает экран с секундомером; пустую тренировку «Завершить» не сохраняет', async () => {
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click')
    expect(q(w, 'active-workout').exists()).toBe(true)
    expect(q(w, 'aw-timer').text()).toMatch(/^\d{2}:\d{2}$/)
    await q(w, 'aw-finish').trigger('click'); await flushPromises()
    expect(h.inserted).toHaveLength(0)
    expect(q(w, 'active-workout').exists()).toBe(true) // остаёмся на экране
    w.unmount()
  })

  it('черновик переживает перезагрузку страницы', async () => {
    let w = await mountApp()
    await q(w, 'aw-start').trigger('click')
    expect(localStorage.getItem('workouts.activeDraft.v1')).toContain('"v":1')
    w.unmount()
    w = await mountApp()
    expect(q(w, 'active-workout').exists()).toBe(true)
    w.unmount()
  })

  it('«Завершить» с таблицей сессий: сначала сессия, потом запись с session_id; черновик очищен', async () => {
    const w = await mountApp()
    await fillAndFinish(w)
    expect(h.inserted.map((x) => x.table)).toEqual(['workout_sessions', 'workout_entries'])
    const [s, e] = h.inserted.map((x) => x.row)
    expect(e).toMatchObject({ exercise_id: 'e1', session_id: s.id, position: 0 })
    expect((e.sets as { reps: number; weight: number; done: boolean }[])[0]).toMatchObject({ reps: 8, weight: 60, done: true })
    expect(q(w, 'active-workout').exists()).toBe(false)
    expect(q(w, 'workout-summary').exists()).toBe(true) // итоги (69.10)
    expect(q(w, 'sm-sets').text()).toContain('1')
    expect(q(w, 'sm-volume').text()).toContain('480')
    expect(localStorage.getItem('workouts.activeDraft.v1')).toBeNull()
    w.unmount()
  })

  it('без таблицы сессий (миграция 113 не применена): только записи старого формата, без session_id', async () => {
    h.sessionsTable = false
    const w = await mountApp()
    await fillAndFinish(w)
    expect(h.inserted.map((x) => x.table)).toEqual(['workout_entries'])
    expect(h.inserted[0].row).not.toHaveProperty('session_id')
    w.unmount()
  })

  it('рекорд: при ✓ выше прошлого лучшего веса — строка «Рекорд веса» и тост; равный вес — без плашки', async () => {
    h.entries = [{ id: 'old', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 8, weight: 60, time: null, duration: null, side: null }], notes: null }]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    const inputs = q(w, 'aw-set-0-0').findAll('input')
    await inputs[0].setValue('60'); await inputs[1].setValue('8')
    await q(w, 'aw-tick-0-0').trigger('click')
    expect(q(w, 'aw-pr-0-0').exists()).toBe(false)
    await inputs[0].setValue('62.5')
    expect(q(w, 'aw-pr-0-0').text()).toContain('Рекорд веса')
    expect(q(w, 'aw-pr-0-0').text()).toContain('62,5')
    w.unmount()
  })

  it('рутина: «В рутину» запоминает упражнения, на странице появляется карточка, «Начать» открывает тренировку с этими упражнениями', async () => {
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    await q(w, 'aw-save-routine').trigger('click')
    await q(w, 'aw-routine-name').setValue('Грудь')
    await q(w, 'aw-routine-ok').trigger('click')
    expect(JSON.parse(localStorage.getItem('workouts.routines.v1')!)[0]).toMatchObject({ name: 'Грудь', items: [{ exercise_id: 'e1' }] })
    w.unmount()
    useActiveWorkout().discard()
    const w2 = await mountApp()
    expect(w2.find('[data-testid="routines"]').text()).toContain('Грудь')
    await w2.find('[data-testid^="routine-start-"]').trigger('click')
    expect(q(w2, 'active-workout').exists()).toBe(true)
    expect(q(w2, 'aw-ex-0').text()).toContain('Жим лёжа')
    w2.unmount()
  })

  it('рутина: «Дублировать» добавляет копию в список', async () => {
    useRoutines().routines.value = [{ id: 'r1', name: 'Грудь', updated_at: '', items: [{ exercise_id: 'e1', target_sets: 3, superset_group: null }] }]
    const w = await mountApp()
    await w.find('[data-testid="routine-dup-r1"]').trigger('click')
    expect(w.findAll('[data-testid^="routine-start-"]')).toHaveLength(2)
    expect(w.find('[data-testid="routines"]').text()).toContain('Грудь (копия)')
    w.unmount()
    useRoutines().routines.value = []
  })

  it('прошлое: тап по подсказке подставляет числа без ✓; «Подставить прошлое» заполняет пустые подходы', async () => {
    h.entries = [{ id: 'old', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 8, weight: 60, time: null, duration: null, side: null }, { reps: 6, weight: 65, time: null, duration: null, side: null }], notes: null }]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    await q(w, 'aw-prev-0-0').trigger('click')
    let inputs = q(w, 'aw-set-0-0').findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('60'); expect((inputs[1].element as HTMLInputElement).value).toBe('8')
    expect(q(w, 'aw-tick-0-0').attributes('aria-pressed')).toBe('false')
    await w.find('[data-testid="aw-ex-0"]').findAll('button').find((b) => b.text() === '+ Подход')!.trigger('click')
    await q(w, 'aw-fill-0').trigger('click')
    inputs = q(w, 'aw-set-0-1').findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('60') // добавленный подход скопировал 60×8; подставка не затирает введённое
    w.unmount()
  })

  it('прошедшая тренировка: дата/время/минуты → тот же экран, «Завершить» пишет сессию source=manual на выбранную дату', async () => {
    const w = await mountApp()
    await q(w, 'aw-past').trigger('click')
    await q(w, 'past-date').setValue('2026-10-20'); await q(w, 'past-time').setValue('18:30'); await q(w, 'past-minutes').setValue('45')
    await q(w, 'past-form').trigger('submit')
    expect(q(w, 'aw-past-badge').text()).toContain('2026-10-20')
    expect(q(w, 'aw-timer').text()).toBe('45:00')
    await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    const inputs = q(w, 'aw-set-0-0').findAll('input'); await inputs[0].setValue('50'); await inputs[1].setValue('5')
    await q(w, 'aw-tick-0-0').trigger('click'); await q(w, 'aw-finish').trigger('click'); await flushPromises(); await flushPromises()
    const [s, e] = h.inserted.map((x) => x.row)
    expect(s).toMatchObject({ source: 'manual', date: '2026-10-20' }); expect(e).toMatchObject({ date: '2026-10-20' })
    expect(Date.parse(s.finished_at as string) - Date.parse(s.started_at as string)).toBe(45 * 60000)
    w.unmount()
  })

  it('«Повторить прошлую»: кнопка только когда есть история; открывает тренировку с упражнениями последнего дня', async () => {
    let w = await mountApp()
    expect(q(w, 'aw-repeat').exists()).toBe(false)
    w.unmount()
    h.entries = [{ id: 'old', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 8, weight: 60, time: null, duration: null, side: null }, { reps: 6, weight: 65, time: null, duration: null, side: null }], notes: null }]
    w = await mountApp()
    await q(w, 'aw-repeat').trigger('click')
    expect(q(w, 'aw-ex-0').text()).toContain('Жим лёжа')
    expect(q(w, 'aw-ex-0').findAll('[data-testid^="aw-set-0-"]')).toHaveLength(2)
    expect(q(w, 'aw-prev-0-1').text()).toContain('65')
    w.unmount()
  })

  it('суперсет: кнопка между упражнениями объединяет и разъединяет; группа сохраняется в записи', async () => {
    h.exercises = [ex, { ...ex, id: 'e2', name: 'Разводка' }]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click')
    for (const id of ['e1', 'e2']) { await q(w, 'aw-add-exercise').trigger('click'); await q(w, `aw-pick-${id}`).trigger('click') }
    expect(q(w, 'aw-ss-0').text()).toContain('Суперсет со следующим')
    await q(w, 'aw-ss-0').trigger('click')
    expect(q(w, 'aw-ex-0').attributes('data-superset')).toBe('1'); expect(q(w, 'aw-ex-1').attributes('data-superset')).toBe('1')
    expect(q(w, 'aw-ss-0').text()).toContain('Разъединить')
    for (const i of [0, 1]) {
      const inputs = q(w, `aw-set-${i}-0`).findAll('input'); await inputs[0].setValue('20'); await inputs[1].setValue('10'); await q(w, `aw-tick-${i}-0`).trigger('click')
    }
    await q(w, 'aw-finish').trigger('click'); await flushPromises(); await flushPromises()
    const entries = h.inserted.filter((x) => x.table === 'workout_entries').map((x) => x.row)
    expect(entries.map((e) => e.superset_group)).toEqual([1, 1])
    w.unmount()
  })

  it('таймер отдыха: после ✓ появляется плашка с остатком; ±15 и «Пропустить» работают; в настройке «выкл» — плашки нет', async () => {
    localStorage.removeItem('workouts.restSeconds.v1')
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    const inputs = q(w, 'aw-set-0-0').findAll('input'); await inputs[0].setValue('50'); await inputs[1].setValue('5')
    expect(q(w, 'rest-timer').exists()).toBe(false)
    await q(w, 'aw-tick-0-0').trigger('click')
    expect(q(w, 'rest-timer').exists()).toBe(true)
    expect(q(w, 'rest-left').text()).toMatch(/^01:(2\d|30)$/) // 90 секунд по умолчанию
    await q(w, 'rest-plus').trigger('click'); expect(q(w, 'rest-left').text()).toMatch(/^01:(4\d|45)$/)
    await q(w, 'rest-skip').trigger('click'); expect(q(w, 'rest-timer').exists()).toBe(false)
    await q(w, 'aw-tick-0-0').trigger('click') // снять ✓ — таймер не запускается
    expect(q(w, 'rest-timer').exists()).toBe(false)
    // выключаем: 90 → 120 → 180 → выкл
    for (let i = 0; i < 3; i++) await q(w, 'aw-rest-setting').trigger('click')
    expect(q(w, 'aw-rest-setting').text()).toContain('выкл')
    await q(w, 'aw-tick-0-0').trigger('click'); expect(q(w, 'rest-timer').exists()).toBe(false)
    w.unmount()
  })

  it('RPE: колонка включается настройкой, значение попадает в подход при сохранении', async () => {
    localStorage.removeItem('workouts.rpe.v1')
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    expect(q(w, 'aw-rpe-0-0').exists()).toBe(false)
    await q(w, 'aw-rpe-setting').trigger('click')
    await q(w, 'aw-rpe-0-0').setValue('8.5')
    const inputs = q(w, 'aw-set-0-0').findAll('input'); await inputs[0].setValue('60'); await inputs[1].setValue('5')
    await q(w, 'aw-tick-0-0').trigger('click'); await q(w, 'aw-finish').trigger('click'); await flushPromises(); await flushPromises()
    const e = h.inserted.find((x) => x.table === 'workout_entries')!.row
    expect((e.sets as { rpe: number }[])[0].rpe).toBe(8.5)
    expect(localStorage.getItem('workouts.rpe.v1')).toBe('1')
    w.unmount()
  })
})

