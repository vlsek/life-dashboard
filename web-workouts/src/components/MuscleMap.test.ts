import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MuscleMap from './MuscleMap.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

const mk = (id: string, name: string): Exercise =>
  ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: null, suggested_scheme: null, created_at: '' }) as Exercise
const bench = mk('bench', 'Жим лёжа')
const squat = mk('squat', 'Приседания')
const yoga = mk('yoga', 'Йога')
const entry = (exercise_id: string, date: string): WorkoutEntry =>
  ({ id: exercise_id + date, user_id: 'u', exercise_id, date, sets: [{ reps: 10, weight: 50, time: null, duration: null, side: null }], notes: null }) as WorkoutEntry

const TODAY = '2026-09-30'
async function openMap(entries: WorkoutEntry[], exercises: Exercise[]) {
  const w = mount(MuscleMap, { props: { entries, exercises, today: TODAY } })
  await w.find('[data-testid="muscle-map-toggle"]').trigger('click')
  return w
}
const zone = (w: ReturnType<typeof mount>, m: string) => w.find(`[data-muscle="${m}"]`)

describe('MuscleMap', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('по умолчанию свёрнут; раскрытие сохраняется', async () => {
    const w = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY } })
    expect(w.find('[data-testid="muscle-map-body"]').exists()).toBe(false)
    await w.find('[data-testid="muscle-map-toggle"]').trigger('click')
    expect(w.find('[data-testid="muscle-map-body"]').exists()).toBe(true)
    expect(localStorage.getItem('workouts_musclemap_open')).toBe('1')
    const w2 = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY } })
    expect(w2.find('[data-testid="muscle-map-body"]').exists()).toBe(true)
  })

  it('мышцы за последние 4 дня — зелёные, остальные — серые', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-20')], [bench, squat])
    expect(zone(w, 'chest').attributes('data-state')).toBe('done')
    expect(zone(w, 'triceps').attributes('data-state')).toBe('done')
    expect(zone(w, 'quads').attributes('data-state')).toBe('idle') // 10 дней назад
    expect(zone(w, 'calves').attributes('data-state')).toBe('idle')
  })

  it('клик по серой мышце показывает свои упражнения и подсказки; кнопка добавляет запись', async () => {
    const w = await openMap([entry('bench', '2026-09-29')], [bench, squat])
    await zone(w, 'quads').trigger('click')
    const detail = w.find('[data-testid="muscle-detail"]')
    expect(detail.text()).toContain('Квадрицепс')
    expect(detail.text()).toContain('Приседания')
    expect(detail.text()).toContain('Записей пока нет')
    // подсказки не дублируют то, что уже есть у пользователя (приседания)
    const sug = w.find('[data-testid="muscle-suggestions"]').text()
    expect(sug).not.toContain('Приседания')
    expect(sug).toContain('Жим ногами')
    await w.find('[data-testid="muscle-add-entry"]').trigger('click')
    expect(w.emitted('add-entry')?.[0]).toEqual([squat])
  })

  it('если своих упражнений на мышцу нет — говорит об этом, но подсказывает из справочника', async () => {
    const w = await openMap([], [bench])
    await zone(w, 'calves').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').text()).toContain('Ни одно из ваших упражнений')
    expect(w.find('[data-testid="muscle-suggestions"]').text()).toContain('Подъёмы на носки')
  })

  it('повторный клик снимает выбор; клавиша Enter тоже выбирает', async () => {
    const w = await openMap([], [bench])
    await zone(w, 'chest').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').exists()).toBe(true)
    await zone(w, 'chest').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').exists()).toBe(false)
    await zone(w, 'abs').trigger('keydown.enter')
    expect(w.find('[data-testid="muscle-detail"]').exists()).toBe(true)
  })

  it('статистика: чаще всего тренируемые группы (период по умолчанию — 30 дней) и список непривязанных упражнений', async () => {
    const w = await openMap([entry('bench', '2026-09-28'), entry('bench', '2026-09-25'), entry('squat', '2026-09-29')], [bench, squat, yoga])
    const stats = w.find('[data-testid="muscle-stats"]').text()
    expect(stats).toContain('Грудь')
    expect(stats).toContain('2 дн.')
    expect(w.find('[data-testid="muscle-unmapped"]').text()).toContain('Йога')
  })

  it('пустая история — сообщение вместо статистики', async () => {
    const w = await openMap([], [bench])
    expect(w.find('[data-testid="muscle-stats"]').text()).toContain('За выбранный период нет тренировок')
  })

  describe('статистика: период', () => {
    // жим — 2026-09-28 (2 дня назад), 2026-09-10 (20 дней назад), 2026-07-25 (67 дней назад)
    const entries = [entry('bench', '2026-09-28'), entry('bench', '2026-09-10'), entry('bench', '2026-07-25')]
    const daysOf = (w: ReturnType<typeof mount>) => w.find('[data-testid="muscle-stats"]').text()

    it('по умолчанию 30 дней: старая запись (67 дней назад) не считается, кнопка 30 нажата', async () => {
      const w = await openMap(entries, [bench])
      expect(w.find('[data-testid="muscle-period-30"]').attributes('aria-pressed')).toBe('true')
      expect(daysOf(w)).toContain('2 дн.')
    })

    it('7 дней: только запись 2 дня назад; 90 дней: все три', async () => {
      const w = await openMap(entries, [bench])
      await w.find('[data-testid="muscle-period-7"]').trigger('click')
      expect(daysOf(w)).toContain('1 дн.')
      await w.find('[data-testid="muscle-period-90"]').trigger('click')
      expect(daysOf(w)).toContain('3 дн.')
    })

    it('выбор периода запоминается между открытиями', async () => {
      const w = await openMap(entries, [bench])
      await w.find('[data-testid="muscle-period-90"]').trigger('click')
      expect(localStorage.getItem('workouts_musclemap_period')).toBe('90')
      // блок уже помнит, что он раскрыт, — второй раз просто монтируем
      const again = mount(MuscleMap, { props: { entries, exercises: [bench], today: TODAY } })
      expect(again.find('[data-testid="muscle-period-90"]').attributes('aria-pressed')).toBe('true')
    })

    it('мусор в хранилище → период по умолчанию', async () => {
      localStorage.setItem('workouts_musclemap_period', '45')
      const w = await openMap(entries, [bench])
      expect(w.find('[data-testid="muscle-period-30"]').attributes('aria-pressed')).toBe('true')
    })

    it('выводятся все группы за период, а не только шесть', async () => {
      const exs = [bench, squat, mk('pull', 'Подтягивания'), mk('plank', 'Планка'), mk('dip', 'Отжимания на брусьях'), mk('curl', 'Сгибания на бицепс')]
      const w = await openMap(exs.map((e) => entry(e.id, '2026-09-29')), exs)
      const names = w.findAll('[data-testid="muscle-stats"] .w-28')
      expect(names.length).toBeGreaterThan(6)
    })

    it('«не тренировалось» перечисляет остальные группы; при пустой статистике строки нет', async () => {
      const w = await openMap([entry('bench', '2026-09-28')], [bench])
      const line = w.find('[data-testid="muscle-untrained"]').text()
      expect(line).toContain('Не тренировалось за период')
      expect(line).toContain('Ягодицы')
      expect(line).not.toContain('Грудь')
      const empty = await openMap([], [bench])
      expect(empty.find('[data-testid="muscle-untrained"]').exists()).toBe(false)
    })
  })
})

