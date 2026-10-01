import { describe, expect, it } from 'vitest'
import { HEIGHT_MAX_CM, HEIGHT_MIN_CM, autoNormFromBody, autoNormFromWeight, bodySurfaceAreaM2, validHeightCm } from './waterGoal'

// BACKLOG 17: рост в формуле авто-нормы воды. BSA по Мостеллеру × 1200 мл/м² (1500 мл/м²·сут общей жидкости × 0.8 питьём).
// Те же числа проверяет docs/sql-checks/034_water_norm_height_check.sql — TS и SQL обязаны совпадать.
describe('автонорма воды с учётом роста', () => {
  it('площадь поверхности тела по Мостеллеру: √(рост × вес / 3600)', () => {
    expect(bodySurfaceAreaM2(70, 175)).toBeCloseTo(1.8446, 3)
    expect(bodySurfaceAreaM2(55, 185)).toBeCloseTo(1.6811, 3) // пример из справочника по BSA-методу: 1,68 м²
  })

  it('примеры нормы: 175 см / 70 кг → 2210; 185/55 → 2020; 160/60 → 1960 (как в SQL-проверке)', () => {
    expect(autoNormFromBody(70, 175)).toBe(2210)
    expect(autoNormFromBody(55, 185)).toBe(2020)
    expect(autoNormFromBody(60, 160)).toBe(1960)
  })

  it('округление до 10 мл', () => {
    for (const [w, h] of [[63.3, 171], [88, 190], [49.5, 158]]) expect(autoNormFromBody(w, h)! % 10).toBe(0)
  })

  it('без роста или с неправдоподобным ростом — прежний расчёт вес × 30', () => {
    expect(autoNormFromBody(70, null)).toBe(autoNormFromWeight(70))
    expect(autoNormFromBody(70, undefined)).toBe(2100)
    expect(autoNormFromBody(70, 17)).toBe(2100) // «17» вместо 170 — не считаем по мусору
    expect(autoNormFromBody(70, 999)).toBe(2100)
  })

  it('нет веса — нормы нет (как и раньше)', () => {
    expect(autoNormFromBody(null, 175)).toBeNull()
    expect(autoNormFromBody(0, 175)).toBeNull()
  })

  it('validHeightCm: границы 100–250 включительно, строки с числом принимаются, мусор — null', () => {
    expect(validHeightCm(HEIGHT_MIN_CM)).toBe(100)
    expect(validHeightCm(HEIGHT_MAX_CM)).toBe(250)
    expect(validHeightCm(99.9)).toBeNull()
    expect(validHeightCm(251)).toBeNull()
    expect(validHeightCm('178' as unknown as number)).toBe(178)
    expect(validHeightCm(null)).toBeNull()
    expect(validHeightCm(NaN)).toBeNull()
  })

  it('выше при том же весе → норма больше; результат в разумных пределах для взрослых', () => {
    expect(autoNormFromBody(70, 190)!).toBeGreaterThan(autoNormFromBody(70, 160)!)
    for (const [w, h] of [[45, 150], [70, 175], [120, 195]]) {
      const n = autoNormFromBody(w, h)!
      expect(n).toBeGreaterThan(1400)
      expect(n).toBeLessThan(3500)
    }
  })
})
