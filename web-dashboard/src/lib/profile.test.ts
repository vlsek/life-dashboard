import { describe, expect, it } from 'vitest'
import { avatarPath, calcAge, formatAge, formatDelta, paramStats, unitSuffix, validateBirthdate, type BodyParam, type BodyValue } from './profile'

const TODAY = new Date(2026, 8, 28) // 28 сентября 2026

describe('calcAge (ожидания посчитаны вручную для 28.09.2026)', () => {
  it('день рождения уже был в этом году', () => expect(calcAge('2000-05-10', TODAY)).toBe(26))
  it('день рождения ещё впереди', () => expect(calcAge('2000-10-01', TODAY)).toBe(25))
  it('день рождения сегодня — уже новый возраст', () => expect(calcAge('2000-09-28', TODAY)).toBe(26))
  it('день рождения завтра — ещё старый возраст', () => expect(calcAge('2000-09-29', TODAY)).toBe(25))
})

describe('formatAge', () => {
  it('русское склонение', () => {
    const cases: Array<[number, string]> = [[1, '1 год'], [2, '2 года'], [4, '4 года'], [5, '5 лет'], [11, '11 лет'], [12, '12 лет'], [14, '14 лет'], [21, '21 год'], [22, '22 года'], [25, '25 лет'], [101, '101 год'], [111, '111 лет']]
    for (const [n, expected] of cases) expect(formatAge(n, 'ru')).toBe(expected)
  })
  it('английское склонение', () => {
    expect(formatAge(1, 'en')).toBe('1 year')
    expect(formatAge(2, 'en')).toBe('2 years')
    expect(formatAge(26, 'en')).toBe('26 years')
  })
})

describe('validateBirthdate', () => {
  it('пусто / вне диапазона / ок', () => {
    expect(validateBirthdate('', '2026-09-28')).toBe('empty')
    expect(validateBirthdate('1899-12-31', '2026-09-28')).toBe('range')
    expect(validateBirthdate('2026-09-29', '2026-09-28')).toBe('range')
    expect(validateBirthdate('1900-01-01', '2026-09-28')).toBe('ok')
    expect(validateBirthdate('2026-09-28', '2026-09-28')).toBe('ok')
  })
})

describe('unitSuffix / formatDelta / avatarPath', () => {
  it('единицы: % без пробела, остальные через пробел', () => {
    expect(unitSuffix('кг')).toBe(' кг')
    expect(unitSuffix('%')).toBe('%')
    expect(unitSuffix('% жира')).toBe('% жира')
    expect(unitSuffix('')).toBe('')
    expect(unitSuffix(null)).toBe('')
  })
  it('разница со знаком и 1 знаком после запятой; ~0 не показывается', () => {
    expect(formatDelta(1.5)).toBe('+1.5')
    expect(formatDelta(-0.8)).toBe('-0.8')
    expect(formatDelta(0.0005)).toBeNull()
    expect(formatDelta(0)).toBeNull()
    expect(formatDelta(null)).toBeNull()
  })
  it('путь аватара берёт последнее расширение', () => {
    expect(avatarPath('u1', 'photo.final.PNG')).toBe('u1/avatar.PNG')
  })
})

const weight: BodyParam = { id: 'w', name: 'Вес', icon: 'svg:scale', unit: 'кг', position: 0 }
const muscle: BodyParam = { id: 'm', name: 'Мышцы', icon: null, unit: 'кг', position: 1 }
const empty: BodyParam = { id: 'e', name: 'Талия', icon: null, unit: 'см', position: 2 }
const v = (parameter_id: string, date: string, value: number | null): BodyValue => ({ parameter_id, date, value })

describe('paramStats', () => {
  // вес: 80 → 78 → 77.5 (значения намеренно в перемешанном порядке — как из БД без сортировки)
  const values = [v('w', '2026-01-10', 77.5), v('w', '2026-01-01', 80), v('w', '2026-01-05', 78), v('m', '2026-01-01', 30), v('m', '2026-01-08', 32), v('w', '2026-01-12', null)]

  it('последнее значение, разница с первым и с предыдущим', () => {
    const [w] = paramStats([weight], values, null)
    expect(w.latest).toBe(77.5)
    expect(w.sinceFirst).toBe(-2.5)
    expect(w.sincePrev).toBe(-0.5)
  })
  it('вес вниз при цели lose_weight — хорошо (success), при gain_muscle — плохо (danger)', () => {
    expect(paramStats([weight], values, 'lose_weight')[0].tone).toBe('success')
    expect(paramStats([weight], values, 'gain_muscle')[0].tone).toBe('danger')
  })
  it('вес без цели — нейтральный цвет', () => {
    expect(paramStats([weight], values, 'general_fitness')[0].tone).toBe('neutral')
  })
  it('мышцы вверх — success независимо от цели', () => {
    expect(paramStats([muscle], values, null)[0].tone).toBe('success')
    expect(paramStats([muscle], values, 'lose_weight')[0].tone).toBe('success')
  })
  it('параметры без значений пропускаются; null-значения не считаются', () => {
    const res = paramStats([weight, empty], values, null)
    expect(res.map((s) => s.param.id)).toEqual(['w'])
  })
  it('единственное значение: нет предыдущего, разница 0, тон нейтральный', () => {
    const [m] = paramStats([muscle], [v('m', '2026-01-01', 30)], null)
    expect(m.sincePrev).toBeNull()
    expect(m.sinceFirst).toBe(0)
    expect(m.tone).toBe('neutral')
  })
  it('вес без изменений с прошлого раза — нейтральный', () => {
    const [w] = paramStats([weight], [v('w', '2026-01-01', 80), v('w', '2026-01-02', 80)], 'lose_weight')
    expect(w.tone).toBe('neutral')
  })
})
