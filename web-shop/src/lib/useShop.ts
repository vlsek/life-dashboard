import { ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { todayStr } from './date'
import { calcTotalPoints, calcBalanceFromTotals } from './points'
import type { DailyValue, GoalRow, SkillRow, BookRow, Metric, ShopItem, ShopItemFormInput } from './types'
import { withWaterGoal } from './waterGoal'
import { prepareImage, safeExt } from './imageResize'
import { errorKind, friendlyError } from './friendlyError'

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
  const balance = ref<{ total: number; spent: number; bonus?: number; balance: number } | null>(null)
  const error = ref<string | null>(null)

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

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await Promise.all([loadBalance(userId), loadItems(userId)])
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
    items.value = (data || []) as ShopItem[]
  }

  async function reload() {
    if (auth.value.status !== 'ready') return
    await Promise.all([loadBalance(auth.value.userId), loadItems(auth.value.userId)])
  }

  async function addItem(userId: string, res: ShopItemFormInput) {
    const { error: err } = await sb.from('shop_items').insert({ user_id: userId, name: res.name.trim(), link: res.link.trim() || null, cost: res.cost || 100, image_url: res.image_url, redeemed: false })
    if (err) throw err
    await reload()
  }

  async function updateItem(id: string, res: ShopItemFormInput) {
    const { error: err } = await sb.from('shop_items').update({ name: res.name.trim(), link: res.link.trim() || null, cost: res.cost || 100, image_url: res.image_url }).eq('id', id)
    if (err) throw err
    await reload()
  }

  async function buyItem(id: string) {
    const { error: err } = await sb.from('shop_items').update({ redeemed: true, redeemed_date: todayStr() }).eq('id', id)
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

  return { auth, items, balance, error, init, addItem, updateItem, buyItem, deleteItem, uploadImage }
}
