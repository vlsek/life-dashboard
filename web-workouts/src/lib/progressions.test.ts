import { describe, expect, it } from 'vitest'
import { chainDoneCount, chainState, linkState, matchesStep, PROGRESSIONS, type ProgressionChain } from './progressions'
import { musclesForExercise } from './muscles'
import type { Exercise, WorkoutEntry } from './types'
import type { StepState, StepStatus } from './progressions'

const chain = (id: string) => PROGRESSIONS.find((c) => c.id === id) as ProgressionChain
// В какую ступень цепочки попадает название (id ступени или null); при неоднозначности тест упадёт.
function stepOf(chainId: string, name: string): string | null {
  const hits = chain(chainId).steps.filter((s) => matchesStep(s, name))
  expect(hits.length, `«${name}» подошло к ${hits.length} ступеням`).toBeLessThanOrEqual(1)
  return hits[0]?.id ?? null
}

describe('сопоставление названий со ступенями', () => {
  it('отжимания: каждый вариант попадает ровно в свою ступень', () => {
    expect(stepOf('pushups', 'Отжимания с колен')).toBe('pushup_knees')
    expect(stepOf('pushups', 'Отжимания')).toBe('pushup_regular')
    expect(stepOf('pushups', 'Push-ups')).toBe('pushup_regular')
    expect(stepOf('pushups', 'Отжимания на кулаках')).toBe('pushup_fists')
    expect(stepOf('pushups', 'Алмазные отжимания')).toBe('pushup_diamond')
    expect(stepOf('pushups', 'Diamond push-ups')).toBe('pushup_diamond')
    expect(stepOf('pushups', 'Отжимания лучника')).toBe('pushup_archer')
  })
  it('отжимания на брусьях/от скамьи не считаются обычными отжиманиями', () => {
    expect(stepOf('pushups', 'Отжимания на брусьях')).toBeNull()
    expect(stepOf('pushups', 'Отжимания от скамьи')).toBeNull()
    expect(stepOf('dips', 'Отжимания на брусьях')).toBe('dips_regular')
    expect(stepOf('dips', 'Отжимания от скамьи')).toBe('dips_bench')
    expect(stepOf('dips', 'Брусья с весом')).toBe('dips_weighted')
  })
  it('подтягивания: варианты различаются', () => {
    expect(stepOf('pullups', 'Австралийские подтягивания')).toBe('pullup_australian')
    expect(stepOf('pullups', 'Подтягивания с резинкой')).toBe('pullup_assisted')
    expect(stepOf('pullups', 'Подтягивания')).toBe('pullup_regular')
    expect(stepOf('pullups', 'Pull-ups')).toBe('pullup_regular')
    expect(stepOf('pullups', 'Подтягивания широким хватом')).toBe('pullup_wide')
    expect(stepOf('pullups', 'Подтягивания лучника')).toBe('pullup_archer')
    expect(stepOf('pullups', 'Подтягивания с весом')).toBe('pullup_weighted')
  })
  it('приседания и ноги: штанга и прыжки — не «приседания с собственным весом»', () => {
    expect(stepOf('squats', 'Приседания')).toBe('squat_regular')
    expect(stepOf('squats', 'Приседания со штангой')).toBeNull()
    expect(stepOf('squats', 'Выпады')).toBe('squat_lunge')
    expect(stepOf('squats', 'Болгарские сплит-приседания')).toBe('squat_bulgarian')
    expect(stepOf('squats', 'Пистолетик с опорой')).toBe('squat_pistol_assisted')
    expect(stepOf('squats', 'Пистолетик')).toBe('squat_pistol')
  })
  it('пресс: вис отличает лёжа от подъёмов в висе', () => {
    expect(stepOf('core', 'Скручивания')).toBe('core_crunch')
    expect(stepOf('core', 'Подъёмы ног лёжа')).toBe('core_leg_raise')
    expect(stepOf('core', 'Подъёмы коленей в висе')).toBe('core_hang_knee')
    expect(stepOf('core', 'Подъёмы ног в висе')).toBe('core_hang_leg')
  })
  it('не путает регистр и «ё»; чужое упражнение никуда не попадает', () => {
    expect(stepOf('core', 'ПОДЪЁМЫ НОГ В ВИСЕ')).toBe('core_hang_leg')
    for (const c of PROGRESSIONS) expect(c.steps.some((s) => matchesStep(s, 'Йога'))).toBe(false)
  })
})

