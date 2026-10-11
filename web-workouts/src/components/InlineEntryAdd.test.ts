import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import InlineEntryAdd from './InlineEntryAdd.vue'
import ExerciseCard from './ExerciseCard.vue'
import type { Exercise } from '../lib/types'

const mk = (o: Partial<Exercise>): Exercise => ({ id: 'ex', user_id: 'u', name: 'Отжимания', category: null, tracks_weight: false, tracks_duration: false, bilateral: false, value_label: null, unit: null, suggested_scheme: null, created_at: '', ...o }) as Exercise
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('InlineEntryAdd: встроенная строка «Добавить запись»', () => {
  it('у обычного упражнения только повторы; у «с весом» ещё вес; у «с длительностью» ещё длительность', () => {
    const a = mount(InlineEntryAdd, { props: { exercise: mk({}) } })
    expect(a.find('[data-testid="inline-reps"]').exists()).toBe(true)
    expect(a.find('[data-testid="inline-weight"]').exists()).toBe(false)
    expect(a.find('[data-testid="inline-duration"]').exists()).toBe(false)
    const b = mount(InlineEntryAdd, { props: { exercise: mk({ tracks_weight: true }) } })
    expect(b.find('[data-testid="inline-weight"]').exists()).toBe(true)
    const c = mount(InlineEntryAdd, { props: { exercise: mk({ tracks_duration: true }) } })
    expect(c.find('[data-testid="inline-duration"]').exists()).toBe(true)
  })

  it('«Добавить» отдаёт запись на сегодня с одним подходом и временем; повторы пусты — ничего не отдаёт', async () => {
    const w = mount(InlineEntryAdd, { props: { exercise: mk({ tracks_weight: true }) } })
    await w.find('[data-testid="inline-save"]').trigger('submit')
    expect(w.emitted('save')).toBeUndefined()
    await w.find('[data-testid="inline-reps"]').setValue('8')
    await w.find('[data-testid="inline-weight"]').setValue('60')
    await w.find('form').trigger('submit')
    const [res] = w.emitted('save')![0] as [{ date: string; sets: { reps: number; weight: number; time: string | null }[]; notes: string | null }]
    expect(res.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(res.sets).toHaveLength(1)
    expect(res.sets[0].reps).toBe(8)
    expect(res.sets[0].weight).toBe(60)
    expect(res.sets[0].time).toMatch(/^\d{2}:\d{2}$/)
    expect(res.notes).toBeNull()
  })

  it('пока запись сохраняется, кнопка отключена (двойной тап не создаст две записи); и успех, и ошибка сохраняют значения (следующий подход обычно такой же)', async () => {
    const w = mount(InlineEntryAdd, { props: { exercise: mk({}) } })
    await w.find('[data-testid="inline-reps"]').setValue('12')
    await w.find('form').trigger('submit')
    expect((w.find('[data-testid="inline-save"]').element as HTMLButtonElement).disabled).toBe(true)
    await w.find('form').trigger('submit')
    expect(w.emitted('save')).toHaveLength(1)
    const done = (w.emitted('save')![0] as unknown[])[1] as (ok: boolean) => void
    done(false)
    await w.vm.$nextTick()
    expect((w.find('[data-testid="inline-save"]').element as HTMLButtonElement).disabled).toBe(false)
    expect((w.find('[data-testid="inline-reps"]').element as HTMLInputElement).value).toBe('12')
    await w.find('form').trigger('submit')
    ;((w.emitted('save')![1] as unknown[])[1] as (ok: boolean) => void)(true)
    await w.vm.$nextTick()
    expect((w.find('[data-testid="inline-reps"]').element as HTMLInputElement).value).toBe('12')
    expect((w.find('[data-testid="inline-save"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('«+ подход»: пока сегодня подходов нет — «Добавить» без счётчика; с подходами — «+ подход» и «Сегодня: N подх.»', async () => {
    const a = mount(InlineEntryAdd, { props: { exercise: mk({}) } })
    expect(a.find('[data-testid="inline-save"]').text()).toBe('Добавить')
    expect(a.find('[data-testid="inline-today"]').exists()).toBe(false)
    const b = mount(InlineEntryAdd, { props: { exercise: mk({}), todaySets: 3 } })
    expect(b.find('[data-testid="inline-save"]').text()).toBe('+ подход')
    expect(b.find('[data-testid="inline-today"]').text()).toBe('Сегодня: 3 подх.')
    await b.setProps({ todaySets: 4 })
    expect(b.find('[data-testid="inline-today"]').text()).toBe('Сегодня: 4 подх.')
  })

  it('«Подробно…» и «✕» — отдельные события', async () => {
    const w = mount(InlineEntryAdd, { props: { exercise: mk({}) } })
    await w.find('[data-testid="inline-detail"]').trigger('click')
    await w.find('[data-testid="inline-cancel"]').trigger('click')
    expect(w.emitted('detail')).toHaveLength(1)
    expect(w.emitted('cancel')).toHaveLength(1)
  })
})

describe('ExerciseCard: «Добавить запись» без окна', () => {
  const card = (ex: Exercise) => mount(ExerciseCard, { props: { exercise: ex, entries: [] } })

  it('у обычного упражнения клик раскрывает строку, а не окно (addEntry не вызывается); повторный клик сворачивает', async () => {
    const w = card(mk({}))
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
    await w.find('[data-testid="exercise-add-entry"]').trigger('click')
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    expect(w.find('[data-testid="exercise-add-entry"]').attributes('aria-expanded')).toBe('true')
    expect(w.emitted('addEntry')).toBeUndefined()
    await w.find('[data-testid="exercise-add-entry"]').trigger('click')
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
  })

  it('у упражнения с Л/П сразу окно (addEntry), строки нет', async () => {
    const w = card(mk({ bilateral: true }))
    await w.find('[data-testid="exercise-add-entry"]').trigger('click')
    expect(w.emitted('addEntry')).toHaveLength(1)
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
  })

  it('«Подробно…» закрывает строку и просит окно; успешное сохранение отдаёт quickAddEntry, а строка остаётся открытой для следующего подхода', async () => {
    const w = card(mk({}))
    await w.find('[data-testid="exercise-add-entry"]').trigger('click')
    await w.find('[data-testid="inline-detail"]').trigger('click')
    expect(w.emitted('addEntry')).toHaveLength(1)
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
    await w.find('[data-testid="exercise-add-entry"]').trigger('click')
    await w.find('[data-testid="inline-reps"]').setValue('15')
    await w.find('form').trigger('submit')
    const args = w.emitted('quickAddEntry')![0] as unknown[]
    expect((args[0] as { sets: { reps: number }[] }).sets[0].reps).toBe(15)
    ;(args[1] as (ok: boolean) => void)(true)
    await w.vm.$nextTick()
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    // закрывается явно: ✕ или повторный клик по кнопке «Добавить запись»
    await w.find('[data-testid="inline-cancel"]').trigger('click')
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
  })

  it('счётчик «Сегодня: N» считается по записям упражнения за сегодня', async () => {
    const today = new Date()
    const iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    const ex = mk({})
    const entry = { id: 'e1', user_id: 'u', exercise_id: ex.id, date: iso, notes: null, sets: [{ reps: 10, weight: null, time: null, duration: null, side: null }, { reps: 9, weight: null, time: null, duration: null, side: null }] }
    const w = mount(ExerciseCard, { props: { exercise: ex, entries: [entry] as never } })
    await w.find('[data-testid="exercise-add-entry"]').trigger('click')
    expect(w.find('[data-testid="inline-today"]').text()).toBe('Сегодня: 2 подх.')
    expect(w.find('[data-testid="inline-save"]').text()).toBe('+ подход')
  })

  it('неудачное сохранение оставляет строку открытой с введёнными значениями', async () => {
    const w = card(mk({}))
    await w.find('[data-testid="exercise-add-entry"]').trigger('click')
    await w.find('[data-testid="inline-reps"]').setValue('15')
    await w.find('form').trigger('submit')
    ;((w.emitted('quickAddEntry')![0] as unknown[])[1] as (ok: boolean) => void)(false)
    await w.vm.$nextTick()
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    expect((w.find('[data-testid="inline-reps"]').element as HTMLInputElement).value).toBe('15')
  })
})
