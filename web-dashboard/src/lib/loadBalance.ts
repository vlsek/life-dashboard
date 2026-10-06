import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { calcBalance, type BalanceMetric, type BalanceValueRow } from './balance'
import { withWaterGoal } from './waterGoal'

import { friendlyError } from './friendlyError'
// Загрузка баланса баллов (те же 6 источников, что у дашборда и магазина; daily_values — постранично). Вынесено из useProfile.ts,
// чтобы блок «Профиль» и виджет «Коплю на товар» не читали всю историю дважды: пока запрос для пользователя идёт, второй
// вызов получает тот же промис. Готовый результат НЕ кэшируется — следующий вызов читает свежие данные.
export type BalanceResult = { ok: true; balance: number } | { ok: false; error: string }

const inflight = new Map<string, Promise<BalanceResult>>()

async function fetchBalance(userId: string): Promise<BalanceResult> {
  const [metricsRes, valuesRes, goalsRes, skillsRes, booksRes, redeemedRes, bonusRes] = await Promise.all([
    sb.from('metrics').select('*').eq('user_id', userId).eq('active', true),
    fetchAllRows<BalanceValueRow>((from, to) => sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).order('date').order('metric_id').range(from, to)),
    sb.from('goals').select('points').eq('user_id', userId).eq('done', true),
    sb.from('skills').select('points').eq('user_id', userId).eq('mastered', true),
    sb.from('books').select('points').eq('user_id', userId).eq('status', 'done'),
    sb.from('shop_items').select('cost').eq('user_id', userId).eq('redeemed', true),
    // Бонусные монеты за достижения (миграция 051). Нет таблицы / ошибка запроса — бонус 0, баланс не ломаем.
    sb.from('achievement_bonuses').select('coins').eq('user_id', userId),
  ])
  const err = metricsRes.error?.message || valuesRes.error || goalsRes.error?.message || skillsRes.error?.message || booksRes.error?.message || redeemedRes.error?.message
  if (err) return { ok: false, error: friendlyError(err, 'load') }
  const balance = calcBalance(
    // вода — по эффективной норме, а не по пустому goal_value (migrations/033)
    await withWaterGoal(userId, (metricsRes.data || []) as (BalanceMetric & { name?: string | null; icon?: string | null; position?: number | null })[]),
    valuesRes.rows,
    goalsRes.data || [],
    skillsRes.data || [],
    booksRes.data || [],
    (redeemedRes.data || []).map((r: { cost: number | null }) => r.cost),
    bonusRes?.error ? [] : ((bonusRes?.data || []) as { coins: number | string | null }[]).map((r) => (r.coins == null ? null : Number(r.coins))),
  ).balance
  return { ok: true, balance }
}

export function loadBalance(userId: string): Promise<BalanceResult> {
  const running = inflight.get(userId)
  if (running) return running
  const p = fetchBalance(userId).finally(() => inflight.delete(userId))
  inflight.set(userId, p)
  return p
}
