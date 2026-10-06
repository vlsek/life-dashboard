import { sb } from './supabase'

// BACKLOG раздел 38 «Добавление цели с главной — тем же окном, что в «Целях»». Копия логики web-goals (бандлы пилотов независимы,
// общий код КОПИРУЕТСЯ): `lib/categories.ts` (categoryKey, savedCategories, matchCategory, mergeCategories, needsSaving), `lib/goals.ts`
// (goalExtraFields, buildInsertRow), `lib/useGoalCategories.ts` (чтение/запись goal_categories). Менять ВМЕСТЕ — их сверяет newGoalCopy.test.ts.

export type Difficulty = 'easy' | 'medium' | 'hard' | null

// Значения формы добавления цели (до сборки в строку для базы).
export interface GoalFormInput {
  name: string
  points: number
  category: string
  stages: number
  difficulty: Difficulty
  deadline: string
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

// Дедлайн/сложность пишем в базу только если заданы — так работает и до применения миграции 020 (как goalExtraFields() в web-goals для новой цели).
export function goalExtraFields(res: Pick<GoalFormInput, 'deadline' | 'difficulty'>): { deadline?: string | null; difficulty?: Difficulty } {
  const extra: { deadline?: string | null; difficulty?: Difficulty } = {}
  if (res.deadline) extra.deadline = res.deadline
  if (res.difficulty) extra.difficulty = res.difficulty
  return extra
}

// Строка для insert новой цели (как buildInsertRow() в web-goals).
export function buildInsertRow(res: GoalFormInput, noCategoryLabel: string) {
  return {
    name: res.name.trim(),
    points: res.points || 5,
    category: (res.category || noCategoryLabel).trim(),
    stages: Math.max(1, res.stages || 1),
    current_stage: 0,
    done: false,
    ...goalExtraFields(res),
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
  const row = buildInsertRow(res, noCategoryLabel)
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
