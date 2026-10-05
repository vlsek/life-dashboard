import type { Goal } from './types'

// BACKLOG раздел 35 «Цели: категории должны сохраняться (список своих категорий)». Категория цели — текст в `goals.category`; список
// СВОИХ категорий выводится из самих целей человека (активных и выполненных), отдельной таблицы и миграции нет: то, что уже было
// введено, попадает в список как есть и ничего не теряется. Чистая логика без сети и Vue.

// Ключ для сравнения: без регистра и лишних пробелов («Спорт» и «спорт » — одна категория).
export function categoryKey(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// Свои категории: уникальные (без учёта регистра), без пустых и без подписи «Без категории» (на любом языке). Самые частые — сверху,
// при равенстве — по алфавиту; пишется самое частое написание (при равенстве — первое встретившееся).
export function savedCategories(goals: Pick<Goal, 'category'>[], noCategoryLabels: string[] = []): string[] {
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

// Какой пункт выбран в списке для текущего значения: '' — без категории, имя из списка (в его написании) или null — значения в списке нет.
export function matchCategory(value: string, saved: string[], noCategoryLabels: string[] = []): string | null {
  const key = categoryKey(value)
  if (!key || noCategoryLabels.some((l) => categoryKey(l) === key)) return ''
  return saved.find((s) => categoryKey(s) === key) ?? null
}

// Итоговый список для выбора в форме цели (миграция 050, BACKLOG раздел 35): сначала категории, которыми человек пользуется
// (из целей, частые сверху — `derived`), затем сохранённые, у которых сейчас нет ни одной цели (`stored`, в порядке списка).
// Одинаковые без учёта регистра и пробелов не повторяются; «Без категории» не попадает.
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

// Нужно ли записать категорию в сохранённый список: непустая, не «Без категории» и ещё не записана (без учёта регистра).
export function needsSaving(name: string, stored: string[], noCategoryLabels: string[] = []): boolean {
  const key = categoryKey(name)
  if (!key || key.length > 40) return false
  if (noCategoryLabels.some((l) => categoryKey(l) === key)) return false
  return !stored.some((s) => categoryKey(s) === key)
}

