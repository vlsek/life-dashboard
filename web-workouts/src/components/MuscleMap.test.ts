import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MuscleMap from './MuscleMap.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

const mk = (id: string, name: string): Exercise =>
  ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: null, suggested_scheme: null, created_at: '' }) as Exercise
const bench = mk('bench', 'Жим лёжа')
const squat = mk('squat', 'Приседания')
const yoga = mk('yoga', 'Йога')
const row = mk('row', 'Тяга штанги в наклоне')
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
  it('голова зелёная, когда учёба была за последние 4 дня', async () => {
    const w = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY, studyRecent: true } })
    await w.find('[data-testid="muscle-map-toggle"]').trigger('click')
    const head = w.find('[data-testid="muscle-head"]')
    expect(head.attributes('fill')).toBe('var(--success)')
    expect(w.find('[data-testid="muscle-head-study"]').exists()).toBe(true)
  })

  it('голова нейтральная без недавней учёбы', async () => {
    const w = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY, studyRecent: false } })
    await w.find('[data-testid="muscle-map-toggle"]').trigger('click')
    expect(w.find('[data-testid="muscle-head"]').attributes('fill')).toBe('none')
    expect(w.find('[data-testid="muscle-head-study"]').exists()).toBe(false)
  })


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
    // BACKLOG 44.5ж: кнопка раскрывает встроенную строку; окно — только по «Подробно…»
    await w.find('[data-testid="muscle-add-entry"]').trigger('click')
    expect(w.emitted('add-entry')).toBeUndefined()
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    await w.find('[data-testid="inline-detail"]').trigger('click')
    expect(w.emitted('add-entry')?.[0]).toEqual([squat])
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
  })

  it('если своих упражнений на мышцу нет — говорит об этом, но подсказывает из справочника', async () => {
    const w = await openMap([], [bench])
    await zone(w, 'calves').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').text()).toContain('Ни одно из твоих упражнений')
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

    it('рамки кнопок периода — акцент темы, а не var(--border) (BACKLOG 48.8)', async () => {
      const w = await openMap(entries, [bench])
      for (const p of [7, 30, 90]) expect(w.find(`[data-testid="muscle-period-${p}"]`).attributes('style')).toContain('border-color: var(--accent)')
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
    // BACKLOG 44.5г: мышцы без записей — не строками, а свёрнутой строкой чипов под заголовком «Ещё не тренировали (N)»
    expect(w.find('[data-testid="muscle-never-toggle"]').text()).toContain('Ещё не тренировали')
    expect(w.find('[data-testid="muscle-never-list"] [data-muscle="calves"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="muscle-last-list"] [data-muscle]').length).toBeGreaterThanOrEqual(10)
  })

  it('«N дн. назад» для давних записей', async () => {
    const w = await openMap([entry('bench', '2026-09-20')], [bench])
    expect(rowText(w, 'chest')).toContain('10 дн. назад')
    expect(rowText(w, 'chest')).toContain('20.09.2026')
  })

  it('группы: давно не тренированные — сверху, затем свежие, «ещё не тренировали» — в конце', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-20')], [bench, squat])
    const order = w.findAll('[data-testid="muscle-last-list"] [data-muscle]').map((r) => r.attributes('data-muscle'))
    expect(order.indexOf('quads')).toBeLessThan(order.indexOf('chest')) // quads — 10 дн. назад («пора»), chest — вчера («свежие»)
    expect(order.indexOf('chest')).toBeLessThan(order.indexOf('calves')) // calves — ни разу
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
    expect(w.find('[data-testid="muscle-never-toggle"]').text()).toContain('Not trained yet')
    expect(w.find('[data-testid="muscle-last-list"]').text()).toContain('When each muscle was last worked')
  })
})

