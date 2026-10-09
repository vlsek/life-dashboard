import { parseCollapseStyle, writeCachedCollapseStyle } from './collapseStyle'
import { ref } from 'vue'
import { sb } from './supabase'
import { fmtDate } from './date'
import { t } from './i18n'
import {
  ITEMS,
  achievementUnlocks,
  composeBalance,
  itemByKey,
  itemStatus,
  nextSelected,
  parseSelected,
  priceOf,
  type Category,
  type CustomState,
  type Selected,
  type Source,
  type Unlocked,
} from './customization'
import { notifyCustomizationChanged } from './customizationEvents'
import { friendlyError } from './friendlyError'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Данные и действия страницы «Кастомизация» (BACKLOG 491). Хранение: user_customizations (открытое) + profiles.customization
// (выбранное), миграция 048. Покупка за баллы = открытие предмета + строка «выкупленного» товара в shop_items с ценой, поэтому баланс
// в Магазине и на Дашборде уменьшается сам, без правок их кода. Нет таблицы (048 не применена) — страница показывает витрину без покупок.
// Нет серверной функции (миграция ещё не применена): PostgREST отвечает PGRST202, Postgres — 42883.
export function isFunctionMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  return err.code === 'PGRST202' || err.code === '42883' || /could not find the function/i.test(err.message ?? '')
}

