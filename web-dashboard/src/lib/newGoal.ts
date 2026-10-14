import { sb } from './supabase'

// BACKLOG раздел 38 «Добавление цели с главной — тем же окном, что в «Целях»». Копия логики web-goals (бандлы пилотов независимы,
// общий код КОПИРУЕТСЯ): `lib/categories.ts` (categoryKey, savedCategories, matchCategory, mergeCategories, needsSaving), `lib/goals.ts`
// (goalExtraFields, buildInsertRow), `lib/useGoalCategories.ts` (чтение/запись goal_categories). Менять ВМЕСТЕ — их сверяет newGoalCopy.test.ts.

export type Difficulty = 'easy' | 'medium' | 'hard' | null

// Горизонт цели (BACKLOG 1048+1050, миграция 084) — копия из web-goals/src/lib/horizons.ts (только нужное для новой цели).
export type Horizon = 'now' | 'soon' | 'month' | 'day'
export const HORIZON_KEYS = { now: 'goals_hor_now', soon: 'goals_hor_soon', month: 'goals_hor_month', day: 'goals_hor_day' } as const

// Какие горизонты можно выбрать: без колонки (миграция 084 не применена) — только те, что выражаются без неё.
export function horizonOptions(hasColumn: boolean): Horizon[] {
  return hasColumn ? ['now', 'soon', 'month', 'day'] : ['now', 'day']
}

// Поля горизонта и срока для записи в базу. Срок хранится только у «В конкретный день»; колонка horizon пишется, только если она есть.
// clearDeadline: при правке срок у не-«дня» обнуляется (null); у новой цели обнулять нечего — ключ не пишется.
export function horizonFields(res: { horizon?: Horizon | null; deadline: string }, hasColumn: boolean, clearDeadline = true): { horizon?: Horizon; deadline?: string | null } {
  const h: Horizon = res.horizon ?? (res.deadline ? 'day' : 'now')
  const out: { horizon?: Horizon; deadline?: string | null } = {}
  if (h === 'day' ? res.deadline : clearDeadline) out.deadline = h === 'day' ? res.deadline || null : null
  if (hasColumn) out.horizon = h
  return out
}

// opts.horizonColumn — есть ли в базе колонка goals.horizon (миграция 084); без неё горизонт сводится к сроку.
export interface GoalWriteOpts {
  horizonColumn?: boolean
  weightColumn?: boolean // есть ли колонки goals.weight_* (миграция 085)
}

// Есть ли колонка goals.horizon: пробный запрос; ошибка (колонки нет) или сбой сети — считаем, что нет.
export async function hasHorizonColumn(): Promise<boolean> {
  try {
    return !(await sb.from('goals').select('horizon').limit(1)).error
  } catch {
    return false
  }
}

// Цели на вес (BACKLOG 1085, миграция 085) — копия web-goals/src/lib/weightGoal.ts (разбор ввода, проверка, поля для базы).
export type WeightMode = 'lose' | 'gain'
export const WEIGHT_MIN = 20
export const WEIGHT_MAX = 500

export function parseWeight(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < WEIGHT_MIN || n > WEIGHT_MAX) return null
  return Math.round(n * 10) / 10
}

export type WeightCheck = 'ok' | 'start' | 'target' | 'direction'

export function validateWeight(mode: WeightMode, start: number | null, target: number | null): WeightCheck {
  if (start === null) return 'start'
  if (target === null) return 'target'
  if (mode === 'lose' ? target >= start : target <= start) return 'direction'
  return 'ok'
}

export function weightFields(res: Pick<GoalFormInput, 'weightMode' | 'weightStart' | 'weightTarget'>, column: boolean): { weight_mode?: WeightMode | null; weight_start?: number | null; weight_target?: number | null } {
  if (!column) return {}
  if (res.weightMode) return { weight_mode: res.weightMode, weight_start: res.weightStart ?? null, weight_target: res.weightTarget ?? null }
  return { weight_mode: null, weight_start: null, weight_target: null }
}

// Есть ли колонки goals.weight_*: пробный запрос; ошибка или сбой сети — считаем, что нет (окно не покажет выбор «Сбросить/Набрать вес»).
export async function hasWeightColumn(): Promise<boolean> {
  try {
    return !(await sb.from('goals').select('weight_mode').limit(1)).error
  } catch {
    return false
  }
}

// Последнее измерение веса тела (body_stats.weight) — старт цели на вес по умолчанию. Нет записей / сбой — null (старт введут руками).
export async function loadBodyWeight(userId: string): Promise<number | null> {
  try {
    const { data, error } = await sb.from('body_stats').select('weight').eq('user_id', userId).not('weight', 'is', null).order('date', { ascending: false }).limit(1)
    const w = !error && data && data.length ? Number((data[0] as { weight: number | string }).weight) : NaN
    return Number.isFinite(w) ? w : null
  } catch {
    return null
  }
}

// Значения формы добавления цели (до сборки в строку для базы).
export interface GoalFormInput {
  name: string
  category: string
  stages: number
  difficulty: Difficulty
  deadline: string
  horizon?: Horizon | null
  weightMode?: WeightMode | null // цель на вес (085); у обычной цели ключей веса нет
  weightStart?: number | null
  weightTarget?: number | null
}

// Созданная цель в том виде, в каком её держит блок «Планы» (PlanGoal).
export interface CreatedGoal {
  id: string
  name: string
  stages: number
  done: boolean
  current_stage: number
}