// BACKLOG 44.5г: группы по свежести, полоска 14 дней, история и нагрузка по выбранной мышце
describe('MuscleMap: аккуратный список «когда тренировали»', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const bucketOfMuscle = (w: ReturnType<typeof mount>, m: string) => w.find(`[data-testid="muscle-last-list"] [data-muscle="${m}"]`).element.closest('[data-bucket]')?.getAttribute('data-bucket')

  it('мышцы разложены по группам: свежие / на этой неделе / давно / ещё не тренировали', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-26'), entry('row', '2026-09-10')], [bench, squat, row])
    expect(bucketOfMuscle(w, 'chest')).toBe('fresh')
    expect(bucketOfMuscle(w, 'quads')).toBe('recent')
    expect(bucketOfMuscle(w, 'calves')).toBe('never')
    expect(w.findAll('[data-testid="muscle-bucket-title"]').map((x) => x.text())).toEqual(expect.arrayContaining(['Свежие (сегодня или вчера)', 'На этой неделе']))
  })

  it('«ещё не тренировали» свёрнуто по умолчанию и открывается кнопкой', async () => {
    const w = await openMap([entry('bench', '2026-09-29')], [bench])
    const list = () => w.find('[data-testid="muscle-never-list"]').element as HTMLElement
    expect(list().style.display).toBe('none')
    expect(w.find('[data-testid="muscle-never-toggle"]').attributes('aria-expanded')).toBe('false')
    await w.find('[data-testid="muscle-never-toggle"]').trigger('click')
    expect(list().style.display).not.toBe('none')
    expect(w.find('[data-testid="muscle-never-toggle"]').attributes('aria-expanded')).toBe('true')
  })

  it('у мышцы с записями — полоска из 14 дней; последний элемент (сегодня) отмечен, если тренировали сегодня', async () => {
    const w = await openMap([entry('bench', '2026-09-30'), entry('bench', '2026-09-28')], [bench])
    const strip = w.find('[data-testid="muscle-last-list"] [data-muscle="chest"] [data-testid="muscle-strip"]')
    const cells = strip.findAll('[data-on]')
    expect(cells).toHaveLength(14)
    expect(cells[13].attributes('data-on')).toBe('true')
    expect(cells[11].attributes('data-on')).toBe('true')
    expect(cells[12].attributes('data-on')).toBe('false')
    expect(strip.attributes('aria-label')).toBe('В работе 2 из последних 14 дней')
  })

  it('в панели мышцы — нагрузка за 7 и 30 дней и последние тренировки (5 + «Показать все»)', async () => {
    const dates = ['2026-09-29', '2026-09-27', '2026-09-25', '2026-09-23', '2026-09-21', '2026-09-19', '2026-09-17']
    const w = await openMap(dates.map((d) => entry('bench', d)), [bench])
    await zone(w, 'chest').trigger('click')
    const vol = w.find('[data-testid="muscle-volume"]')
    expect(vol.find('[data-window="7"]').text()).toContain('тренировок: 3') // 29, 27, 25 — окно 7 дней включает сегодня (с 24.09)
    expect(vol.find('[data-window="7"]').text()).toContain('подходов: 3')
    expect(vol.find('[data-window="30"]').text()).toContain('тренировок: 7')
    expect(w.findAll('[data-testid="muscle-session"]')).toHaveLength(5)
    await w.find('[data-testid="muscle-sessions-more"]').trigger('click')
    expect(w.findAll('[data-testid="muscle-session"]')).toHaveLength(7)
    expect(w.find('[data-testid="muscle-sessions-more"]').text()).toBe('Свернуть')
  })

  it('у мышцы без записей истории и нагрузки нет, «Показать все» не появляется при ≤5 днях; смена мышцы сворачивает список', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-28')], [bench, squat])
    await zone(w, 'calves').trigger('click')
    expect(w.find('[data-testid="muscle-volume"]').exists()).toBe(false)
    expect(w.find('[data-testid="muscle-sessions"]').exists()).toBe(false)
    await zone(w, 'chest').trigger('click')
    expect(w.findAll('[data-testid="muscle-session"]')).toHaveLength(1)
    expect(w.find('[data-testid="muscle-sessions-more"]').exists()).toBe(false)
  })
})