describe('структура данных', () => {
  it('id уникальны, цели положительные, у каждой цепочки не меньше трёх ступеней', () => {
    const ids = PROGRESSIONS.flatMap((c) => [c.id, ...c.steps.map((s) => s.id)])
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of PROGRESSIONS) {
      expect(c.steps.length).toBeGreaterThanOrEqual(3)
      for (const s of c.steps) expect(s.goal).toBeGreaterThan(0)
    }
  })
  it('каждая ступень, названная как в подписи, сопоставляется сама с собой (RU и EN)', () => {
    for (const c of PROGRESSIONS)
      for (const s of c.steps)
        for (const label of [s.ru, s.en]) {
          const hits = c.steps.filter((x) => matchesStep(x, label)).map((x) => x.id)
          expect(hits, `«${label}»`).toEqual([s.id])
        }
  })
  it('ступени согласованы с картой мышц: каждая подпись привязана к мышцам', () => {
    for (const c of PROGRESSIONS) for (const s of c.steps) expect(musclesForExercise(s.ru).length, s.ru).toBeGreaterThan(0)
  })
})

const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: false, value_label: null, unit: null, suggested_scheme: null, created_at: '' }) as Exercise
const en = (exercise_id: string, date: string, reps: number[]): WorkoutEntry =>
  ({ id: exercise_id + date, user_id: 'u', exercise_id, date, sets: reps.map((r) => ({ reps: r, weight: null, time: null, duration: null, side: null })), notes: null }) as WorkoutEntry
const TODAY = '2026-09-30'

describe('chainState', () => {
  const pushups = chain('pushups')
  const exercises = [ex('k', 'Отжимания с колен'), ex('r', 'Отжимания'), ex('f', 'Отжимания на кулаках')]

  it('без записей первая ступень текущая, остальные закрыты', () => {
    const s = chainState(pushups, [], [], TODAY)
    expect(s.map((x) => x.status)).toEqual(['current', 'locked', 'locked', 'locked', 'locked'])
    expect(chainDoneCount(s)).toBe(0)
  })
  it('цель достигается одним подходом — сумма нескольких подходов не считается', () => {
    const s = chainState(pushups, exercises, [en('k', '2026-09-20', [10, 10, 10])], TODAY)
    expect(s[0].status).toBe('current')
    expect(s[0].best).toBe(10)
    const s2 = chainState(pushups, exercises, [en('k', '2026-09-20', [10, 15])], TODAY)
    expect(s2[0].status).toBe('done')
    expect(s2[1].status).toBe('current')
  })
  it('текущая — первая непройденная; «перепрыгнутая» ступень с записями = progress', () => {
    const entries = [en('k', '2026-09-20', [15]), en('r', '2026-09-21', [30]), en('f', '2026-09-22', [5])]
    const s = chainState(pushups, exercises, entries, TODAY)
    expect(s.map((x) => x.status)).toEqual(['done', 'done', 'current', 'locked', 'locked'])
    const skipped = chainState(pushups, exercises, [en('f', '2026-09-22', [5])], TODAY)
    expect(skipped.map((x) => x.status)).toEqual(['current', 'locked', 'progress', 'locked', 'locked'])
  })
  it('продвинутую ступень можно закрыть, не закрыв простую — она done, а текущей остаётся простая', () => {
    const s = chainState(pushups, exercises, [en('f', '2026-09-22', [25])], TODAY)
    expect(s[2].status).toBe('done')
    expect(s[0].status).toBe('current')
  })
  it('записи из будущего, пустые подходы и подходы без повторений не считаются', () => {
    const entries = [en('k', '2026-10-05', [40]), en('k', '2026-09-20', []), { ...en('k', '2026-09-21', [0]), sets: [{ reps: null, weight: 20, time: null, duration: null, side: null }] } as WorkoutEntry]
    const s = chainState(pushups, exercises, entries, TODAY)
    expect(s[0].best).toBe(0)
    expect(s[0].status).toBe('current')
  })
  it('несколько упражнений пользователя на одну ступень — берётся лучший подход среди них', () => {
    const two = [ex('a', 'Отжимания'), ex('b', 'Push-ups')]
    const s = chainState(pushups, two, [en('a', '2026-09-20', [12]), en('b', '2026-09-21', [31])], TODAY)
    expect(s[1].best).toBe(31)
    expect(s[1].status).toBe('done')
    expect(s[1].exercises.map((e) => e.id)).toEqual(['a', 'b'])
  })
  it('все ступени пройдены — текущей нет', () => {
    const all = pushups.steps.map((st, i) => ex('x' + i, st.ru))
    const entries = all.map((e, i) => en(e.id, '2026-09-20', [pushups.steps[i].goal]))
    const s = chainState(pushups, all, entries, TODAY)
    expect(s.every((x) => x.status === 'done')).toBe(true)
    expect(chainDoneCount(s)).toBe(5)
  })
})

