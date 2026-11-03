import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 69.2 срез 2: «Начать тренировку» → упражнение → подход → ✓ → «Завершить» пишет сессию + записи (или записи старого формата без таблицы сессий).
const h = vi.hoisted(() => ({
  exercises: [] as Record<string, unknown>[],
  inserted: [] as { table: string; row: Record<string, unknown> }[],
  updated: [] as { table: string; row: Record<string, unknown>; match: unknown }[],
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
        update: (row: Record<string, unknown>) => ({ match: (m: unknown) => (h.updated.push({ table, row, match: m }), Promise.resolve({ error: null })) }),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { useActiveWorkout } from './lib/useActiveWorkout'
import { useRoutines } from './lib/useRoutines'
import { useRestTimer } from './lib/useRestTimer'
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
  h.exercises = [ex]; h.entries = []; h.inserted = []; h.updated = []; h.sessionsTable = true
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

  it('рутина: после тренировки с изменённым числом подходов предлагает обновить рутину; «Обновить» меняет шаблон', async () => {
    useRoutines().routines.value = [{ id: 'r1', name: 'Грудь', updated_at: '2026-01-01T00:00:00Z', items: [{ exercise_id: 'e1', target_sets: 1, superset_group: null }] }]
    const w = await mountApp()
    await w.find('[data-testid="routine-start-r1"]').trigger('click')
    const inputs = q(w, 'aw-set-0-0').findAll('input')
    await inputs[0].setValue('60'); await inputs[1].setValue('8')
    await q(w, 'aw-tick-0-0').trigger('click')
    await q(w, 'aw-add-set-0').trigger('click') // 2 подхода вместо 1 по шаблону
    await q(w, 'aw-finish').trigger('click')
    await flushPromises(); await flushPromises()
    expect(w.find('[data-test="confirm-dialog-text"]').text()).toContain('Обновить рутину «Грудь»')
    expect(useRoutines().routines.value[0].items[0].target_sets).toBe(1)
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    await flushPromises()
    expect(useRoutines().routines.value[0].items[0].target_sets).toBe(2)
    w.unmount()
    useRoutines().routines.value = []
  })

  it('прошлое: переключатель «лучший» подставляет подход с самым тяжёлым весом', async () => {
    h.entries = [
      { id: 'o1', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 3, weight: 100, time: null, duration: null, side: null }], notes: null },
      { id: 'o2', user_id: 'u1', exercise_id: 'e1', date: '2026-02-01', sets: [{ reps: 8, weight: 60, time: null, duration: null, side: null }], notes: null },
    ]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    expect(q(w, 'aw-prev-0-0').text()).toContain('60')
    await q(w, 'aw-prev-source').trigger('click')
    expect(q(w, 'aw-prev-0-0').text()).toContain('100')
    expect(localStorage.getItem('workouts.prevSource.v1')).toBe('best')
    w.unmount()
  })

  it('подсказка прогрессии: после 3×10 на 60 предлагает 62,5; настройкой выключается', async () => {
    h.entries = [{ id: 'o1', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [10, 10, 10].map((r) => ({ reps: r, weight: 60, time: null, duration: null, side: null })), notes: null }]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    expect(q(w, 'aw-hint-0').text()).toContain('3×10')
    expect(q(w, 'aw-hint-0').text()).toContain('62.5')
    await q(w, 'aw-hint-setting').trigger('click')
    expect(q(w, 'aw-hint-0').exists()).toBe(false)
    w.unmount()
  })

  it('«Рекорды» у упражнения: окно показывает лучший вес с датой и повторы на весах', async () => {
    h.entries = [
      { id: 'o1', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 5, weight: 100, time: null, duration: null, side: null }], notes: null },
      { id: 'o2', user_id: 'u1', exercise_id: 'e1', date: '2026-02-01', sets: [{ reps: 8, weight: 60, time: null, duration: null, side: null }], notes: null },
    ]
    const w = await mountApp()
    await w.find('[data-testid="exercise-records"]').trigger('click')
    expect(q(w, 'rec-weight').text()).toContain('100')
    expect(q(w, 'rec-weight').text()).toContain('2026-01-01')
    expect(q(w, 'rec-repsat').text()).toContain('× 8')
    await q(w, 'records-close').trigger('click')
    expect(q(w, 'records-modal').exists()).toBe(false)
    w.unmount()
  })

  it('итоги: «Изменить название / заметку» сохраняет их в сессию', async () => {
    const w = await mountApp()
    await fillAndFinish(w)
    expect(q(w, 'workout-summary').exists()).toBe(true)
    await q(w, 'sm-edit-meta').trigger('click')
    await q(w, 'sm-name').setValue('Грудь и спина')
    await q(w, 'sm-notes').setValue('Лёгкий день')
    await q(w, 'sm-save-meta').trigger('click')
    await flushPromises()
    const sid = h.inserted.find((x) => x.table === 'workout_sessions')!.row.id
    expect(h.updated).toEqual([{ table: 'workout_sessions', row: { name: 'Грудь и спина', notes: 'Лёгкий день' }, match: { id: sid } }])
    expect(q(w, 'sm-meta').text()).toContain('Грудь и спина')
    w.unmount()
  })

  it('итоги без таблицы сессий: правки названия нет', async () => {
    h.sessionsTable = false
    const w = await mountApp()
    await fillAndFinish(w)
    expect(q(w, 'workout-summary').exists()).toBe(true)
    expect(q(w, 'sm-edit-meta').exists()).toBe(false)
    w.unmount()
  })

  it('звук отдыха: кнопка включает и запоминает на устройстве', async () => {
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    expect(q(w, 'aw-rest-sound').text()).toContain('Звук')
    await q(w, 'aw-rest-sound').trigger('click')
    expect(localStorage.getItem('workouts.restSound.v1')).toBe('1')
    await q(w, 'aw-rest-sound').trigger('click')
    expect(localStorage.getItem('workouts.restSound.v1')).toBe('0')
    w.unmount()
  })

  it('отдых у упражнения: свой таймер 60 с вместо общих 90; «выкл» — отсчёта нет', async () => {
    const rt = useRestTimer()
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    expect(q(w, 'aw-rest-ex-0').text()).toContain('как у всех')
    await q(w, 'aw-rest-ex-0').trigger('click'); await q(w, 'aw-rest-ex-0').trigger('click') // выкл → 60
    expect(q(w, 'aw-rest-ex-0').text()).toContain('60')
    const inputs = q(w, 'aw-set-0-0').findAll('input')
    await inputs[0].setValue('60'); await inputs[1].setValue('8')
    await q(w, 'aw-tick-0-0').trigger('click'); await flushPromises()
    expect(rt.state.value?.total).toBe(60)
    rt.skip()
    await q(w, 'aw-rest-ex-0').trigger('click'); await q(w, 'aw-rest-ex-0').trigger('click'); await q(w, 'aw-rest-ex-0').trigger('click'); await q(w, 'aw-rest-ex-0').trigger('click') // 90,120,180,как у всех
    expect(q(w, 'aw-rest-ex-0').text()).toContain('как у всех')
    w.unmount()
    rt.byEx.value = {}
  })

  it('заметка к упражнению: пишется в запись; прошлая заметка видна как напоминание', async () => {
    h.entries = [{ id: 'o1', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 5, weight: 50, time: null, duration: null, side: null }], notes: 'сиденье на 4' }]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    expect(q(w, 'aw-prevnote-0').text()).toContain('сиденье на 4')
    await q(w, 'aw-note-btn-0').trigger('click')
    await q(w, 'aw-note-0').setValue('сиденье на 5')
    const inputs = q(w, 'aw-set-0-0').findAll('input')
    await inputs[0].setValue('55'); await inputs[1].setValue('5')
    await q(w, 'aw-tick-0-0').trigger('click')
    await q(w, 'aw-finish').trigger('click')
    await flushPromises(); await flushPromises()
    expect(h.inserted.find((x) => x.table === 'workout_entries')!.row.notes).toBe('сиденье на 5')
    w.unmount()
  })

  it('Enter в поле подхода переходит к следующему полю: вес → повторы → вес следующего подхода; в конце клавиатура убирается', async () => {
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    await q(w, 'aw-add-set-0').trigger('click')
    const inputs = [...document.querySelectorAll<HTMLInputElement>('[data-testid="active-workout"] input[data-nav]')]
    expect(inputs).toHaveLength(4)
    inputs[0].focus()
    for (const k of [1, 2, 3]) {
      await w.findAll('input[data-nav]')[k - 1].trigger('keydown', { key: 'Enter' })
      expect(document.activeElement).toBe(inputs[k])
    }
    await w.findAll('input[data-nav]')[3].trigger('keydown', { key: 'Enter' })
    expect(document.activeElement).not.toBe(inputs[3])
    w.unmount()
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