// BACKLOG 44.5ж, срез 2: «Добавить запись» с карты мышц — встроенная строка под упражнением
describe('MuscleMap: встроенное добавление записи', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const lunge = mk('lunge', 'Выпады')

  it('строка раскрывается только под нажатым упражнением; повторный клик и смена мышцы закрывают её', async () => {
    const w = await openMap([], [squat, lunge])
    await zone(w, 'quads').trigger('click')
    const btns = w.findAll('[data-testid="muscle-add-entry"]')
    expect(btns.length).toBeGreaterThanOrEqual(2)
    await btns[0].trigger('click')
    expect(w.findAll('[data-testid="inline-entry"]')).toHaveLength(1)
    await btns[1].trigger('click')
    expect(w.findAll('[data-testid="inline-entry"]')).toHaveLength(1) // одна строка на панель: открыта другая
    await w.findAll('[data-testid="muscle-add-entry"]')[1].trigger('click')
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
    await w.findAll('[data-testid="muscle-add-entry"]')[0].trigger('click')
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    // смена мышцы закрывает строку: при возвращении на ту же мышцу старая строка не «всплывает» сама
    await zone(w, 'chest').trigger('click')
    await zone(w, 'quads').trigger('click')
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
  })

  it('сохранение отдаёт quick-add-entry с упражнением и записью; строка остаётся открытой со значениями и после успеха, и после ошибки', async () => {
    const w = await openMap([], [squat])
    await zone(w, 'quads').trigger('click')
    await w.find('[data-testid="muscle-add-entry"]').trigger('click')
    await w.find('[data-testid="inline-reps"]').setValue('12')
    await w.find('form').trigger('submit')
    const args = w.emitted('quick-add-entry')![0] as unknown[]
    expect(args[0]).toEqual(squat)
    expect((args[1] as { sets: { reps: number }[] }).sets[0].reps).toBe(12)
    ;(args[2] as (ok: boolean) => void)(false)
    await w.vm.$nextTick()
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    expect((w.find('[data-testid="inline-reps"]').element as HTMLInputElement).value).toBe('12')
    await w.find('form').trigger('submit')
    ;((w.emitted('quick-add-entry')![1] as unknown[])[2] as (ok: boolean) => void)(true)
    await w.vm.$nextTick()
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true) // «+ подход»: строка не закрывается
    expect((w.find('[data-testid="inline-reps"]').element as HTMLInputElement).value).toBe('12')
  })

  it('строка показывает «Сегодня: N подх.» и подпись «+ подход», если за сегодня уже есть запись; без неё — «Добавить»', async () => {
    const w = await openMap([entry('squat', TODAY)], [squat])
    await zone(w, 'quads').trigger('click')
    await w.find('[data-testid="muscle-add-entry"]').trigger('click')
    expect(w.find('[data-testid="inline-today"]').text()).toBe('Сегодня: 1 подх.')
    expect(w.find('[data-testid="inline-save"]').text()).toBe('+ подход')
    w.unmount()
    localStorage.clear() // блок карты помнит «открыт» — второй показ должен снова раскрываться кликом, а не закрываться
    localStorage.setItem('site_lang', 'ru')
    const w2 = await openMap([entry('squat', '2026-09-20')], [squat])
    await zone(w2, 'quads').trigger('click')
    await w2.find('[data-testid="muscle-add-entry"]').trigger('click')
    expect(w2.find('[data-testid="inline-today"]').exists()).toBe(false)
    expect(w2.find('[data-testid="inline-save"]').text()).toBe('Добавить')
  })

  it('у упражнения с Л/П сразу окно (add-entry), строки нет', async () => {
    const side = { ...squat, id: 'sq-lr', bilateral: true } as Exercise
    const w = await openMap([], [side])
    await zone(w, 'quads').trigger('click')
    const btn = w.find('[data-testid="muscle-add-entry"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(w.emitted('add-entry')).toHaveLength(1)
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(false)
  })
})

