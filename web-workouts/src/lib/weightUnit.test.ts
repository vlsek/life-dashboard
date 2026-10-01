import { beforeEach, describe, expect, it } from 'vitest'
import { WEIGHT_UNIT_KEY, isWeightUnit, readWeightUnit, rememberWeightUnit, repUnit, unitToSave } from './weightUnit'

describe('isWeightUnit', () => {
  it('узнаёт весовые единицы в разных написаниях и регистрах', () => {
    for (const u of ['кг', 'КГ', 'kg', ' kg ', 'lb', 'lbs', 'lb.', 'фунты', 'г']) expect(isWeightUnit(u), u).toBe(true)
  })
  it('не весовые и пустые — нет', () => {
    for (const u of ['раз', 'мин', 'reps', '', '   ', null, undefined]) expect(isWeightUnit(u as string | null | undefined), String(u)).toBe(false)
  })
})

describe('repUnit: что дописывать после ПОВТОРЕНИЙ', () => {
  it('весовую единицу («кг», сохранённую старой формой) не показываем', () => {
    expect(repUnit({ unit: 'кг' })).toBe('')
    expect(repUnit({ unit: 'kg' })).toBe('')
    expect(repUnit({ unit: null })).toBe('')
  })
  it('невесовую («раз», «мин») оставляем', () => {
    expect(repUnit({ unit: 'раз' })).toBe('раз')
    expect(repUnit({ unit: ' мин ' })).toBe('мин')
  })
})

describe('запоминание единицы веса', () => {
  beforeEach(() => localStorage.clear())
  it('без выбора — fallback; после rememberWeightUnit — выбранная', () => {
    expect(readWeightUnit('кг')).toBe('кг')
    rememberWeightUnit('lb')
    expect(readWeightUnit('кг')).toBe('lb')
    expect(localStorage.getItem(WEIGHT_UNIT_KEY)).toBe('lb')
  })
  it('пустая единица не запоминается', () => {
    rememberWeightUnit('   ')
    expect(localStorage.getItem(WEIGHT_UNIT_KEY)).toBeNull()
  })
})

describe('unitToSave: что писать в колонку unit', () => {
  it('без веса — пусто, даже если форма прислала «кг»; прежняя невесовая единица сохраняется', () => {
    expect(unitToSave({ unit: 'кг', tracks_weight: 'no' }, 'кг')).toBe('')
    expect(unitToSave({ unit: '', tracks_weight: 'no' }, 'кг')).toBe('')
    expect(unitToSave({ unit: undefined, tracks_weight: 'no' }, 'кг')).toBe('')
    expect(unitToSave({ unit: 'раз', tracks_weight: 'no' }, 'кг')).toBe('раз')
  })
  it('с весом — выбранная единица или единица по умолчанию', () => {
    expect(unitToSave({ unit: 'lb', tracks_weight: 'yes' }, 'кг')).toBe('lb')
    expect(unitToSave({ unit: '  ', tracks_weight: 'yes' }, 'кг')).toBe('кг')
    expect(unitToSave({ unit: null, tracks_weight: 'yes' }, 'кг')).toBe('кг')
  })
})
