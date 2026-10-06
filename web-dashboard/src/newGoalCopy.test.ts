import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в shellModalGuard.test.ts).
import { readFileSync } from 'node:fs'
import * as mine from './lib/newGoal'

// BACKLOG раздел 38: окно «Новая цель» на главной — КОПИЯ формы и логики из web-goals (бандлы пилотов независимы). Эти сверки падают, если
// копии разошлись: менять нужно обе стороны вместе (правило копий, docs/HANDOFF.md). Сравниваются ИСХОДНИКИ функций: у web-goals нет своих
// зависимостей в этой папке, импортировать его TS из тестов дашборда нельзя.
const read = (p: string): string => readFileSync(p, 'utf-8')

// Тело экспортируемой функции: от `export function name(` до закрывающей `}` в начале строки; пробелы и комментарии не важны.
function body(src: string, name: string): string {
  const start = src.indexOf(`export function ${name}(`)
  if (start < 0) throw new Error(`нет функции ${name}`)
  const open = src.indexOf('{\n', start)
  const end = src.indexOf('\n}\n', open)
  return src
    .slice(open, end)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('копия логики категорий и строки цели совпадает с web-goals', () => {
  const theirCats = read('../web-goals/src/lib/categories.ts')
  const theirGoals = read('../web-goals/src/lib/goals.ts')
  const myCode = read('src/lib/newGoal.ts')
  it.each(['categoryKey', 'savedCategories', 'matchCategory', 'mergeCategories', 'needsSaving'])('%s — тот же код', (fn) => {
    expect(body(myCode, fn)).toBe(body(theirCats, fn))
  })
  it('шкала баллов по сложности — тот же код и числа (лёгкая 5, средняя 10, сложная 15)', () => {
    expect(body(myCode, 'pointsForDifficulty')).toBe(body(theirGoals, 'pointsForDifficulty'))
    for (const line of ['export const DEFAULT_GOAL_POINTS = 5', 'export const DIFFICULTY_POINTS = { easy: 5, medium: 10, hard: 15 } as const']) {
      expect(myCode).toContain(line)
      expect(theirGoals).toContain(line)
    }
  })
  it('buildInsertRow — тот же код (у новой цели goalExtraFields без «существующей»)', () => {
    expect(body(myCode, 'buildInsertRow')).toBe(body(theirGoals, 'buildInsertRow').replace('goalExtraFields(res, null)', 'goalExtraFields(res)'))
  })
  it('goalExtraFields для новой цели: дедлайн и сложность пишутся, только если заданы (как у web-goals при existing = null)', () => {
    expect(body(theirGoals, 'goalExtraFields')).toContain('if (res.deadline || hasCols) extra.deadline = res.deadline || null')
    expect(mine.goalExtraFields({ deadline: '', difficulty: null })).toEqual({})
    expect(mine.goalExtraFields({ deadline: '2026-10-20', difficulty: 'easy' })).toEqual({ deadline: '2026-10-20', difficulty: 'easy' })
  })
  it('значения по умолчанию в строке: баллы 5, этапов не меньше 1, подпись «Без категории»', () => {
    expect(mine.buildInsertRow({ name: ' A ', category: '', stages: 0, difficulty: null, deadline: '' }, 'Без категории')).toEqual({ name: 'A', points: 5, category: 'Без категории', stages: 1, current_stage: 0, done: false })
  })
  it('баллы строки — по сложности, число этапов их не умножает', () => {
    const row = (difficulty: mine.GoalFormInput['difficulty']) => mine.buildInsertRow({ name: 'A', category: '', stages: 4, difficulty, deadline: '' }, 'Без категории').points
    expect([row('easy'), row('medium'), row('hard'), row(null)]).toEqual([5, 10, 15, 5])
  })
})

describe('копия окна совпадает с GoalForm.vue из web-goals', () => {
  const theirs = read('../web-goals/src/components/GoalForm.vue')
  const mineSrc = read('src/components/PlannedNewGoalModal.vue')
  const keysOf = (src: string) => [...src.slice(src.indexOf('<template>')).matchAll(/t\('(goals_[a-z_]+)'\)/g)].map((m) => m[1])

  it('те же подписи в том же порядке (кроме заголовка «Править цель», в окне добавления его нет)', () => {
    expect(keysOf(mineSrc)).toEqual(keysOf(theirs).filter((k) => k !== 'goals_edit_title'))
  })
  it('те же поля: v-model, тип, ограничения (min, maxlength)', () => {
    const inputs = (src: string) => [...src.slice(src.indexOf('<template>')).matchAll(/<(?:input|select)[^>]*?(v-model(?:\.number)?="[a-zA-Z]+")[^>]*?>/g)].map((m) => m[1])
    expect(inputs(mineSrc)).toEqual(inputs(theirs))
    for (const frag of ['type="number" min="1"', 'maxlength="40"', 'type="date"', 'const NEW = \'\\u0000new\'']) expect(mineSrc).toContain(frag)
    for (const frag of ['type="number" min="1"', 'maxlength="40"', 'type="date"', 'const NEW = \'\\u0000new\'']) expect(theirs).toContain(frag)
  })
  it('значения по умолчанию новой цели те же, что у формы «Новая цель» в web-goals (1 этап, сложность не задана); поля «Баллы» нет ни там, ни здесь', () => {
    expect(read('../web-goals/src/App.vue')).toContain("return { name: '', points: 5, category: '', stages: 1, difficulty: null, deadline: '' }")
    expect(mineSrc).toContain('const stages = ref(1)')
    expect(mineSrc).toContain('const difficulty = ref<Difficulty>(null)')
    expect(mineSrc).not.toContain('goals_field_points')
    expect(theirs).not.toContain('goals_field_points')
  })
})

describe('подписи окна совпадают с web-goals на обоих языках', () => {
  const theirs = read('../web-goals/src/lib/i18n.ts')
  const mineSrc = read('src/lib/i18n.ts')
  const pick = (src: string, key: string): string[] => [...src.matchAll(new RegExp(`^\\s*${key}: ('[^\\n]*'|"[^\\n]*"),\\s*$`, 'gm'))].map((m) => m[1].slice(1, -1))
  const KEYS = ['goals_new_title', 'goals_form_name_required', 'goals_field_name', 'goals_field_category', 'goals_field_stages', 'goals_no_category', 'goals_cat_new', 'goals_cat_new_placeholder', 'goals_field_difficulty', 'goals_diff_none', 'goals_diff_easy', 'goals_diff_medium', 'goals_diff_hard', 'goals_points_auto', 'goals_field_deadline']
  it.each(KEYS)('%s — EN и RU как в «Целях»', (key) => {
    const a = pick(mineSrc, key)
    const b = pick(theirs, key)
    expect(a).toHaveLength(2)
    expect(a).toEqual(b)
  })
})
