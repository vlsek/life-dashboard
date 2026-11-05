import { beforeEach, describe, expect, it } from 'vitest'
import { BARS, DEFAULT_PLATES, PLATES_KEY, formatPlates, parsePlates, plateSystem, platesPerSide, readPlates, writePlates } from './plates'

const KG = DEFAULT_PLATES.kg

describe('platesPerSide (69.15 срез 1)', () => {
  it('100 кг на грифе 20: на сторону 40 = 25 + 15', () => {
    const r = platesPerSide(100, 20, KG)
    expect(r.perSide).toEqual([{ plate: 25, count: 1 }, { plate: 15, count: 1 }])
    expect(r.loaded).toBe(100)
    expect(r.remainder).toBe(0)
  })
  it('жадно от тяжёлого: 140 кг — по 2 × 25 + 1 × 10', () => {
    expect(platesPerSide(140, 20, KG).perSide).toEqual([{ plate: 25, count: 2 }, { plate: 10, count: 1 }])
  })
  it('дробные блины считаются без хвостов: 27,5 кг на гриф 20 — 2,5 + 1,25 на сторону не даёт погрешности', () => {
    const r = platesPerSide(27.5, 20, KG)
    expect(r.perSide).toEqual([{ plate: 2.5, count: 1 }, { plate: 1.25, count: 1 }])
    expect(r.loaded).toBe(27.5)
    expect(r.remainder).toBe(0)
  })
  it('нет подходящих блинов: показывает, чего не хватает, и реальный вес', () => {
    const r = platesPerSide(61, 20, [20, 10])
    expect(r.perSide).toEqual([{ plate: 20, count: 1 }])
    expect(r.loaded).toBe(60)
    expect(r.remainder).toBe(1)
  })
  it('цель равна грифу — блинов нет; меньше грифа — признак belowBar', () => {
    expect(platesPerSide(20, 20, KG)).toMatchObject({ perSide: [], loaded: 20, remainder: 0, belowBar: false })
    expect(platesPerSide(15, 20, KG)).toMatchObject({ perSide: [], belowBar: true })
  })
  it('пустая, нулевая и негодная цель — без блинов и без «ниже грифа»', () => {
    for (const x of [0, -5, NaN]) expect(platesPerSide(x, 20, KG)).toMatchObject({ perSide: [], belowBar: false })
  })
  it('фунты: 225 lb на грифе 45 — по 2 × 45 на сторону', () => {
    expect(platesPerSide(225, 45, DEFAULT_PLATES.lb).perSide).toEqual([{ plate: 45, count: 2 }])
  })
  it('порядок и дубликаты блинов во входе не важны', () => {
    expect(platesPerSide(100, 20, [15, 25, 25, 0, -3])).toEqual(platesPerSide(100, 20, [25, 15]))
  })
})

describe('parsePlates / formatPlates', () => {
  it('разделители — запятая, точка с запятой, пробел; сортировка по убыванию, дубликаты склеены', () => {
    expect(parsePlates('10, 25;20  2.5 25')).toEqual([25, 20, 10, 2.5])
  })
  it('мусор, нули и > 200 отбрасываются; ничего годного — null', () => {
    expect(parsePlates('abc, 0, -5, 999, 5')).toEqual([5])
    expect(parsePlates('')).toBeNull()
    expect(parsePlates('abc')).toBeNull()
  })
  it('десятичная запятая — это разделитель: «2,5» читается как 2 и 5', () => {
    expect(parsePlates('2,5')).toEqual([5, 2])
  })
  it('formatPlates → parsePlates возвращает тот же набор', () => {
    expect(parsePlates(formatPlates(KG))).toEqual(KG)
  })
})

describe('plateSystem и хранение', () => {
  beforeEach(() => localStorage.clear())
  it('фунты — lb, всё прочее — кг', () => {
    expect(plateSystem('lb')).toBe('lb')
    expect(plateSystem(' LBS. ')).toBe('lb')
    expect(plateSystem('фунт')).toBe('lb')
    expect(plateSystem('кг')).toBe('kg')
    expect(plateSystem(undefined)).toBe('kg')
    expect(BARS.lb[0]).toBe(45)
  })
  it('набор по умолчанию, сохранённый набор и защита от битого значения', () => {
    expect(readPlates('kg')).toEqual(KG)
    writePlates('kg', [20, 5])
    expect(readPlates('kg')).toEqual([20, 5])
    expect(readPlates('lb')).toEqual(DEFAULT_PLATES.lb) // системы не смешиваются
    localStorage.setItem(PLATES_KEY + 'kg', '{не json')
    expect(readPlates('kg')).toEqual(KG)
    localStorage.setItem(PLATES_KEY + 'kg', JSON.stringify(['a', -1]))
    expect(readPlates('kg')).toEqual(KG)
  })
})
