// «Редкость по данным» (BACKLOG 78.8, срез 1; миграция 118): сколько людей открыли достижение. Правила — отдельно от запроса.
// Порог 20 человек стоит и в базе (функция молчит при меньшей выборке), и здесь — на случай, если ответ пришёл не от неё.
export const MIN_PEOPLE = 20

export interface RarityRow {
  key: string
  owners: number
  total: number
}

// Процент открывших: целое 0–100. 0 означает «меньше 1%» (открыли, но доля округляется до нуля) — не «никто»: owners > 0 гарантирован.
// null — показывать нечего: выборка мала, данные кривые или никто не открыл (строки «Открыли 0% людей» не бывает: ключа тогда нет в ответе).
export function peerPercent(owners: unknown, total: unknown): number | null {
  const o = Number(owners)
  const n = Number(total)
  if (!Number.isFinite(o) || !Number.isFinite(n) || n < MIN_PEOPLE || o <= 0) return null
  return Math.min(100, Math.round((Math.min(o, n) / n) * 100))
}

// Ответ базы → карта «ключ → процент». Ничему не верим: служебные ключи («_baseline»), пустые и кривые строки отбрасываем.
export function toPeerMap(rows: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!Array.isArray(rows)) return out
  for (const r of rows as Partial<RarityRow>[]) {
    if (!r || typeof r.key !== 'string' || !r.key || r.key.startsWith('_')) continue
    const p = peerPercent(r.owners, r.total)
    if (p !== null) out[r.key] = p
  }
  return out
}