// BACKLOG 44.5г, срез 2: клик по строке списка открывает панель мышцы; график нагрузки по неделям
describe('MuscleMap: клик по строке списка и график по неделям', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const row = (w: ReturnType<typeof mount>, m: string) => w.find(`[data-testid="muscle-row"][data-muscle="${m}"]`)
  const detail = (w: ReturnType<typeof mount>) => w.find('[data-testid="muscle-detail"]')

  it('клик по строке открывает панель именно этой мышцы; повторный клик её не закрывает; другая строка переключает', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-20')], [bench, squat])
    expect(detail(w).exists()).toBe(false)
    await row(w, 'chest').trigger('click')
    expect(detail(w).exists()).toBe(true)
    expect(detail(w).text()).toContain('Грудь')
    expect(row(w, 'chest').attributes('aria-pressed')).toBe('true')
    await row(w, 'chest').trigger('click')
    expect(detail(w).exists()).toBe(true) // пришли из списка — не закрываем
    await row(w, 'quads').trigger('click')
    expect(detail(w).text()).toContain('Квадрицепс')
    expect(row(w, 'chest').attributes('aria-pressed')).toBe('false')
    expect(row(w, 'quads').attributes('aria-pressed')).toBe('true')
  })

  it('строка доступна с клавиатуры: role=button, tabindex, Enter и Пробел открывают панель', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-20')], [bench, squat])
    expect(row(w, 'chest').attributes('role')).toBe('button')
    expect(row(w, 'chest').attributes('tabindex')).toBe('0')
    await row(w, 'chest').trigger('keydown', { key: 'Enter' })
    expect(detail(w).text()).toContain('Грудь')
    await row(w, 'quads').trigger('keydown', { key: ' ' })
    expect(detail(w).text()).toContain('Квадрицепс')
  })

  it('чип «ещё не тренировали» — кнопка: открывает панель мышцы без записей (с подсказками «что можно делать»)', async () => {
    const w = await openMap([entry('bench', '2026-09-29')], [bench])
    await w.find('[data-testid="muscle-never-toggle"]').trigger('click')
    const chip = w.find('[data-testid="muscle-chip"][data-muscle="calves"]')
    expect(chip.element.tagName).toBe('BUTTON')
    await chip.trigger('click')
    expect(detail(w).text()).toContain('Икры')
    expect(chip.attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-testid="muscle-weeks"]').exists()).toBe(false) // записей нет — графика нет
  })

  it('график по неделям: 8 столбиков от старой к новой, подходы по окнам, текущая неделя отмечена, сводка для скринридера', async () => {
    const w = await openMap([entry('bench', '2026-09-30'), entry('bench', '2026-09-29'), entry('bench', '2026-09-20'), entry('bench', '2026-08-10')], [bench])
    await row(w, 'chest').trigger('click')
    const bars = w.findAll('[data-testid="muscle-week"]')
    expect(bars).toHaveLength(8)
    const sets = bars.map((b) => Number(b.attributes('data-sets')))
    expect(sets[7]).toBe(2) // 24.09 – 30.09: 30.09 и 29.09
    expect(sets[6]).toBe(1) // 17.09 – 23.09: 20.09
    expect(sets.slice(0, 6).reduce((a, b) => a + b, 0)).toBe(1) // 10.08 попадает в окно 6 недель назад (10.08 – 16.08)
    expect(bars[7].attributes('data-current')).toBe('true')
    expect(bars[6].attributes('data-current')).toBe('false')
    expect(w.find('[data-testid="muscle-weeks"]').attributes('aria-label')).toBe('Подходов по неделям, от старой к новой: ' + sets.join(', '))
  })

  it('самый высокий столбик занимает всю высоту, пустые недели — тонкая полоска', async () => {
    const w = await openMap([entry('bench', '2026-09-30'), entry('bench', '2026-09-29'), entry('bench', '2026-09-20')], [bench])
    await row(w, 'chest').trigger('click')
    const bars = w.findAll('[data-testid="muscle-week"]')
    const h = (i: number) => (bars[i].find('div').element as HTMLElement).style.height
    expect(h(7)).toBe('100%')
    expect(h(6)).toBe('50%')
    expect(h(0)).toBe('2px')
  })
})


