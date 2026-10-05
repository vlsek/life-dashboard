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
