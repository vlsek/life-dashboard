import { ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { todayStr } from './date'
import { calcTotalPoints, calcBalanceFromTotals } from './points'
import type { DailyValue, GoalRow, SkillRow, BookRow, Metric, ShopItem, ShopItemFormInput } from './types'
import { withWaterGoal } from './waterGoal'
import { prepareImage, safeExt } from './imageResize'
import { errorKind, friendlyError } from './friendlyError'
import { isCustomizationPurchase } from './customizationPurchase'
import { DEFAULT_RUB_PER_SPARK, DEFAULT_SPARKS_COST, coinsToSparksSuggestion, parseSparksRow, purchaseErrorKey, rubPerSpark, sparksMode } from './sparks'
import { t } from './i18n'
import { goalRewardErrorText, rewardState, type GoalLite } from './goalReward'

// Пауза перед повторной попыткой загрузки фото при сетевом сбое (мс).
export const UPLOAD_RETRY_MS = 800

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в остальных пилотах — портировано
// из requireAuth()/requireOnboarded() в config.js.
export function useShop() {
  const auth = ref<AuthState>({ status: 'loading' })
  const items = ref<ShopItem[]>([])
  // старые вещи с ценой в монетах, ещё не купленные (миграция 057 архивирует их, не удаляет) — можно перенести в огоньки
  const archived = ref<ShopItem[]>([])
  const balance = ref<{ total: number; spent: number; bonus?: number; balance: number } | null>(null)
  const error = ref<string | null>(null)
  const loaded = ref(false) // первая загрузка закончилась (успехом или ошибкой): до этого «пока ничего нет» показывать нельзя — это ложная пустота
  const goals = ref<GoalLite[]>([]) // цели человека — для «награды за цель» (миграция 111); нет доступа/ошибка — пустой список, магазин работает как раньше
  const createdAt = ref<string | null>(null) // дата регистрации — для «справедливой цены» по среднему заработку (58.4)

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null
    createdAt.value = session.user.created_at ?? null

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    // Режим огоньков: миграция 057 применена, если работает sync_streak_sparks() (она же начисляет и возвращает баланс). Иначе — монеты, как раньше.
    sparksMode.value = await syncSparks()
    if (sparksMode.value) await loadRubRate()
    try {
      await loadGoals(userId)
      await Promise.all([sparksMode.value ? Promise.resolve() : loadBalance(userId), loadItems(userId)])
    } finally {
      loaded.value = true
    }
  }

  async function loadGoals(userId: string) {
    try {
      // Миграция 111 ещё не применена (нет колонки shop_items.goal_id) — награды за цель недоступны: список целей пуст, переключатель «За цель» не показывается
      const probe = await sb.from('shop_items').select('goal_id').limit(1)
      if (probe.error) {
        goals.value = []
        return
      }
      const { data, error: err } = await sb.from('goals').select('id, name, stages, current_stage, done').eq('user_id', userId)
      goals.value = err ? [] : ((data || []) as GoalLite[])
    } catch {
      goals.value = []
    }
  }

  // Награда за цель: добавляем к строке вид награды (статус и прогресс цели). Полученная награда помнит название цели (reward_goal_name).
  function withReward(it: ShopItem): ShopItem {
    if (!it.goal_id && !it.reward_goal_name) return it
    const st = rewardState(it, goals.value)
    if (st.status === 'claimed') return { ...it, cost: 0, reward: { status: 'claimed', goalName: it.reward_goal_name ?? null, progress: null } }
    if (st.status === 'in_progress' || st.status === 'ready') return { ...it, cost: 0, reward: { status: st.status, goalName: st.goal?.name ?? null, progress: st.progress } }
    return it // цель не нашлась в списке — как обычная вещь (в магазине огоньков уйдёт в архив «задать цену»)
  }

  // Начислить огоньки за сделанное (сегодня и вчера) и получить баланс — одним вызовом.
  async function syncSparks(): Promise<boolean> {
    try {
      const { data, error: err } = await sb.rpc('sync_streak_sparks')
      if (err) return false
      const row = parseSparksRow(data)
      if (!row) return false
      balance.value = { total: row.total, spent: row.spent, balance: row.balance }
      return true
    } catch {
      return false
    }
  }

  // Подсказка курса для калькулятора цены (sparks_config.rub_per_spark); нет таблицы/ошибка — значение по умолчанию.
  async function loadRubRate() {
    try {
      const { data, error: err } = await sb.from('sparks_config').select('num').eq('key', 'rub_per_spark').maybeSingle()
      const n = Number((data as { num?: unknown } | null)?.num)
      rubPerSpark.value = !err && Number.isFinite(n) && n > 0 ? n : DEFAULT_RUB_PER_SPARK
    } catch {
      rubPerSpark.value = DEFAULT_RUB_PER_SPARK
    }
  }

  // Портировано из calcTotalPoints()/calcBalance() в config.js — 5 запросов, как в
  // оригинале (дашборд и магазин считают баланс совершенно одинаково).
  async function loadBalance(userId: string) {
    const [metricsRes, valuesRes, goalsRes, skillsRes, booksRes, redeemedRes, bonusRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true),
      // постранично: Supabase отдаёт максимум 1000 строк за запрос, иначе баланс считался бы по обрезанной истории
      fetchAllRows<DailyValue>((from, to) => sb.from('daily_values').select('*').eq('user_id', userId).order('date').order('metric_id').range(from, to)),
      sb.from('goals').select('*').eq('user_id', userId).eq('done', true),
      sb.from('skills').select('*').eq('user_id', userId).eq('mastered', true),
      sb.from('books').select('*').eq('user_id', userId).eq('status', 'done'),
      sb.from('shop_items').select('cost').eq('user_id', userId).eq('redeemed', true),
      // Бонусные монеты за достижения (миграция 051). Нет таблицы / ошибка запроса — бонус 0, баланс не ломаем.
      sb.from('achievement_bonuses').select('coins').eq('user_id', userId),
    ])
    const err = metricsRes.error?.message || valuesRes.error || goalsRes.error?.message || skillsRes.error?.message || booksRes.error?.message || redeemedRes.error?.message
    if (err) {
      error.value = err
      return
    }
    const total = calcTotalPoints(
      // вода — по эффективной норме, а не по пустому goal_value (migrations/033)
      await withWaterGoal(userId, (metricsRes.data || []) as Metric[]),
      valuesRes.rows,
      (goalsRes.data || []) as GoalRow[],
      (skillsRes.data || []) as SkillRow[],
      (booksRes.data || []) as BookRow[],
    )
    balance.value = calcBalanceFromTotals(
      total,
      (redeemedRes.data || []).map((r) => r.cost),
      bonusRes?.error ? [] : ((bonusRes?.data || []) as { coins: number | string | null }[]).map((r) => (r.coins == null ? null : Number(r.coins))),
    )
  }

  async function loadItems(userId: string) {
    const { data, error: err } = await sb.from('shop_items').select('*').eq('user_id', userId).order('cost')
    if (err) {
      error.value = friendlyError(err, 'load')
      return
    }
    // покупки «Кастомизации» лежат в той же таблице — в списке магазина их не показываем (баланс их учитывает отдельно, в loadBalance)
    const rows = ((data || []) as ShopItem[]).filter((it) => !isCustomizationPurchase(it.name)).map(withReward)
    if (!sparksMode.value) {
      items.value = rows
      archived.value = []
      return
    }
    // Режим огоньков: вещи за огоньки показываем с ценой в огоньках (`cost` ← `cost_sparks`), чтобы карточки, фильтры и копилка работали как есть;
    // купленное раньше за монеты — историей с иконкой монеты; невыкупленное за монеты — в архив.
    const view: ShopItem[] = []
    const old: ShopItem[] = []
    for (const it of rows) {
      if (it.reward) view.push(it) // награда за цель: цены нет, в «историю монет» и в архив не попадает
      else if (it.cost_sparks != null) view.push({ ...it, cost: it.cost_sparks })
      else if (it.redeemed) view.push({ ...it, legacy_coins: true })
      else old.push(it)
    }
    items.value = view.sort((a, b) => a.cost - b.cost)
    archived.value = old
  }

  async function reload() {
    if (auth.value.status !== 'ready') return
    if (error.value) loaded.value = false // повтор после ошибки: пока грузим заново, снова «Загрузка…», а не «пока ничего нет»
    error.value = null // повтор после ошибки загрузки («Повторить»): старое сообщение уходит, новое появится, только если опять не вышло
    try {
      if (sparksMode.value) {
        await Promise.all([syncSparks(), loadGoals(auth.value.userId), loadItems(auth.value.userId)])
        return
      }
      await Promise.all([loadBalance(auth.value.userId), loadGoals(auth.value.userId), loadItems(auth.value.userId)])
    } finally {
      loaded.value = true
    }
  }

  async function addItem(userId: string, res: ShopItemFormInput) {
    const base = { user_id: userId, name: res.name.trim(), link: res.link.trim() || null, image_url: res.image_url, redeemed: false }
    // в режиме огоньков цена хранится в cost_sparks, а cost = 0 — расчёт монет на других страницах не затрагивается
    const row = res.goal_id ? { ...base, cost: 0, cost_sparks: null, goal_id: res.goal_id } : sparksMode.value ? { ...base, cost: 0, cost_sparks: res.cost > 0 ? Math.round(res.cost) : DEFAULT_SPARKS_COST } : { ...base, cost: res.cost || 100 }
    const { error: err } = await sb.from('shop_items').insert(row)
    if (err) throw new Error(goalRewardErrorText(err) ?? friendlyError(err, 'save'), { cause: err })
    await reload()
  }

  async function updateItem(id: string, res: ShopItemFormInput) {
    const base = { name: res.name.trim(), link: res.link.trim() || null, image_url: res.image_url }
    // переключатель «За огоньки / За цель»: при «За цель» цена снимается, при возврате «за огоньки» привязка к цели снимается (goal_id = null)
    const row = res.goal_id ? { ...base, cost: 0, cost_sparks: null, goal_id: res.goal_id } : sparksMode.value ? { ...base, cost: 0, cost_sparks: res.cost > 0 ? Math.round(res.cost) : DEFAULT_SPARKS_COST, goal_id: null } : { ...base, cost: res.cost || 100, goal_id: null }
    const { error: err } = await sb.from('shop_items').update(row).eq('id', id)
    if (err) throw new Error(goalRewardErrorText(err) ?? friendlyError(err, 'save'), { cause: err })
    await reload()
  }

  async function buyItem(id: string) {
    const { error: err } = await sb.from('shop_items').update({ redeemed: true, redeemed_date: todayStr() }).eq('id', id)
    if (err) {
      // защита в БД (миграция 057): нельзя потратить больше огоньков, чем накоплено — показываем понятный текст, а не код ошибки
      const key = purchaseErrorKey(err)
      if (key) {
        await reload()
        throw new Error(t(key))
      }
      throw err
    }
    await reload()
  }

  // «Получить награду» (миграция 111): серверная функция сама проверяет, что цель выполнена; понятные тексты на коды GR001–GR006
  async function claimReward(id: string) {
    const { error: err } = await sb.rpc('claim_goal_reward', { p_item_id: id, p_date: todayStr() })
    if (err) {
      await reload()
      throw new Error(goalRewardErrorText(err) ?? friendlyError(err, 'save'), { cause: err })
    }
    await reload()
  }

  // Перенос старой вещи из архива (цена была в монетах) в огоньки: новая цена, архив снимается. Старые вещи НЕ удаляются (решение владельца).
  async function transferArchived(id: string, sparksCost: number) {
    const price = Math.max(1, Math.round(sparksCost || coinsToSparksSuggestion(archived.value.find((a) => a.id === id)?.cost ?? 0)))
    const { error: err } = await sb.from('shop_items').update({ cost: 0, cost_sparks: price, archived: false }).eq('id', id)
    if (err) throw err
    await reload()
  }

  async function deleteItem(id: string) {
    const { error: err } = await sb.from('shop_items').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  // Портировано из uploadShopImage() в config.js/shop.js; дальше доработано (BACKLOG раздел 35 🐞 «failed to fetch» при добавлении фото):
  // фото сжимается перед загрузкой (несколько МБ с телефона на мобильной сети обрываются), расширение берётся безопасное (раньше —
  // последний кусок имени файла как есть, с пробелами и кириллицей), при сетевом сбое — одна повторная попытка.
  async function uploadImage(userId: string, file: File): Promise<string | null> {
    const prepared = await prepareImage(file)
    const path = `${userId}/${Date.now()}.${safeExt(prepared.type, prepared.name)}`
    const opts = { contentType: prepared.type || undefined }
    let { error: err } = await sb.storage.from('shop-images').upload(path, prepared, opts)
    if (err && errorKind(err) === 'network') {
      await new Promise((r) => setTimeout(r, UPLOAD_RETRY_MS))
      // первая попытка могла дойти частично — перезаписываем тот же путь
      ;({ error: err } = await sb.storage.from('shop-images').upload(path, prepared, { ...opts, upsert: true }))
    }
    if (err) throw err
    const { data } = sb.storage.from('shop-images').getPublicUrl(path)
    return data.publicUrl
  }

  return { auth, items, archived, balance, goals, loaded, createdAt, error, init, reload, addItem, updateItem, buyItem, claimReward, transferArchived, deleteItem, uploadImage }
}
