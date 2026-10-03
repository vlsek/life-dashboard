import { describe, expect, it } from 'vitest'
import { planMuscleSync, type SyncRow } from './muscleSync'
import type { MuscleId } from './muscles'

const local = (m: Record<string, MuscleId[]>) => (name: string) => m[name] ?? null
const row = (id: string, name: string, groups?: unknown, withKey = true): SyncRow => (withKey ? { id, name, muscle_groups: groups } : { id, name })

// Миграция 038 (workout_exercises.muscle_groups): синхронизация своей привязки между устройствами
describe('planMuscleSync', () => {
  it('нет строк или колонки нет (миграция не применена) — плана нет, всё остаётся на устройстве', () => {
    expect(planMuscleSync([], local({}), false)).toEqual({ hasColumn: false, toUpload: [], apply: [] })
    const noColumn = planMuscleSync([row('1', 'A', undefined, false)], local({ A: ['abs'] }), false)
    expect(noColumn).toEqual({ hasColumn: false, toUpload: [], apply: [] })
  })

  it('непустое значение в БД — главное: идёт в локальный слой, и локальное другое не выгружается', () => {
    const plan = planMuscleSync([row('1', 'Wall angels', ['shoulders', 'back'])], local({ 'Wall angels': ['abs'] }), false)
    expect(plan.hasColumn).toBe(true)
    expect(plan.apply).toEqual([{ name: 'Wall angels', muscles: ['shoulders', 'back'] }])
    expect(plan.toUpload).toEqual([])
  })

  it('из БД отбрасываются чужие id и повторы', () => {
    const plan = planMuscleSync([row('1', 'X', ['abs', 'abs', 'wings', 'back'])], local({}), true)
    expect(plan.apply).toEqual([{ name: 'X', muscles: ['abs', 'back'] }])
  })

  it('первый проход устройства: в БД пусто, а локально есть (из v2.32) — загружаем в БД, локальное не трогаем', () => {
    const plan = planMuscleSync([row('7', 'Wall angels', null)], local({ 'Wall angels': ['shoulders'] }), false)
    expect(plan.toUpload).toEqual([{ id: '7', name: 'Wall angels', muscles: ['shoulders'] }])
    expect(plan.apply).toEqual([])
  })

  it('после первого прохода БД — источник правды: пусто в БД (сбросили на другом устройстве) → локальную убираем', () => {
    const plan = planMuscleSync([row('7', 'Wall angels', null)], local({ 'Wall angels': ['shoulders'] }), true)
    expect(plan.toUpload).toEqual([])
    expect(plan.apply).toEqual([{ name: 'Wall angels', muscles: null }])
  })

  it('пусто и в БД, и локально — ничего; пустой массив в БД = «не задано»', () => {
    expect(planMuscleSync([row('1', 'A', null)], local({}), false).apply).toEqual([])
    expect(planMuscleSync([row('1', 'A', [])], local({}), true).apply).toEqual([])
    expect(planMuscleSync([row('1', 'A', [])], local({ A: ['abs'] }), true).apply).toEqual([{ name: 'A', muscles: null }])
  })

  it('несколько упражнений обрабатываются независимо', () => {
    const plan = planMuscleSync([row('1', 'A', ['abs']), row('2', 'B', null), row('3', 'C', null)], local({ B: ['back'] }), false)
    expect(plan.apply).toEqual([{ name: 'A', muscles: ['abs'] }])
    expect(plan.toUpload).toEqual([{ id: '2', name: 'B', muscles: ['back'] }])
  })
})
