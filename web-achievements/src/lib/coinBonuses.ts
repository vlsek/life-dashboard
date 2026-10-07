import { REWARDS } from './rewards'

// ВЫДАЧА бонусных монеток за достижения (BACKLOG раздел 37, шаг 4). Хранилище и учёт в балансе — миграция 051 `achievement_bonuses`
// (агент 1, v3.54): первичный ключ (user_id, key) гарантирует «один раз на значок», бонус НЕ входит в «накоплено баллов» и в рейтинг.
// Здесь только то, чего не хватало: при загрузке страницы выдать причитающиеся монеты за ВСЕ открытые значки, у которых награда —
// монетки (ступени 1 и 2 каждой лесенки), в том числе «задним числом» за открытые раньше. Размер берём из реестра `REWARDS`.
export interface CoinBonus {
  key: string
  coins: number
}

// Минимум, который нужен от клиента Supabase (в тестах подставляется заглушка).
interface BonusClient {
  from(table: string): {
    select(cols: string): { eq(col: string, val: string): PromiseLike<{ data: unknown; error: { message: string } | null }> }
    upsert(rows: unknown, opts: { onConflict: string; ignoreDuplicates: boolean }): PromiseLike<{ error: { message: string } | null }>
  }
}

// Монетки, причитающиеся за набор открытых значков (без предметов/тем, без неизвестных ключей и служебного `_baseline`).
export function coinBonusesDue(unlockedKeys: Iterable<string>): CoinBonus[] {
  const out: CoinBonus[] = []
  for (const key of new Set(unlockedKeys)) {
    const r = REWARDS[key]
    if (r && r.kind === 'coins' && r.amount > 0) out.push({ key, coins: r.amount })
  }
  return out
}

export interface GrantResult {
  granted: CoinBonus[] // что выдано именно сейчас
  error: string | null // почему не выдали (нет таблицы/сети), страницу это НЕ ломает; при следующей загрузке попробуем снова
}

// Выдаёт недостающее одним запросом. Сначала читаем уже выданное (чтобы не слать лишних записей и знать, что выдано СЕЙЧАС), затем
// `upsert … ignoreDuplicates` — идемпотентно и безопасно при гонке (две вкладки): дубль ключа тихо пропускается базой.
export async function grantCoinBonuses(client: BonusClient, userId: string, unlockedKeys: Iterable<string>): Promise<GrantResult> {
  const due = coinBonusesDue(unlockedKeys)
  if (!due.length) return { granted: [], error: null }
  try {
    const have = await client.from('achievement_bonuses').select('key').eq('user_id', userId)
    if (have.error) return { granted: [], error: have.error.message }
    const already = new Set(((have.data || []) as { key: string }[]).map((r) => r.key))
    const missing = due.filter((b) => !already.has(b.key))
    if (!missing.length) return { granted: [], error: null }
    const res = await client
      .from('achievement_bonuses')
      .upsert(missing.map((b) => ({ user_id: userId, key: b.key, coins: b.coins })), { onConflict: 'user_id,key', ignoreDuplicates: true })
    if (res.error) return { granted: [], error: res.error.message }
    return { granted: missing, error: null }
  } catch (e) {
    return { granted: [], error: (e as Error).message }
  }
}
