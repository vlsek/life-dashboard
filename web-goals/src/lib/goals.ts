import type { Difficulty, Goal, GoalFormInput } from './types'

// Текстовый прогресс-бар из блоков — портировано 1:1 из bar() в goals.js.
export function bar(cur: number, total: number, width = 8): string {
  const pct = total ? cur / total : 0
  const filled = Math.round(pct * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

// Дней до дедлайна (отрицательное — просрочено). Портировано из daysUntil() в goals.js.
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const t0 = new Date(today)
  t0.setHours(0, 0, 0, 0)
  const target = new Date(isoDate + 'T00:00:00')
  return Math.round((target.getTime() - t0.getTime()) / 86400000)
}

export type DeadlineLevel = 'overdue' | 'today' | 'soon' | 'later' | null

// Портировано из renderGoalRow() в goals.js: <=3 дня — "скоро" (жёлтый), иначе обычный.
// Дедлайн не показывается у уже выполненных целей — это решает вызывающий код (шаблон).
export function deadlineLevel(deadline: string | null, today: Date = new Date()): { level: DeadlineLevel; days: number | null } {
  if (!deadline) return { level: null, days: null }
  const days = daysUntil(deadline, today)
  if (days < 0) return { level: 'overdue', days }
  if (days === 0) return { level: 'today', days }
  if (days <= 3) return { level: 'soon', days }
  return { level: 'later', days }
}

// Дедлайн/сложность пишем в базу только если заданы (или уже были у цели) — так страница
// продолжает работать и до применения миграции 020. Портировано из goalExtraFields().
export function goalExtraFields(res: Pick<GoalFormInput, 'deadline' | 'difficulty'>, existing: Goal | null): { deadline?: string | null; difficulty?: Difficulty } {
  const extra: { deadline?: string | null; difficulty?: Difficulty } = {}
  const hasCols = existing ? 'deadline' in existing : false
  if (res.deadline || hasCols) extra.deadline = res.deadline || null
  if (res.difficulty || hasCols) extra.difficulty = res.difficulty || null
  return extra
}

// Патч для insert новой цели. Портировано из addGoal().
export function buildInsertRow(res: GoalFormInput, noCategoryLabel: string) {
  return {
    name: res.name.trim(),
    points: res.points || 5,
    category: (res.category || noCategoryLabel).trim(),
    stages: Math.max(1, res.stages || 1),
    current_stage: 0,
    done: false,
    ...goalExtraFields(res, null),
  }
}

// Патч для update существующей цели. Портировано из editGoal() — если этапов стало
// меньше текущего прогресса, прогресс подрезается; done пересчитывается для
// многоэтапных целей (для одноэтапных done трогает toggleGoal, не форма).
export function buildUpdateRow(res: GoalFormInput, existing: Goal, noCategoryLabel: string) {
  const stages = Math.max(1, res.stages || 1)
  const patch: Record<string, unknown> = {
    name: res.name.trim(),
    points: res.points || 5,
    category: (res.category || noCategoryLabel).trim(),
    stages,
    ...goalExtraFields(res, existing),
  }
  if (existing.current_stage > stages) patch.current_stage = stages
  if (stages > 1) patch.done = (existing.current_stage ?? 0) >= stages
  return patch
}

// Группировка активных целей по категории (сорт. ключи), внутри — по дедлайну
// (без дедлайна — в конец). Портировано из render() в goals.js.
export function groupActiveByCategory(active: Goal[], noCategoryLabel: string): [string, Goal[]][] {
  const groups: Record<string, Goal[]> = {}
  for (const g of active) {
    const key = g.category || noCategoryLabel
    ;(groups[key] ??= []).push(g)
  }
  return Object.keys(groups)
    .sort()
    .map((cat) => [
      cat,
      groups[cat].slice().sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      }),
    ])
}

// Выполненные — по дате выполнения, новые сверху.
export function sortDone(done: Goal[]): Goal[] {
  return done.slice().sort((a, b) => (b.done_date ?? '').localeCompare(a.done_date ?? ''))
}

// Сумма баллов: заработано (выполненные) / всего возможных.
export function pointsSummary(goals: Goal[]): { earned: number; possible: number } {
  let earned = 0
  let possible = 0
  for (const g of goals) {
    const p = g.points ?? 5
    possible += p
    if (g.done) earned += p
  }
  return { earned, possible }
}

// Следующий шаг многоэтапной цели (кнопки +/-). Портировано из stepGoal().
export function stepStage(g: Pick<Goal, 'stages' | 'current_stage'>, delta: number): { current_stage: number; done: boolean } {
  const stages = g.stages ?? 1
  const cur = Math.max(0, Math.min(stages, (g.current_stage ?? 0) + delta))
  return { current_stage: cur, done: cur >= stages }
}

// ---- Многоэтапные цели в виде карточек (BACKLOG 7.1 «Многоступенчатые цели») ----
// Этапы — счётчик `current_stage` из `stages` (названий этапов в БД нет), поэтому «отметить этап k» = выставить прогресс до k:
// этапы идут по порядку, пропустить второй и отметить третий нельзя. Тап по последнему выполненному этапу откатывает его.

// Новый прогресс после тапа по этапу k (1-based): тап по текущему (последнему выполненному) — откат на k-1, иначе — выставить k.
export function stageTapTarget(current: number, stages: number, k: number): number {
  const total = Math.max(1, stages)
  const kk = Math.max(1, Math.min(total, Math.round(k)))
  const cur = Math.max(0, Math.min(total, current))
  return cur === kk ? kk - 1 : kk
}

// Результат выставления прогресса: тот же формат, что у stepStage().
export function stageResult(stages: number, target: number): { current_stage: number; done: boolean } {
  const total = Math.max(1, stages)
  const cur = Math.max(0, Math.min(total, Math.round(target)))
  return { current_stage: cur, done: cur >= total }
}

// Процент выполнения этапов (0..100, целое).
export function stagePercent(current: number, stages: number): number {
  const total = Math.max(1, stages)
  return Math.round((Math.max(0, Math.min(total, current)) / total) * 100)
}

// Как рисовать прогресс: до MAX_SEGMENTS этапов — сегменты (по одному на этап), больше — сплошная полоса (сегменты стали бы крошечными).
export const MAX_SEGMENTS = 12
export type StageProgress = { mode: 'segments'; filled: number; total: number } | { mode: 'bar'; pct: number }
export function stageProgress(current: number, stages: number): StageProgress {
  const total = Math.max(1, stages)
  const cur = Math.max(0, Math.min(total, current))
  if (total <= MAX_SEGMENTS) return { mode: 'segments', filled: cur, total }
  return { mode: 'bar', pct: stagePercent(cur, total) }
}