export function categoryKey(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function savedCategories(goals: { category: string }[], noCategoryLabels: string[] = []): string[] {
  const skip = new Set(noCategoryLabels.map(categoryKey).filter(Boolean))
  const stats = new Map<string, { count: number; spellings: Map<string, number>; first: string }>()
  for (const g of goals) {
    const raw = (g.category ?? '').trim().replace(/\s+/g, ' ')
    const key = categoryKey(raw)
    if (!key || skip.has(key)) continue
    const st = stats.get(key) ?? { count: 0, spellings: new Map(), first: raw }
    st.count++
    st.spellings.set(raw, (st.spellings.get(raw) ?? 0) + 1)
    stats.set(key, st)
  }
  return [...stats.values()]
    .map((st) => {
      let best = st.first
      let bestN = 0
      for (const [sp, n] of st.spellings) if (n > bestN) ((best = sp), (bestN = n))
      return { name: best, count: st.count }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((x) => x.name)
}

export function matchCategory(value: string, saved: string[], noCategoryLabels: string[] = []): string | null {
  const key = categoryKey(value)
  if (!key || noCategoryLabels.some((l) => categoryKey(l) === key)) return ''
  return saved.find((s) => categoryKey(s) === key) ?? null
}

export function mergeCategories(derived: string[], stored: string[], noCategoryLabels: string[] = []): string[] {
  const skip = new Set(noCategoryLabels.map(categoryKey).filter(Boolean))
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [...derived, ...stored]) {
    const clean = (name ?? '').trim().replace(/\s+/g, ' ')
    const key = categoryKey(clean)
    if (!key || skip.has(key) || seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

export function needsSaving(name: string, stored: string[], noCategoryLabels: string[] = []): boolean {
  const key = categoryKey(name)
  if (!key || key.length > 40) return false
  if (noCategoryLabels.some((l) => categoryKey(l) === key)) return false
  return !stored.some((s) => categoryKey(s) === key)
}

// Баллы цели по сложности (решение владельца 2026-10-06, BACKLOG разделы 35/40): вручную не вводятся. Лёгкая 5, средняя 10, сложная 15;
// сложность не задана — 5. Копия из web-goals/src/lib/goals.ts (там же pointsAfterEdit для правки — здесь только создание).
export const DEFAULT_GOAL_POINTS = 5
export const DIFFICULTY_POINTS = { easy: 5, medium: 10, hard: 15 } as const
export function pointsForDifficulty(difficulty: Difficulty): number {
  return difficulty ? DIFFICULTY_POINTS[difficulty] : DEFAULT_GOAL_POINTS
}

// Дедлайн/сложность пишем в базу только если заданы — так работает и до применения миграции 020 (как goalExtraFields() в web-goals для новой цели).
export function goalExtraFields(res: Pick<GoalFormInput, 'deadline' | 'difficulty'>): { deadline?: string | null; difficulty?: Difficulty } {
  const extra: { deadline?: string | null; difficulty?: Difficulty } = {}
  if (res.deadline) extra.deadline = res.deadline
  if (res.difficulty) extra.difficulty = res.difficulty
  return extra
}

// Строка для insert новой цели (как buildInsertRow() в web-goals).
export function buildInsertRow(res: GoalFormInput, noCategoryLabel: string, opts: GoalWriteOpts = {}) {
  return {
    name: res.name.trim(),
    points: pointsForDifficulty(res.difficulty),
    category: (res.category || noCategoryLabel).trim(),
    stages: res.weightMode ? 1 : Math.max(1, res.stages || 1), // у цели на вес этапов нет: прогресс идёт по весу
    current_stage: 0,
    done: false,
    ...goalExtraFields(res),
    ...(res.horizon !== undefined || opts.horizonColumn ? horizonFields(res, !!opts.horizonColumn, false) : {}),
    ...weightFields(res, !!opts.weightColumn),
  }
}

// Список своих категорий для выбора в форме: из самих целей + сохранённый список (миграция 050). Нет таблицы / сбой чтения — тот же список
// из целей, ошибок пользователю не показываем (как useGoalCategories.load() в web-goals).
export async function loadMyCategories(userId: string, noCategoryLabels: string[]): Promise<{ list: string[]; stored: string[] }> {
  let derived: string[] = []
  let stored: string[] = []
  try {
    const { data, error } = await sb.from('goals').select('category').eq('user_id', userId)
    if (!error) derived = savedCategories((data || []) as { category: string }[], noCategoryLabels)
  } catch {
    /* сеть: список останется пустым, «Новая категория…» и «Без категории» работают */
  }
  try {
    const { data, error } = await sb.from('goal_categories').select('name').eq('user_id', userId).order('position').order('created_at')
    if (!error) stored = ((data || []) as { name: string }[]).map((r) => r.name).filter((n) => typeof n === 'string' && n.trim() !== '')
  } catch {
    /* таблицы нет (миграция 050 не применена) — список только из целей */
  }
  return { list: mergeCategories(derived, stored, noCategoryLabels), stored }
}

// Записать новую цель. Ошибка летит наверх (окно покажет понятный текст и останется открытым).
export async function createGoal(userId: string, res: GoalFormInput, noCategoryLabel: string): Promise<CreatedGoal> {
  const row = buildInsertRow(res, noCategoryLabel, { horizonColumn: await hasHorizonColumn(), weightColumn: await hasWeightColumn() })
  const { data, error } = await sb.from('goals').insert({ user_id: userId, ...row }).select('id, name, stages, done, current_stage').single()
  if (error) throw error
  return data as CreatedGoal
}

// Запомнить новую категорию в сохранённом списке (как ensure() в web-goals). Никогда не бросает: цель уже сохранена.
export async function ensureCategory(userId: string, name: string, stored: string[], noCategoryLabels: string[]): Promise<void> {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!needsSaving(clean, stored, noCategoryLabels)) return
  try {
    await sb.from('goal_categories').insert({ user_id: userId, name: clean, position: stored.length })
  } catch {
    /* таблицы нет или сеть — категория всё равно попадёт в список из самих целей */
  }
}
