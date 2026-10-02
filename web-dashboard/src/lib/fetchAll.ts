// Supabase отдаёт максимум 1000 строк за запрос — читаем страницами, пока не кончатся
// (та же идея, что fetchAllRows в ванильном datacache.js и useHistoryData.ts).
export const PAGE = 1000

// Сколько страниц после первой читаем параллельно. Было: строго по одной — N последовательных обращений к базе на N тысяч строк
// (профиль ждал ВСЮ историю `daily_values` ради одной цифры баланса, BACKLOG 6 «Оптимизация блоков»).
export const PARALLEL_PAGES = 4

type PageResult<T> = { data: T[] | null; error: { message: string } | null }

// Контракт прежний: строки в порядке страниц, при ошибке — что успели прочитать + текст ошибки.
// Первая страница читается одна: на малых данных (< PAGE строк — обычный случай) это по-прежнему ровно один запрос.
// Если страница полная, дальше берём пачками по `parallel` страниц одновременно; лишних запросов — не больше parallel − 1
// (пустые страницы за концом данных). Порядок строк определяют запросы (order + range), поэтому параллельность его не меняет.
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  parallel: number = PARALLEL_PAGES,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = []
  // нечисловое/бесконечное значение не должно превращать цикл в бесконечный: берём значение по умолчанию
  const width = Number.isFinite(parallel) ? Math.max(1, Math.floor(parallel)) : PARALLEL_PAGES

  const first = await page(0, PAGE - 1)
  if (first.error) return { rows, error: first.error.message }
  rows.push(...(first.data || []))
  if (!first.data || first.data.length < PAGE) return { rows, error: null }

  for (let start = PAGE; ; start += PAGE * width) {
    const batch = await Promise.all(Array.from({ length: width }, (_, i) => page(start + i * PAGE, start + (i + 1) * PAGE - 1)))
    for (const { data, error } of batch) {
      if (error) return { rows, error: error.message }
      rows.push(...(data || []))
      if (!data || data.length < PAGE) return { rows, error: null }
    }
  }
}
