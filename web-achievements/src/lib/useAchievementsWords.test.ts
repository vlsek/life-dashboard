import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// «Языки» (BACKLOG раздел 37): загрузчик считает слова в vocabulary (всего и с learned = true) запросами head+count и отдаёт их
// в счётчики значков. Ошибка таблицы слов (нет таблицы/сети) — слов 0, страница НЕ падает.
const h = vi.hoisted(() => ({
  vocabAdded: 30 as number | null,
  vocabLearned: 12 as number | null,
  vocabError: false,
  calls: [] as string[],
  milestones: [] as { history: unknown[]; done: boolean }[],
  milestonesError: false,
}))

vi.mock('./supabase', () => {
  function from(table: string) {
    const state = { learned: false }
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        if (col === 'learned' && val === true) state.learned = true
        return chain
      },
      in: () => chain,
      order: () => chain,
      range: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : null, error: null }),
      upsert: () => Promise.resolve({ error: null }),
      insert: () => Promise.resolve({ error: null }),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        if (table === 'vocabulary') {
          h.calls.push(state.learned ? 'learned' : 'all')
          const r = h.vocabError ? { data: null, error: { message: 'relation "vocabulary" does not exist' }, count: null } : { data: null, error: null, count: state.learned ? h.vocabLearned : h.vocabAdded }
          return Promise.resolve(r).then(res, rej)
        }
        if (table === 'milestones') {
          const r = h.milestonesError ? { data: null, error: { message: 'relation "milestones" does not exist' } } : { data: h.milestones, error: null }
          return Promise.resolve(r).then(res, rej)
        }
        return Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
      },
    }
    return chain
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from }, logout: vi.fn() }
})

import { useAchievements } from './useAchievements'

beforeEach(() => {
  localStorage.clear()
  h.vocabAdded = 30
  h.vocabLearned = 12
  h.vocabError = false
  h.calls = []
  h.milestones = []
  h.milestonesError = false
})

async function load() {
  const a = useAchievements()
  await a.init()
  await flushPromises()
  return a
}

describe('загрузчик достижений: слова «Языков»', () => {
  it('считает добавленные и выученные слова отдельными запросами и открывает нужные ступени лесенок', async () => {
    const a = await load()
    expect(h.calls.sort()).toEqual(['all', 'learned'])
    expect(a.counters.value).toMatchObject({ wordsAdded: 30, wordsLearned: 12 })
    const met = (k: string) => a.states.value.find((s) => s.def.key === k)!.met
    expect(met('words_10')).toBe(true)
    expect(met('words_25')).toBe(true)
    expect(met('words_50')).toBe(false)
    expect(met('learned_10')).toBe(true)
    expect(met('learned_25')).toBe(false)
    expect(a.error.value).toBeNull()
  })

  it('первый заход: открытые ступени записываются задним числом (без даты), поздравлять не с чем', async () => {
    const a = await load()
    expect(a.newlyUnlocked.value).toEqual([])
    expect(Object.keys(a.unlocked.value)).toEqual(expect.arrayContaining(['words_10', 'words_25', 'learned_10']))
  })

  it('ошибка таблицы слов: слов 0, значки «Языков» закрыты, страница не в состоянии ошибки', async () => {
    h.vocabError = true
    const a = await load()
    expect(a.counters.value).toMatchObject({ wordsAdded: 0, wordsLearned: 0 })
    expect(a.error.value).toBeNull()
    expect(a.states.value.filter((s) => s.def.group.startsWith('words_') && s.met)).toEqual([])
    expect(a.states.value.length).toBeGreaterThan(20) // остальные значки на месте
  })

  it('пустой словарь (count = 0) и count = null не дают значков', async () => {
    h.vocabAdded = 0
    h.vocabLearned = null
    const a = await load()
    expect(a.counters.value).toMatchObject({ wordsAdded: 0, wordsLearned: 0 })
  })
})

describe('загрузчик достижений: «Вехи»', () => {
  it('считает отметки выполнения (история + разовые выполненные) и открывает «Веха взята» и «Пять вех»', async () => {
    h.milestones = [
      { history: [{}, {}, {}], done: false }, // 3
      { history: [], done: true }, // 1 (разовая выполненная)
      { history: [{}], done: true }, // 1 (не удваиваем)
      { history: [], done: false }, // 0
    ]
    const a = await load()
    expect(a.counters.value?.milestonesDone).toBe(5)
    const met = (k: string) => a.states.value.find((x) => x.def.key === k)!.met
    expect(met('milestones_1')).toBe(true)
    expect(met('milestones_5')).toBe(true)
    expect(met('milestones_10')).toBe(false)
  })

  it('ошибка таблицы вех: 0 отметок, страница не в состоянии ошибки', async () => {
    h.milestonesError = true
    const a = await load()
    expect(a.counters.value?.milestonesDone).toBe(0)
    expect(a.error.value).toBeNull()
  })
})

