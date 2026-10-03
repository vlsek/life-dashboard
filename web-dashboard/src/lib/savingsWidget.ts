import { ref } from 'vue'
import { sb } from './supabase'
import { loadBalance } from './loadBalance'

// Виджет «Коплю на товар» на главной (BACKLOG «Виджет «коплю на товар»», одобрено владельцем 2026-10-03; делается первым из трёх виджетов).
// Выбранный товар — id в раскладке (`widgets.savings`, lib/layout.ts); сам товар и баланс читаются из БД. Если товар куплен или удалён,
// виджета нет (состояние 'empty'), а при отсутствии виджетов нет и блока.

export interface ShopOption {
  id: string
  name: string
  cost: number
  link: string | null
}

// КОПИЯ web-shop/src/lib/shopProgress.ts (правило пилотов: копировать, не импортировать): сколько баллов уже есть от цены.
export interface ItemProgress {
  pct: number // 0..100, округлённое вниз (99.9% не показываем как 100)
  canBuy: boolean
  missing: number // сколько баллов не хватает (0, если можно купить)
}

export function itemProgress(cost: number, balance: number): ItemProgress {
  if (!(cost > 0)) return { pct: 100, canBuy: true, missing: 0 }
  const have = Math.max(0, balance)
  const canBuy = have >= cost
  const pct = canBuy ? 100 : Math.min(99, Math.floor((have / cost) * 100))
  return { pct, canBuy, missing: canBuy ? 0 : cost - have }
}

const COLS = 'id, name, cost, link, redeemed'
type Row = { id: string; name: string; cost: number | null; link: string | null; redeemed?: boolean | null }
const toOption = (r: Row): ShopOption => ({ id: r.id, name: r.name, cost: r.cost ?? 0, link: r.link ?? null })

// Товары, на которые ещё можно копить (не куплены) — для выбора в окне раскладки.
export async function loadOpenShopItems(userId: string): Promise<ShopOption[]> {
  const { data, error } = await sb.from('shop_items').select(COLS).eq('user_id', userId).eq('redeemed', false).order('created_at')
  if (error) return []
  return ((data || []) as Row[]).map(toOption)
}

export type SavingsState = 'loading' | 'ready' | 'empty' | 'error'

export function useSavingsWidget() {
  const state = ref<SavingsState>('loading')
  const item = ref<ShopOption | null>(null)
  const balance = ref(0)
  const error = ref('')

  async function load(userId: string, itemId: string) {
    state.value = 'loading'
    error.value = ''
    const [itemRes, balRes] = await Promise.all([sb.from('shop_items').select(COLS).eq('user_id', userId).eq('id', itemId).maybeSingle(), loadBalance(userId)])
    if (itemRes.error) {
      error.value = itemRes.error.message
      state.value = 'error'
      return
    }
    const row = itemRes.data as Row | null
    if (!row || row.redeemed) {
      item.value = null
      state.value = 'empty'
      return
    }
    if (!balRes.ok) {
      error.value = balRes.error
      state.value = 'error'
      return
    }
    item.value = toOption(row)
    balance.value = balRes.balance
    state.value = 'ready'
  }

  return { state, item, balance, error, load }
}
