import { beforeEach, describe, expect, it } from 'vitest'
import { VARIANT_BASES, applyVariant, baseForName, baseName, detectVariant, stripVariant, variantText } from './exerciseVariants'

// BACKLOG 585: типовые упражнения и разновидности; разновидность — часть названия, остальное написанное не стирается
const base = (id: string) => VARIANT_BASES.find((b) => b.id === id)!
const idx = (id: string, ru: string) => base(id).variants.findIndex((v) => v.ru === ru)

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('справочник', () => {
  it('у каждого упражнения есть ключи, названия RU/EN и не меньше 3 разновидностей', () => {
    for (const b of VARIANT_BASES) {
      expect(b.keys.length).toBeGreaterThan(0)
      expect(b.ru && b.en).toBeTruthy()
      expect(b.variants.length).toBeGreaterThanOrEqual(3)
      for (const v of b.variants) {
        expect(v.ru && v.en).toBeTruthy()
      }
    }
  })
  it('в списке есть все примеры владельца: алмазные, широкие, обычный хват, лучник', () => {
    const ru = base('pushup').variants.map((v) => v.ru)
    expect(ru).toEqual(expect.arrayContaining(['алмазные', 'широкие', 'обычным хватом', 'лучника']))
  })
  it('id и разновидности внутри упражнения не повторяются', () => {
    expect(new Set(VARIANT_BASES.map((b) => b.id)).size).toBe(VARIANT_BASES.length)
    for (const b of VARIANT_BASES) expect(new Set(b.variants.map((v) => v.ru)).size).toBe(b.variants.length)
  })
})

describe('baseForName', () => {
  it('находит упражнение по ключевому слову на русском и английском', () => {
    expect(baseForName('Отжимания')?.id).toBe('pushup')
    expect(baseForName('мои отжимания от пола')?.id).toBe('pushup')
    expect(baseForName('Diamond push-ups')?.id).toBe('pushup')
    expect(baseForName('Планка')?.id).toBe('plank')
    expect(baseForName('Жим лёжа')?.id).toBe('bench')
    expect(baseForName('Подтягивания')?.id).toBe('pullup')
  })
  it('частное раньше общего: отжимания на брусьях — не просто отжимания', () => {
    expect(baseForName('Отжимания на брусьях')?.id).toBe('dips')
    expect(baseForName('Dips')?.id).toBe('dips')
  })
  it('нет типового упражнения — null', () => {
    expect(baseForName('')).toBeNull()
    expect(baseForName('Йога')).toBeNull()
  })
  it('baseName по языку', () => {
    expect(baseName(base('pushup'), 'ru')).toBe('Отжимания')
    expect(baseName(base('pushup'), 'en')).toBe('Push-ups')
    expect(baseName(base('pushup'))).toBe('Отжимания') // язык сайта в тесте — русский
  })
})

describe('detectVariant', () => {
  it('видит вписанную разновидность на любом языке, регистр и запятые не мешают', () => {
    expect(detectVariant('Отжимания алмазные', base('pushup'))).toBe(idx('pushup', 'алмазные'))
    expect(detectVariant('Отжимания, Алмазные', base('pushup'))).toBe(idx('pushup', 'алмазные'))
    expect(detectVariant('Diamond push-ups', base('pushup'))).toBe(idx('pushup', 'алмазные'))
    expect(detectVariant('Жим лежа узким хватом', base('bench'))).toBe(idx('bench', 'узким хватом'))
  })
  it('нет разновидности — -1; слово внутри другого слова не считается', () => {
    expect(detectVariant('Отжимания', base('pushup'))).toBe(-1)
    expect(detectVariant('Отжимания от пола', base('pushup'))).toBe(-1)
    expect(detectVariant('Отжимания сумоидные', base('squat'))).toBe(-1)
  })
})

describe('applyVariant / stripVariant — написанное не стирается', () => {
  it('добавляет разновидность к названию (русский — после, английский — перед)', () => {
    expect(applyVariant('Отжимания', base('pushup'), idx('pushup', 'алмазные'))).toBe('Отжимания алмазные')
    expect(applyVariant('Push-ups', base('pushup'), idx('pushup', 'алмазные'))).toBe('Diamond push-ups')
    expect(applyVariant('Планка', base('plank'), idx('plank', 'боковая'))).toBe('Планка боковая')
  })
  it('смена разновидности заменяет только её: допись человека остаётся', () => {
    const name = 'Мои отжимания алмазные у стены'
    const out = applyVariant(name, base('pushup'), idx('pushup', 'широкие'))
    expect(out).toBe('Мои отжимания у стены широкие')
    expect(out).toContain('Мои')
    expect(out).toContain('у стены')
  })
  it('английское название: смена и снятие тоже сохраняют остальное', () => {
    const wide = applyVariant('Diamond push-ups', base('pushup'), idx('pushup', 'широкие'))
    expect(wide).toBe('Wide push-ups')
    expect(applyVariant('Diamond push-ups', base('pushup'), -1)).toBe('push-ups')
    expect(applyVariant('Diamond push-ups on a wall', base('pushup'), idx('pushup', 'широкие'))).toBe('Wide push-ups on a wall')
  })
  it('«Нет разновидности» убирает только её, без висящих запятых и пробелов', () => {
    expect(applyVariant('Отжимания, алмазные', base('pushup'), -1)).toBe('Отжимания')
    expect(applyVariant('Отжимания алмазные', base('pushup'), -1)).toBe('Отжимания')
    expect(stripVariant('Отжимания', base('pushup'))).toBe('Отжимания')
  })
  it('«ё» в названии и без неё одинаково', () => {
    expect(applyVariant('Планка с подъёмом ноги', base('plank'), idx('plank', 'боковая'))).toBe('Планка боковая')
    expect(applyVariant('Планка с подъемом ноги', base('plank'), idx('plank', 'боковая'))).toBe('Планка боковая')
    expect(detectVariant('Планка с подъемом ноги', base('plank'))).toBe(idx('plank', 'с подъёмом ноги'))
  })
  it('повторный выбор той же разновидности не дублирует её', () => {
    const once = applyVariant('Отжимания', base('pushup'), idx('pushup', 'алмазные'))
    expect(applyVariant(once, base('pushup'), idx('pushup', 'алмазные'))).toBe(once)
  })
  it('пустое название и неверный индекс ничего не ломают', () => {
    expect(applyVariant('', base('pushup'), 0)).toBe('')
    expect(applyVariant('Отжимания', base('pushup'), 99)).toBe('Отжимания')
  })
  it('variantText по языку', () => {
    expect(variantText(base('pushup').variants[0], 'ru')).toBe('алмазные')
    expect(variantText(base('pushup').variants[0], 'en')).toBe('Diamond')
  })
})