export function useCustomization() {
  const auth = ref<AuthState>({ status: 'loading' })
  const unlocked = ref<Unlocked>({})
  const selected = ref<Selected>({})
  const balance = ref<number | null>(null)
  const achievements = ref<Set<string>>(new Set())
  const apiMissing = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const actionError = ref<string | null>(null)
  const busyKey = ref<string | null>(null)

  const state = (): CustomState => ({ unlocked: unlocked.value, selected: selected.value, balance: balance.value, achievements: achievements.value })
  const statusOf = (key: string) => {
    const item = itemByKey(key)
    return item ? itemStatus(item, state()) : 'locked'
  }

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const userId = session.user.id
    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }
    auth.value = { status: 'ready', userId, userEmail: session.user.email ?? null }
    await load(userId)
  }

  // Баланс = всего набрано баллов (та же функция, что у лидерборда: метрики + цели + навыки + книги, с дробными) + бонусные монеты за достижения
  // (миграция 051; в лидерборд они НЕ входят, поэтому добавляются здесь явно) − потраченное в магазине.
  async function loadBalance(userId: string): Promise<number | null> {
    let res = await sb.rpc('get_leaderboard_period', { range_key: 'all' })
    if (res.error) res = await sb.rpc('get_leaderboard')
    if (res.error) return null
    const mine = ((res.data || []) as { user_id: string; total_points: number | string }[]).find((r) => r.user_id === userId)
    if (!mine) return null
    const [spentRes, bonusRes] = await Promise.all([
      sb.from('shop_items').select('cost').eq('user_id', userId).eq('redeemed', true),
      // нет таблицы (миграция 051 не применена) / ошибка запроса — бонус 0, баланс не ломаем
      sb.from('achievement_bonuses').select('coins').eq('user_id', userId),
    ])
    if (spentRes.error) return null
    const spent = ((spentRes.data || []) as { cost: number | null }[]).reduce((s, r) => s + (r.cost ?? 0), 0)
    const bonus = bonusRes?.error ? [] : ((bonusRes?.data || []) as { coins: number | string | null }[]).map((r) => r.coins)
    return composeBalance(Number(mine.total_points), spent, bonus)
  }

  async function load(userId: string) {
    loading.value = true
    try {
      const [ownedRes, profileRes, achRes, bal] = await Promise.all([
        sb.from('user_customizations').select('item_key, source, unlocked_at').eq('user_id', userId),
        sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle(),
        sb.from('user_achievements').select('key').eq('user_id', userId),
        loadBalance(userId),
      ])
      balance.value = bal
      achievements.value = new Set(((achRes.data || []) as { key: string }[]).map((r) => r.key).filter((k) => k !== '_baseline'))
      apiMissing.value = !!ownedRes.error || !!profileRes.error
      if (apiMissing.value) {
        unlocked.value = {}
        selected.value = {}
        return
      }
      const map: Unlocked = {}
      for (const r of (ownedRes.data || []) as { item_key: string; source: Source; unlocked_at: string | null }[]) {
        if (itemByKey(r.item_key)) map[r.item_key] = { source: r.source, unlockedAt: r.unlocked_at }
      }
      unlocked.value = map
      selected.value = parseSelected((profileRes.data as { customization?: unknown } | null)?.customization)
      writeCachedCollapseStyle(parseCollapseStyle(selected.value.collapse_style)) // выбор мог быть сделан на другом устройстве
      await syncAchievementRewards(userId)
      error.value = null
    } catch (e) {
      error.value = friendlyError(e, 'load')
    } finally {
      loading.value = false
    }
  }

  // Получено достижение с наградой-предметом — предмет открывается сам (источник «achievement»).
  // Миграция 060: выдаёт сервер (`claim_achievement_items` — только предметы из каталога и только по значку из каталога, повтор безопасен).
  // Пока миграция не применена, функции нет — работает прежний путь прямой записью (после 060 прямая запись клиенту закрыта).
  async function syncAchievementRewards(userId: string) {
    const keys = achievementUnlocks(ITEMS, unlocked.value, achievements.value)
    if (!keys.length) return
    const rpc = await sb.rpc('claim_achievement_items')
    let granted: string[]
    if (!rpc.error) {
      granted = ((rpc.data || []) as string[]).filter((k) => keys.includes(k))
    } else if (isFunctionMissing(rpc.error)) {
      const { error: err } = await sb.from('user_customizations').upsert(keys.map((k) => ({ user_id: userId, item_key: k, source: 'achievement' })), { onConflict: 'user_id,item_key' })
      if (err) return // не записалось — попробуем при следующем заходе
      granted = keys
    } else return
    const now = new Date().toISOString()
    const next = { ...unlocked.value }
    for (const k of granted) next[k] = { source: 'achievement', unlockedAt: now }
    unlocked.value = next
  }

  // Покупка (миграция 060): всё делает сервер одной транзакцией — цену берёт из своего каталога, баланс считает сам, предмет и списание пишет вместе.
  // Клиентская цена — только для подписи. Пока миграция не применена, работает прежний двухшаговый путь (`buyLegacy`).
  async function buy(key: string): Promise<boolean> {
    actionError.value = null
    const item = itemByKey(key)
    if (!item || auth.value.status !== 'ready' || apiMissing.value || busyKey.value) return false
    if (itemStatus(item, state()) !== 'buyable') return false
    const price = priceOf(item)!
    const userId = auth.value.userId
    busyKey.value = key
    try {
      const label = `${t('cust_shop_prefix')} ${t(('cust_item_' + key) as never)}`
      const rpc = await sb.rpc('buy_customization', { p_item_key: key, p_label: label })
      if (!rpc.error) {
        const row = ((rpc.data || []) as { spent: number; new_balance: number | string }[])[0]
        unlocked.value = { ...unlocked.value, [key]: { source: 'points', unlockedAt: new Date().toISOString() } }
        // баланс — тот, что посчитал сервер (а не «минус цена»): расхождение с клиентом исключено
        balance.value = row ? Number(row.new_balance) : balance.value == null ? null : Math.round((balance.value - price) * 10) / 10
        return true
      }
      if (!isFunctionMissing(rpc.error)) {
        if (rpc.error.code === '23505') await load(userId) // уже куплено с другой вкладки — просто показываем актуальное
        throw new Error(rpc.error.message)
      }
      return await buyLegacy(userId, key, price)
    } catch (e) {
      actionError.value = t('cust_buy_error') + friendlyError(e, 'save')
      return false
    } finally {
      busyKey.value = null
    }
  }

  // Прежний путь до миграции 060: сначала открываем предмет, потом списываем баллы (строка выкупленного товара в магазине). Не списалось — откатываем открытие.
  async function buyLegacy(userId: string, key: string, price: number): Promise<boolean> {
    try {
      const ins = await sb.from('user_customizations').insert({ user_id: userId, item_key: key, source: 'points' })
      if (ins.error) throw new Error(ins.error.message)
      const spend = await sb.from('shop_items').insert({
        user_id: userId,
        name: `${t('cust_shop_prefix')} ${t(('cust_item_' + key) as never)}`,
        cost: price,
        redeemed: true,
        redeemed_date: fmtDate(new Date()),
      })
      if (spend.error) {
        await sb.from('user_customizations').delete().eq('user_id', userId).eq('item_key', key)
        throw new Error(spend.error.message)
      }
      unlocked.value = { ...unlocked.value, [key]: { source: 'points', unlockedAt: new Date().toISOString() } }
      balance.value = balance.value == null ? null : Math.round((balance.value - price) * 10) / 10
      return true
    } catch (e) {
      actionError.value = t('cust_buy_error') + friendlyError(e, 'save')
      return false
    }
  }

  // Надеть (key) или снять (null) предмет категории. Пишем весь объект выбора в profiles.customization.
  async function choose(category: Category, key: string | null): Promise<boolean> {
    actionError.value = null
    if (auth.value.status !== 'ready' || apiMissing.value || busyKey.value) return false
    const next = nextSelected(selected.value, category, key, unlocked.value)
    if (key !== null && next[category] !== key) return false
    busyKey.value = key ?? category
    try {
      const { error: err } = await sb.from('profiles').update({ customization: next }).eq('user_id', auth.value.userId)
      if (err) throw new Error(err.message)
      selected.value = next
      notifyCustomizationChanged({ avatar_frame: next.avatar_frame ?? null }) // 9:41: левое меню и Дашборд меняют рамку без обновления
      writeCachedCollapseStyle(parseCollapseStyle(next.collapse_style)) // вид сворачивания: страницы применяют его по кэшу, не дожидаясь сети (BACKLOG 498)
      return true
    } catch (e) {
      actionError.value = t('cust_select_error') + friendlyError(e, 'save')
      return false
    } finally {
      busyKey.value = null
    }
  }

  return { auth, unlocked, selected, balance, achievements, apiMissing, loading, error, actionError, busyKey, state, statusOf, init, buy, choose }
}
