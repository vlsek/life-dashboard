import { beforeEach, describe, expect, it, vi } from 'vitest'
import { baseMetrics } from './onboardingData'

// BACKLOG 867 «Учёба»: по умолчанию просто «учился» (галочка) + необязательное «что учил/изучил» (миграция 058).
describe('шаблон «Учёба» в онбординге', () => {
  it('на обоих языках — галочка с заметкой, без минут и цели', () => {
    for (const lang of ['ru', 'en'] as const) {
      const m = baseMetrics(lang).find((x) => x.key === 'study')!
      expect(m.type).toBe('boolean')
      expect(m.ask_note).toBe(true)
      expect(m.goal_value).toBeUndefined()
      expect(m.unit).toBeUndefined()
    }
  })
})

const h = vi.hoisted(() => ({ inserts: [] as any[][], firstError: null as null | { message: string } }))
vi.mock('./supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    from: (table: string) => ({
      upsert: () => Promise.resolve({ error: null }),
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: (rows: any[]) => {
        if (table === 'metrics') {
          h.inserts.push(rows)
          const err = h.inserts.length === 1 ? h.firstError : null
          return Promise.resolve({ error: err })
        }
        return Promise.resolve({ error: null })
      },
    }),
  },
}))
import { useOnboarding } from './useOnboarding'

const identity = { name: 'Тест', avatar: null } as never

describe('создание метрик: заметка и запасной вариант без миграции 058', () => {
  beforeEach(() => {
    h.inserts = []
    h.firstError = null
  })
  it('метрика с заметкой уходит с ask_note: true, остальные — без поля', async () => {
    const r = await useOnboarding().skip('u1', identity, baseMetrics('ru'))
    expect(r.ok).toBe(true)
    const rows = h.inserts[0]
    expect(rows.find((x) => x.name === 'Учёба')).toMatchObject({ type: 'boolean', ask_note: true })
    expect(rows.filter((x) => 'ask_note' in x)).toHaveLength(1)
  })
  it('нет колонки ask_note (миграция не применена): метрики создаются повторно без неё, человек не остаётся без метрик', async () => {
    h.firstError = { message: 'column "ask_note" of relation "metrics" does not exist' }
    const r = await useOnboarding().skip('u1', identity, baseMetrics('ru'))
    expect(r.ok && r.seedError).toBeNull()
    expect(h.inserts).toHaveLength(2)
    expect(h.inserts[1].every((x) => !('ask_note' in x))).toBe(true)
    expect(h.inserts[1]).toHaveLength(h.inserts[0].length)
  })
  it('другая ошибка записи не маскируется повторной попыткой', async () => {
    h.firstError = { message: 'permission denied for table metrics' }
    const r = await useOnboarding().skip('u1', identity, baseMetrics('ru'))
    expect(h.inserts).toHaveLength(1)
    expect(r.ok && r.seedError).toMatchObject({ message: 'permission denied for table metrics' })
  })
})
