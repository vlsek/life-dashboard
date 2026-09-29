// Портировано 1:1 из describeError() в login.js: собирает из ответа Supabase понятную
// строку (сообщение + описание + код), а если ничего нет — сериализует объект целиком,
// чтобы в поле ошибки никогда не оказалась пустота.
export interface ErrorLabels {
  unknownError: string
  errorCode: string // "(code " / "(код "
  unknownErrorConsole: string
}

export function describeError(e: unknown, labels: ErrorLabels): string {
  if (!e) return labels.unknownError
  const err = e as { message?: string; error_description?: string; status?: number }
  const parts: string[] = []
  if (err.message) parts.push(err.message)
  if (err.error_description) parts.push(err.error_description)
  if (err.status) parts.push(`${labels.errorCode}${err.status})`)
  if (parts.length === 0) {
    try {
      parts.push(JSON.stringify(e))
    } catch {
      parts.push(String(e))
    }
  }
  return parts.join(' ') || labels.unknownErrorConsole
}