describe('MuscleMap: visual packs (BACKLOG 70.2)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('all three packs switch the SVG presentation and expose the active mode', async () => {
    const w = await openMap([], [bench])
    const svg = () => w.find('svg[data-visual-style]')
    expect(svg().attributes('data-visual-style')).toBe('anatomy')
    expect(svg().classes()).toContain('muscle-map-svg--anatomy')

    await w.find('[data-style="atlas"]').trigger('click')
    expect(svg().attributes('data-visual-style')).toBe('atlas')
    expect(svg().classes()).toContain('muscle-map-svg--atlas')
    expect(w.find('[data-style="atlas"]').attributes('aria-pressed')).toBe('true')

    await w.find('[data-style="tech"]').trigger('click')
    expect(svg().attributes('data-visual-style')).toBe('tech')
    expect(svg().classes()).toContain('muscle-map-svg--tech')
    expect(svg().find('.muscle-tech-overlay').exists()).toBe(true)
  })

  it('persists the selected pack and falls back safely for an unknown stored value', async () => {
    const w = await openMap([], [bench])
    await w.find('[data-style="tech"]').trigger('click')
    expect(localStorage.getItem('workouts_musclemap_visual_style')).toBe('tech')

    const again = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY } })
    expect(again.find('svg[data-visual-style]').attributes('data-visual-style')).toBe('tech')

    localStorage.setItem('workouts_musclemap_visual_style', 'ultraviolet')
    const fallback = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY } })
    expect(fallback.find('svg[data-visual-style]').attributes('data-visual-style')).toBe('anatomy')
  })

  it('uses line pattern as well as color to distinguish trained and idle muscles', async () => {
    const w = await openMap([entry('bench', '2026-09-29')], [bench])
    const idle = w.find('[data-muscle="quads"]')
    const done = w.find('[data-muscle="chest"]')
    expect(idle.attributes('data-state')).toBe('idle')
    expect(idle.find('path').attributes('style')).toContain('stroke-dasharray: 1.2 0.8')
    expect(done.attributes('data-state')).toBe('done')
    expect(done.find('path').attributes('style')).toContain('stroke-dasharray: none')
    expect(w.find('[data-testid="muscle-map-legend"] .muscle-legend-mark--done').classes()).toContain('muscle-legend-mark--done')
    expect(w.find('[data-testid="muscle-map-legend"] .muscle-legend-mark--idle').classes()).toContain('muscle-legend-mark--idle')
  })

  it('keeps keyboard activation on muscle targets available in every pack', async () => {
    const w = await openMap([], [bench])
    for (const style of ['anatomy', 'atlas', 'tech']) {
      await w.find(`[data-style="${style}"]`).trigger('click')
      const target = w.find('[data-muscle="chest"]')
      expect(target.attributes('tabindex')).toBe('0')
      expect(target.attributes('role')).toBe('button')
      expect(target.attributes('aria-pressed')).toBe('false')
      await target.trigger('keydown.enter')
      expect(target.attributes('aria-pressed')).toBe('true')
      expect(target.attributes('data-selected')).toBe('true')
      expect(w.find('[data-testid="muscle-detail"]').exists()).toBe(true)
      await target.trigger('keydown.enter')
      expect(target.attributes('aria-pressed')).toBe('false')
    }
  })

  it('keeps both body projections in sync and shows the technical overlay only in Tech mode', async () => {
    const w = await openMap([], [bench])
    const projections = () => w.findAll('svg[data-visual-style]')
    expect(projections()).toHaveLength(2)
    expect(projections().map((svg) => svg.attributes('data-visual-style'))).toEqual(['anatomy', 'anatomy'])
    expect(w.findAll('.muscle-tech-overlay')).toHaveLength(0)

    await w.find('[data-style="atlas"]').trigger('click')
    expect(projections().map((svg) => svg.attributes('data-visual-style'))).toEqual(['atlas', 'atlas'])
    expect(w.findAll('.muscle-tech-overlay')).toHaveLength(0)

    await w.find('[data-style="tech"]').trigger('click')
    expect(projections().map((svg) => svg.attributes('data-visual-style'))).toEqual(['tech', 'tech'])
    expect(w.findAll('.muscle-tech-overlay')).toHaveLength(2)

    await w.find('[data-style="anatomy"]').trigger('click')
    expect(projections().map((svg) => svg.attributes('data-visual-style'))).toEqual(['anatomy', 'anatomy'])
    expect(w.findAll('.muscle-tech-overlay')).toHaveLength(0)
  })
})
