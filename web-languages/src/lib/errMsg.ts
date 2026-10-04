// Текст ошибки для показа человеку. Supabase возвращает ошибку обычным объектом { message, details, hint, code }, а не `Error`,
// поэтому `e instanceof Error ? e.message : String(e)` показывал «[object Object]». КОПИЯ в каждом пилоте (правило пилотов).
export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
    try {
      const json = JSON.stringify(e)
      if (json && json !== '{}') return json
    } catch {
      /* циклическая ссылка — ниже общий текст */
    }
    return 'unknown error'
  }
  return String(e)
}