// BACKLOG раздел 30: «по каждой мышце пишется, когда её последний раз тренировали»
describe('MuscleMap: когда тренировали каждую мышцу', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const rowText = (w: ReturnType<typeof mount>, m: string) => w.find(`[data-testid="muscle-last-list"] [data-muscle="${m}"]`).text()

  it('список есть у каждой мышцы: сегодня / вчера / N дн. назад с датой / «ещё не тренировали»', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-30'), entry('bench', '2026-09-20')], [bench, squat])
    expect(rowText(w, 'chest')).toContain('вчера')
    expect(rowText(w, 'chest')).toContain('29.09.2026')
    expect(rowText(w, 'quads')).toContain('сегодня')
    expect(rowText(w, 'calves')).toContain('ещё не тренировали')
    expect(w.findAll('[data-testid="muscle-last-list"] [data-muscle]').length).toBeGreaterThanOrEqual(10)
  })

  it('«N дн. назад» для давних записей', async () => {
    const w = await openMap([entry('bench', '2026-09-20')], [bench])
    expect(rowText(w, 'chest')).toContain('10 дн. назад')
    expect(rowText(w, 'chest')).toContain('20.09.2026')
  })

  it('давно не тренированные — сверху списка, свежие — внизу', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-20')], [bench, squat])
    const order = w.findAll('[data-testid="muscle-last-list"] [data-muscle]').map((r) => r.attributes('data-muscle'))
    expect(order.indexOf('calves')).toBeLessThan(order.indexOf('quads'))
    expect(order.indexOf('quads')).toBeLessThan(order.indexOf('chest'))
  })

  it('в карточке выбранной мышцы — то же человеческое «вчера (дата)»; без записей — «Записей пока нет»', async () => {
    const w = await openMap([entry('bench', '2026-09-29')], [bench])
    await zone(w, 'chest').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').text()).toContain('вчера')
    expect(w.find('[data-testid="muscle-detail"]').text()).toContain('29.09.2026')
    await zone(w, 'calves').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').text()).toContain('Записей пока нет')
  })

  it('английский интерфейс', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = await openMap([entry('bench', '2026-09-29'), entry('bench', '2026-09-20')], [bench])
    expect(rowText(w, 'chest')).toContain('yesterday')
    expect(rowText(w, 'calves')).toContain('not yet')
    expect(w.find('[data-testid="muscle-last-list"]').text()).toContain('When each muscle was last worked')
  })
})
