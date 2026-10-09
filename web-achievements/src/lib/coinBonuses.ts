import { REWARDS } from './rewards'

// ВЫДАЧА бонусных монеток за достижения (BACKLOG раздел 37, шаг 4). Хранилище и учёт в балансе — миграция 051 `achievement_bonuses`
// (агент 1, v3.54): первичный ключ (user_id, key) гарантирует «один раз на значок», бонус НЕ входит в «накоплено баллов» и в рейтинг.
// При загрузке страницы выдаём причитающиеся монеты за ВСЕ открытые значки, у которых награда — монетки (ступени 1 и 2 каждой лесенки),
// в том числе «задним числом» за открытые раньше.
//
// БЕЗОПАСНОСТЬ (BACKLOG 47.6, срез 3, миграция 062): раньше клиент сам присылал ключ и сумму (до 500) — монеты без предела. Теперь выдаёт
// серверная функция `claim_achievement_bonuses()`: сумму берёт из серверного каталога `achievement_bonus_catalog` и только за значок из
// `user_achievements`. Пока миграция 062 не применена (функции нет), работает прежний путь — прямая запись по реестру `REWARDS`.
export interface CoinBonus {
  key: string
  coins: number
}

// Минимум, который нужен от клиента Supabase (в тестах подставляется заглушка).
interface BonusClient {
  rpc(fn: string): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>
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

// Серверной функции нет (миграция 062 не применена): PostgREST отвечает PGRST202, Postgres — 42883.
export function isFunctionMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  return err.code === 'PGRST202' || err.code === '42883' || /could not find the function/i.test(err.message ?? '')
}

// Основной путь: серверная функция. Возвращает ТОЛЬКО что выдано сейчас (сумму и ключи определяет сервер, не клиент).
async function grantViaServer(client: BonusClient): Promise<GrantResult | 'missing'> {
  const res = await client.rpc('claim_achievement_bonuses')
  if (res.error) {
    if (isFunctionMissing(res.error)) return 'missing'
    return { granted: [], error: res.error.message }
  }
  const rows = (Array.isArray(res.data) ? res.data : []) as { key?: unknown; coins?: unknown }[]
  const granted: CoinBonus[] = []
  for (const r of rows) {
    const coins = Number(r.coins)
    if (typeof r.key === 'string' && Number.isFinite(coins) && coins > 0) granted.push({ key: r.key, coins })
  }
  return { granted, error: null }
}

// Прежний путь (до миграции 062): читаем уже выданное и пишем недостающее `upsert … ignoreDuplicates` — идемпотентно, безопасно при гонке.
async function grantLegacy(client: BonusClient, userId: string, unlockedKeys: Iterable<string>): Promise<GrantResult> {
  const due = coinBonusesDue(unlockedKeys)
  if (!due.length) return { granted: [], error: null }
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
}

// Выдаёт недостающее. Если нечего выдавать (нет значков с монетками) — база не трогается вообще. Сбой не роняет страницу.
export async function grantCoinBonuses(client: BonusClient, userId: string, unlockedKeys: Iterable<string>): Promise<GrantResult> {
  const keys = [...unlockedKeys]
  if (!coinBonusesDue(keys).length) return { granted: [], error: null }
  try {
    const viaServer = await grantViaServer(client)
    if (viaServer !== 'missing') return viaServer
    return await grantLegacy(client, userId, keys)
  } catch (e) {
    return { granted: [], error: (e as Error).message }
  }
}
