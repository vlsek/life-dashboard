import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MUSCLE_OVERRIDES_KEY, getMuscleOverride, musclesForExercise, renameMuscleOverride, setMuscleOverride } from './muscles'
import { lastTrainedByMuscle, unmappedExercises } from './muscleStats'

// BACKLOG 22 «12:33 — упражнение: дополнительно отметить группы мышц из списка для схемы»
describe('своя привязка упражнения к мышцам', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('упражнение вне справочника без привязки — мышц нет; со своей — они', () => {
    expect(musclesForExercise('Wall angels')).toEqual([])
    setMuscleOverride('Wall angels', ['shoulders', 'back'])
    expect(musclesForExercise('Wall angels')).toEqual(['shoulders', 'back'])
  })

  it('название сопоставляется без учёта регистра, лишних пробелов и «ё»', () => {
    setMuscleOverride('Тяга  Лёжа', ['back'])
    expect(getMuscleOverride('  тяга лежа ')).toEqual(['back'])
  })

  it('своя привязка перекрывает автоматическую; сброс возвращает автоматическую', () => {
    expect(musclesForExercise('Отжимания')).toEqual(['chest', 'triceps', 'shoulders'])
    setMuscleOverride('Отжимания', ['abs'])
    expect(musclesForExercise('Отжимания')).toEqual(['abs'])
    setMuscleOverride('Отжимания', [])
    expect(musclesForExercise('Отжимания')).toEqual(['chest', 'triceps', 'shoulders'])
  })

  it('повторы убираются, чужие id отбрасываются, пустое не хранится', () => {
    setMuscleOverride('X', ['abs', 'abs', 'wings' as never, 'back'])
    expect(getMuscleOverride('X')).toEqual(['abs', 'back'])
    setMuscleOverride('X', null)
    expect(getMuscleOverride('X')).toBeNull()
    expect(localStorage.getItem(MUSCLE_OVERRIDES_KEY)).toBeNull() // последняя запись удалена — ключа в хранилище нет
  })

  it('битые данные в хранилище не ломают: JSON, массив вместо объекта, неизвестные группы', () => {
    localStorage.setItem(MUSCLE_OVERRIDES_KEY, '{oops')
    expect(musclesForExercise('Wall angels')).toEqual([])
    localStorage.setItem(MUSCLE_OVERRIDES_KEY, '[1,2]')
    expect(musclesForExercise('Wall angels')).toEqual([])
    localStorage.setItem(MUSCLE_OVERRIDES_KEY, JSON.stringify({ 'wall angels': ['wings'], ok: ['abs'] }))
    expect(getMuscleOverride('wall angels')).toBeNull() // остались только неизвестные группы
    expect(getMuscleOverride('ok')).toEqual(['abs'])
  })

  it('переименование переносит привязку; повтор и отсутствие — без эффекта', () => {
    setMuscleOverride('Старое', ['glutes'])
    renameMuscleOverride('Старое', 'Новое')
    expect(getMuscleOverride('Старое')).toBeNull()
    expect(getMuscleOverride('Новое')).toEqual(['glutes'])
    renameMuscleOverride('Новое', 'новое ') // то же название после нормализации
    expect(getMuscleOverride('Новое')).toEqual(['glutes'])
    renameMuscleOverride('Нет такого', 'Другое')
    expect(getMuscleOverride('Другое')).toBeNull()
  })

  it('недоступное хранилище: чтение — как будто привязки нет, запись не бросает', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    })
    expect(musclesForExercise('Отжимания')).toEqual(['chest', 'triceps', 'shoulders'])
    expect(() => setMuscleOverride('X', ['abs'])).not.toThrow()
  })

  it('карта мышц и «не привязанные» учитывают свою привязку', () => {
    const ex = [{ id: 'e1', name: 'Wall angels' }]
    const entries = [{ exercise_id: 'e1', date: '2026-10-03', sets: [{ reps: 10 }] }] as never
    expect(unmappedExercises(ex as never)).toHaveLength(1)
    expect(lastTrainedByMuscle(entries, ex, '2026-10-03')).toEqual({})
    setMuscleOverride('Wall angels', ['shoulders'])
    expect(unmappedExercises(ex as never)).toHaveLength(0)
    expect(lastTrainedByMuscle(entries, ex, '2026-10-03')).toEqual({ shoulders: '2026-10-03' })
  })
})
