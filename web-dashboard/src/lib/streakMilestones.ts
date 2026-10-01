import type { StreakItem } from './streaks'

// Поощряющие плашки за серии (BACKLOG 13): при достижении порога показываем поздравление ОДИН раз на порог.
// Только чистая логика (без DOM/localStorage/сети) — хранение и показ в useStreakCelebration.ts / StreakMilestoneModal.vue.

// Пороги: дни (серия «в днях») и недели (метрики «N раз в неделю», unit === 'w')
export const DAY_THRESHOLDS: readonly number[] = [5, 10, 30, 50, 100, 200, 365]
export const WEEK_THRESHOLDS: readonly number[] = [4, 12, 26, 52]

// «Большие» пороги получают более торжественные тексты
export function isBigThreshold(threshold: number, unit: 'd' | 'w'): boolean {
  return unit === 'w' ? threshold >= 26 : threshold >= 50
}

// Что уже показано: ключ серии → показанные пороги. null — состояние ещё ни разу не сохранялось (первый запуск).
export type ShownState = Record<string, number[]>

export interface Milestone {
  key: string
  threshold: number
  unit: 'd' | 'w'
  kind: StreakItem['kind']
  metricName: string | null
  streak: number
}

export function streakKey(item: StreakItem): string {
  if (item.kind === 'metric') return 'metric:' + (item.metric?.id ?? '')
  return item.kind
}

function unitOf(item: StreakItem): 'd' | 'w' {
  return item.unit === 'w' ? 'w' : 'd'
}

export function reachedThresholds(item: StreakItem): number[] {
  const list = unitOf(item) === 'w' ? WEEK_THRESHOLDS : DAY_THRESHOLDS
  return list.filter((th) => th <= item.streak)
}

// Если серия оборвалась и началась заново (она есть, но стала короче порога) — порог снова можно отпраздновать.
// Серии, которых сейчас нет в списке, не трогаем: пустой список может быть и временным сбоем загрузки.
export function reconcileShown(shown: ShownState, items: StreakItem[]): ShownState {
  const next: ShownState = {}
  for (const [key, ths] of Object.entries(shown)) next[key] = [...ths]
  for (const item of items) {
    const key = streakKey(item)
    if (next[key]) next[key] = next[key].filter((th) => th <= item.streak)
  }
  return next
}

// Порядок при равных порогах: идеальные дни → метрики → заметка дня
const KIND_ORDER: Record<StreakItem['kind'], number> = { perfect_days: 0, metric: 1, note_filled: 2 }

export interface PendingResult {
  milestone: Milestone | null
  nextShown: ShownState
}

// Выбор плашки. Показываем не больше ОДНОЙ за раз — самый высокий порог из ещё не показанных.
//  • обычный запуск: помечаем показанными пороги только выбранной серии (остальные дождутся своей очереди);
//  • первый запуск (shown === null) или плашки выключены (silent): все достигнутые пороги помечаются показанными молча,
//    чтобы не обрушить на человека поздравления за все старые серии разом; при первом запуске показываем лучшую одну.
export function findPending(shown: ShownState | null, items: StreakItem[], opts: { silent?: boolean } = {}): PendingResult {
  const firstRun = shown === null
  const base = reconcileShown(shown ?? {}, items)

  type Cand = { item: StreakItem; key: string; threshold: number; reached: number[] }
  const cands: Cand[] = []
  for (const item of items) {
    const key = streakKey(item)
    const reached = reachedThresholds(item)
    const fresh = reached.filter((th) => !(base[key] ?? []).includes(th))
    if (fresh.length) cands.push({ item, key, threshold: Math.max(...fresh), reached })
  }

  const nextShown: ShownState = { ...base }
  const markAll = (c: Cand) => {
    nextShown[c.key] = Array.from(new Set([...(nextShown[c.key] ?? []), ...c.reached])).sort((a, b) => a - b)
  }

  if (opts.silent || firstRun) cands.forEach(markAll)

  if (opts.silent || !cands.length) return { milestone: null, nextShown }

  cands.sort(
    (a, b) =>
      b.threshold - a.threshold ||
      KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] ||
      b.item.streak - a.item.streak,
  )
  const top = cands[0]
  if (!firstRun) markAll(top)
  return {
    milestone: {
      key: top.key,
      threshold: top.threshold,
      unit: unitOf(top.item),
      kind: top.item.kind,
      metricName: top.item.metric?.name ?? null,
      streak: top.item.streak,
    },
    nextShown,
  }
}

// Какой текст единицы: «дней подряд» / «недели подряд» / «недель подряд» (русская форма для порогов 4 и 52 — «недели»)
export function unitKey(threshold: number, unit: 'd' | 'w'): 'dash_celebrate_unit_days' | 'dash_celebrate_unit_weeks_few' | 'dash_celebrate_unit_weeks_many' {
  if (unit === 'd') return 'dash_celebrate_unit_days'
  return threshold % 10 >= 2 && threshold % 10 <= 4 && (threshold < 10 || threshold > 20)
    ? 'dash_celebrate_unit_weeks_few'
    : 'dash_celebrate_unit_weeks_many'
}

export const MSG_VARIANTS = 4

// Номер варианта поздравления (1..MSG_VARIANTS): детерминирован (порог + ключ), чтобы не мигал между рендерами,
// но у разных серий и порогов тексты разные.
export function messageIndex(key: string, threshold: number): number {
  let h = threshold
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return (h % MSG_VARIANTS) + 1
}
