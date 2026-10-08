import { ref } from 'vue'

// «Огоньки стриков» — валюта Магазина (BACKLOG 46.3, миграция 057). Пока миграция не применена, Магазин работает в монетах, как раньше;
// после — вещи-желания покупаются за огоньки. Здесь только состояние режима и чистая логика (без сети и DOM).
export const sparksMode = ref(false)

export const DEFAULT_RUB_PER_SPARK = 10 // подсказка для калькулятора цены; реальное значение — sparks_config.rub_per_spark
export const rubPerSpark = ref(DEFAULT_RUB_PER_SPARK)
export const DEFAULT_SPARKS_COST = 10

export interface SparksBalanceView {
  total: number
  spent: number
  balance: number
}

// Ответ RPC sync_streak_sparks()/get_sparks_balance(): массив из одной строки (или сама строка) с earned/spent/balance (bigint приходит и числом, и строкой).
export function parseSparksRow(data: unknown): SparksBalanceView | null {
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const n = (v: unknown): number | null => {
    const x = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
    return Number.isFinite(x) ? x : null
  }
  const total = n(r.earned)
  const spent = n(r.spent)
  const balance = n(r.balance)
  if (total === null || spent === null || balance === null) return null
  return { total, spent, balance }
}

// Цена в рублях → огоньки (округление вверх, минимум 1); мусор и неположительное — 0 (поле остаётся пустым).
export function rubToSparks(rub: number, rate: number = rubPerSpark.value): number {
  if (!Number.isFinite(rub) || rub <= 0 || !Number.isFinite(rate) || rate <= 0) return 0
  return Math.max(1, Math.ceil(rub / rate))
}

// Подсказка цены при переносе старой вещи из архива (монеты → огоньки): огоньки копятся медленнее монет (≈ 5–10 в день против десятков баллов),
// поэтому берём 1/8 и даём поправить вручную.
export function coinsToSparksSuggestion(coins: number): number {
  if (!Number.isFinite(coins) || coins <= 0) return DEFAULT_SPARKS_COST
  return Math.max(1, Math.round(coins / 8))
}

// Ошибки триггера покупки (миграция 057) → ключи текстов; остальное — как обычная ошибка.
export function purchaseErrorKey(err: unknown): 'shop_err_insufficient_sparks' | 'shop_err_archived' | null {
  const msg = String((err as { message?: unknown } | null)?.message ?? err ?? '')
  if (msg.includes('insufficient_sparks')) return 'shop_err_insufficient_sparks'
  if (msg.includes('archived_item')) return 'shop_err_archived'
  return null
}