describe('ступени на время: цепочка «Планка» (BACKLOG 182, срез «на время»)', () => {
  it('каждый вариант планки попадает ровно в свою ступень', () => {
    expect(stepOf('plank', 'Планка на коленях')).toBe('plank_knees')
    expect(stepOf('plank', 'Knee plank')).toBe('plank_knees')
    expect(stepOf('plank', 'Планка')).toBe('plank_regular')
    expect(stepOf('plank', 'Plank')).toBe('plank_regular')
    expect(stepOf('plank', 'Боковая планка')).toBe('plank_side')
    expect(stepOf('plank', 'Side plank')).toBe('plank_side')
    expect(stepOf('plank', 'Планка с подъёмом ноги')).toBe('plank_lift')
    expect(stepOf('plank', 'Plank leg lift')).toBe('plank_lift')
  })
  it('посторонние упражнения в цепочку планки не попадают', () => {
    expect(stepOf('plank', 'Скручивания')).toBeNull()
    expect(stepOf('plank', 'Подъёмы ног в висе')).toBeNull()
  })
  it('у ступеней планки единица — секунды, у остальных цепочек единицы нет (повторения по умолчанию)', () => {
    expect(chain('plank').steps.every((s) => s.unit === 'sec')).toBe(true)
    expect(PROGRESSIONS.filter((c) => c.id !== 'plank').every((c) => c.steps.every((s) => s.unit === undefined))).toBe(true)
  })
  it('секунды из поля «повторения» закрывают ступень: 60 с планки — пройдена, следующая текущая', () => {
    const exs = [{ id: 'p', name: 'Планка' }, { id: 'sp', name: 'Боковая планка' }] as Exercise[]
    const entries = [
      { id: 'a', exercise_id: 'p', date: '2026-09-01', sets: [{ reps: 40, weight: null, time: null, duration: null, side: null }, { reps: 60, weight: null, time: null, duration: null, side: null }], notes: null },
      { id: 'b', exercise_id: 'sp', date: '2026-09-02', sets: [{ reps: 20, weight: null, time: null, duration: null, side: null }], notes: null },
    ] as WorkoutEntry[]
    const st = chainState(chain('plank'), exs, entries, '2026-09-30')
    expect(st.find((s) => s.step.id === 'plank_knees')?.status).toBe('current') // коленная ступень первая и без записей
    expect(st.find((s) => s.step.id === 'plank_regular')?.status).toBe('done')
    expect(st.find((s) => s.step.id === 'plank_side')?.status).toBe('progress')
    expect(chainDoneCount(st)).toBe(1)
  })
})

describe('linkState (линии визуального дерева)', () => {
  const mk = (statuses: StepStatus[]): StepState[] => statuses.map((status, i) => ({ step: { id: 's' + i, ru: '', en: '', req: [], goal: 1 }, status, best: 0, exercises: [] }))
  it('open / next / closed', () => {
    const st = mk(['done', 'done', 'current', 'locked'])
    expect([0, 1, 2].map((i) => linkState(st, i))).toEqual(['open', 'next', 'closed'])
  })
  it('за последней ступенью линии нет', () => {
    expect(linkState(mk(['done']), 0)).toBe('closed')
  })
})
