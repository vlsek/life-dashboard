import { beforeEach, describe, expect, it } from 'vitest'
import { CATALOG, EQUIPMENT_NAMES, EQUIPMENT_ORDER, GROUP_ORDER, catalogByEquipment, catalogByGroup, catalogById, catalogForMuscle } from '../../shared/exercise-catalog/catalog'
import { MUSCLE_IDS, musclesForExercise } from './lib/muscles'

// BACKLOG 69.21 (этап 1, запрос владельца 2026-11-02): каталог основных упражнений зала по группам мышц. Страж целостности ДАННЫХ:
// упражнение из каталога попадёт в БД обычным текстом (каноническое название), поэтому карта мышц обязана отнести его к ТОЙ ЖЕ группе, в которой оно лежит в каталоге.
beforeEach(() => localStorage.clear()) // чужие «свои привязки мышц» не должны влиять

describe('каталог упражнений: целостность', () => {
  it('достаточно упражнений, id в snake_case и уникальны, названия RU и EN уникальны', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(60)
    expect(new Set(CATALOG.map((x) => x.id)).size).toBe(CATALOG.length)
    for (const x of CATALOG) expect(x.id, x.id).toMatch(/^[a-z][a-z0-9_]*$/)
    const norm = (s: string): string => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
    expect(new Set(CATALOG.map((x) => norm(x.ru))).size, 'русские названия').toBe(CATALOG.length)
    expect(new Set(CATALOG.map((x) => norm(x.en))).size, 'английские названия').toBe(CATALOG.length)
  })

  it('порядок разделов охватывает все 12 групп мышц карты ровно по разу, и у каждой группы не меньше двух упражнений', () => {
    expect([...GROUP_ORDER].sort()).toEqual([...MUSCLE_IDS].sort())
    for (const g of GROUP_ORDER) expect(catalogByGroup(g).length, g).toBeGreaterThanOrEqual(2)
    expect(GROUP_ORDER.reduce((n, g) => n + catalogByGroup(g).length, 0)).toBe(CATALOG.length)
  })

  it('вторичные мышцы — настоящие id карты, без повторов и без главной группы', () => {
    for (const x of CATALOG) {
      expect(MUSCLE_IDS, x.id).toContain(x.group)
      for (const m of x.secondary) expect(MUSCLE_IDS, `${x.id}: ${m}`).toContain(m)
      expect(new Set(x.secondary).size, `${x.id}: повторы`).toBe(x.secondary.length)
      expect(x.secondary, `${x.id}: главная в списке вторичных`).not.toContain(x.group)
    }
  })

  it('оборудование и тип — из известного набора, у каждого оборудования есть подписи и упражнения', () => {
    for (const x of CATALOG) {
      expect(EQUIPMENT_ORDER, x.id).toContain(x.equipment)
      expect(['compound', 'isolation'], x.id).toContain(x.kind)
    }
    for (const eq of EQUIPMENT_ORDER) {
      expect(EQUIPMENT_NAMES[eq].ru.length, eq).toBeGreaterThan(2)
      expect(EQUIPMENT_NAMES[eq].en.length, eq).toBeGreaterThan(2)
      expect(catalogByEquipment(eq).length, eq).toBeGreaterThan(0)
    }
  })
})

describe('каталог упражнений ↔ карта мышц', () => {
  it('русское каноническое название относится картой к главной группе упражнения', () => {
    const bad = CATALOG.filter((x) => !musclesForExercise(x.ru).includes(x.group)).map((x) => `${x.id}: «${x.ru}» → [${musclesForExercise(x.ru).join(', ')}], ждали ${x.group}`)
    expect(bad).toEqual([])
  })

  it('английское каноническое название — тоже', () => {
    const bad = CATALOG.filter((x) => !musclesForExercise(x.en).includes(x.group)).map((x) => `${x.id}: «${x.en}» → [${musclesForExercise(x.en).join(', ')}], ждали ${x.group}`)
    expect(bad).toEqual([])
  })
})

describe('каталог упражнений: подсказки по технике', () => {
  it('у каждого упражнения есть подсказка RU и EN нормальной длины, русская — без «вы»-форм', () => {
    for (const x of CATALOG) {
      expect(x.cueRu.length, `${x.id} RU`).toBeGreaterThanOrEqual(15)
      expect(x.cueRu.length, `${x.id} RU`).toBeLessThanOrEqual(130)
      expect(x.cueEn.length, `${x.id} EN`).toBeGreaterThanOrEqual(15)
      expect(x.cueEn.length, `${x.id} EN`).toBeLessThanOrEqual(130)
      expect(x.cueRu, `${x.id}: подсказка не должна совпадать с названием`).not.toBe(x.ru)
      expect(x.cueRu, `${x.id}: «вы»-форма`).not.toMatch(/(^|[^а-яё])[а-яё]+(ите|йте|ьте)(?![а-яё])/i) // \b в JS не понимает кириллицу — границы слова заданы вручную
    }
  })
})

describe('каталог: выборки', () => {
  it('catalogById находит, на несуществующее отвечает undefined', () => {
    expect(catalogById('deadlift')?.ru).toBe('Становая тяга')
    expect(catalogById('нет такого')).toBeUndefined()
  })

  it('catalogForMuscle отдаёт и главные, и вторичные упражнения, без повторов', () => {
    const triceps = catalogForMuscle('triceps')
    expect(triceps.some((x) => x.id === 'triceps_pushdown')).toBe(true) // главная
    expect(triceps.some((x) => x.id === 'bench_press_barbell')).toBe(true) // вторичная
    expect(new Set(triceps.map((x) => x.id)).size).toBe(triceps.length)
  })
})
