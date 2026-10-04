import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  row: null as null | { workout_program?: unknown },
  selectError: null as null | { message: string },
  upsertError: null as null | { message: string },
  upserts: [] as unknown[],
}))
vi.mock('./supabase', () => ({
  sb: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: db.row, error: db.selectError }) }) }),
      upsert: (p: unknown) => {
        db.upserts.push(p)
        return Promise.resolve({ error: db.upsertError })
      },
    }),
  },
}))

import { readProgram, writeProgram } from './program'
import { saveProgramToProfile, syncProgramFromProfile } from './programSync'

const P1 = { templateId: 'pushups_6w', startDate: '2026-10-03', doneWeeks: [0] }
const P2 = { templateId: 'pullups_6w', startDate: '2026-10-10', doneWeeks: [] }

beforeEach(() => {
  localStorage.clear()
  db.row = null
  db.selectError = null
  db.upsertError = null
  db.upserts = []
})

describe('syncProgramFromProfile (миграция 040)', () => {
  it('в профиле есть программа — она главная: пишется в localStorage, в профиль ничего не уходит', async () => {
    writeProgram(P2)
    db.row = { workout_program: P1 }
    expect(await syncProgramFromProfile('u1')).toEqual(P1)
    expect(readProgram()).toEqual(P1)
    expect(db.upserts).toEqual([])
  })
  it('в профиле пусто, устройство ещё не синхронизировалось — локальная программа один раз уезжает в профиль', async () => {
    writeProgram(P1)
    db.row = { workout_program: null }
    expect(await syncProgramFromProfile('u1')).toEqual(P1)
    expect(db.upserts).toEqual([{ user_id: 'u1', workout_program: P1 }])
  })
  it('устройство уже синхронизировалось, а в профиле пусто — программу завершили на другом устройстве: локальная убирается (не воскресает)', async () => {
    db.row = { workout_program: P1 }
    await syncProgramFromProfile('u1') // первый проход: флаг «синхронизировано» встал
    db.row = { workout_program: null }
    expect(await syncProgramFromProfile('u1')).toBeNull()
    expect(readProgram()).toBeNull()
    expect(db.upserts).toEqual([])
  })
  it('колонки нет (ошибка запроса) — остаёмся на локальной программе и ничего не пишем', async () => {
    writeProgram(P1)
    db.selectError = { message: 'column "workout_program" does not exist' }
    expect(await syncProgramFromProfile('u1')).toEqual(P1)
    expect(db.upserts).toEqual([])
  })
  it('нет ни локальной, ни удалённой — null, ничего не пишем', async () => {
    expect(await syncProgramFromProfile('u1')).toBeNull()
    expect(db.upserts).toEqual([])
  })
  it('мусор в профиле считается «пусто»', async () => {
    db.row = { workout_program: { templateId: 5 } }
    expect(await syncProgramFromProfile('u1')).toBeNull()
  })
})

describe('saveProgramToProfile', () => {
  it('true при успехе (пишет нормализованную программу или null), false при ошибке записи', async () => {
    expect(await saveProgramToProfile('u1', { ...P1, doneWeeks: [1, 0, 1] })).toBe(true)
    expect(db.upserts.at(-1)).toEqual({ user_id: 'u1', workout_program: { ...P1, doneWeeks: [0, 1] } })
    expect(await saveProgramToProfile('u1', null)).toBe(true)
    expect(db.upserts.at(-1)).toEqual({ user_id: 'u1', workout_program: null })
    db.upsertError = { message: 'denied' }
    expect(await saveProgramToProfile('u1', P1)).toBe(false)
  })
})
