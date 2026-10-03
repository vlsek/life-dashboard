// Supabase отдаёт максимум 1000 строк за запрос — читаем страницами, пока не кончатся
// (та же идея, что fetchAllRows в ванильном datacache.js и useHistoryData.ts).
const PAGE = 1000

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) return { rows, error: error.message }
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return { rows, error: null }
}
