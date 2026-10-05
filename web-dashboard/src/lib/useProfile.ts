import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { t } from './i18n'
import { fetchAllRows } from './fetchAll'
import { BODY_PARAMS_CHANGED, BODY_VALUES_CHANGED } from './useCharts'
import { loadBalance as loadBalanceFor } from './loadBalance'
import { DATA_CHANGED } from './events'
import { POINTS_FLOAT, type PointsFloatDetail } from './pointsFloat'
import { avatarPath, paramStats, validateBirthdate, type BodyParam, type BodyParamForm, type BodyValue, type ProfileRow } from './profile'

import { friendlyError } from './friendlyError'
// Отдельный композабл блока «Профиль» (не трогает useDashboard.ts — параллельная работа
// нескольких агентов, см. ROADMAP.md). Портировано из loadProfileInner()/uploadAvatar()/
// add/edit/deleteBodyParameter() в dashboard.js. Вызывать init(userId) после auth 'ready'.
export function useProfile() {
  const profile = ref<ProfileRow | null>(null)
  const params = ref<BodyParam[]>([])
  const values = ref<BodyValue[]>([])
  const balance = ref<number | null>(null)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let userId = ''

  const stats = computed(() => paramStats(params.value, values.value, profile.value?.goal_type ?? null))

  async function loadProfileRow() {
    const { data, error: e } = await sb.from('profiles').select('avatar_url, birthdate, goal_type').eq('user_id', userId).maybeSingle()
    if (e) error.value = friendlyError(e, 'load')
    profile.value = (data as ProfileRow | null) ?? { avatar_url: null, birthdate: null, goal_type: null }
  }

  async function loadParams() {
    const { data, error: e } = await sb.from('body_parameters').select('id, name, icon, unit, position').eq('user_id', userId).eq('active', true).order('position')
    if (e) error.value = friendlyError(e, 'load')
    params.value = (data || []) as BodyParam[]
  }

  async function loadValues() {
    const res = await fetchAllRows<BodyValue>((from, to) =>
      sb.from('body_parameter_values').select('parameter_id, date, value').eq('user_id', userId).order('date', { ascending: true }).order('parameter_id').range(from, to),
    )
    if (res.error) error.value = res.error
    values.value = res.rows
  }

  // Баланс: те же 6 источников, что у дашборда и магазина (lib/loadBalance.ts — общий запрос с виджетом «Коплю на товар»).
  async function loadBalance() {
    const res = await loadBalanceFor(userId)
    if (res.ok) balance.value = res.balance
    else error.value = res.error
  }

  // BACKLOG раздел 35 «Профиль: заработанные монеты — сразу, без обновления страницы». Баланс в блоке «Профиль» раньше считался один раз
  // при загрузке. Теперь: (1) МГНОВЕННО — событие «+N / −N баллов» (то же, что рисует анимацию с монетой) сразу меняет число; дробные
  // баллы считаются в десятых долях, без «0,30000000000000004»; (2) через RECONCILE_MS после последнего изменения данных (DATA_CHANGED —
  // вода, подходы, правка из графика, план) баланс пересчитывается по базе и заменяет «оценку»: ошибка округления или чужая правка не
  // копятся. Устаревший ответ (пришёл после более нового запроса) отбрасывается.
  const RECONCILE_MS = 1200
  let reconcileTimer: ReturnType<typeof setTimeout> | null = null
  let balanceSeq = 0
  let listening = false

  function onPoints(e: Event) {
    const delta = (e as CustomEvent<PointsFloatDetail>).detail?.delta
    if (typeof delta !== 'number' || !Number.isFinite(delta) || balance.value == null) return
    balance.value = Math.round((balance.value + delta) * 10) / 10
  }

  async function reconcile() {
    if (!userId) return
    const seq = ++balanceSeq
    const res = await loadBalanceFor(userId)
    if (seq !== balanceSeq) return // пока шёл запрос, пришёл новый — этот ответ уже устарел
    if (res.ok) balance.value = res.balance
  }

  function onDataChanged() {
    if (reconcileTimer !== null) clearTimeout(reconcileTimer)
    reconcileTimer = setTimeout(() => {
      reconcileTimer = null
      void reconcile()
    }, RECONCILE_MS)
  }

  function stopListening() {
    if (!listening) return
    listening = false
    window.removeEventListener(POINTS_FLOAT, onPoints)
    window.removeEventListener(DATA_CHANGED, onDataChanged)
    if (reconcileTimer !== null) clearTimeout(reconcileTimer)
    reconcileTimer = null
    balanceSeq++ // ответ, который ещё в пути, больше никому не нужен
  }

  function startListening() {
    if (listening) return
    listening = true
    window.addEventListener(POINTS_FLOAT, onPoints)
    window.addEventListener(DATA_CHANGED, onDataChanged)
    if (getCurrentInstance()) onBeforeUnmount(stopListening)
  }

  async function init(uid: string) {
    userId = uid
    error.value = null
    startListening()
    // Блок «Профиль» (аватар, возраст, параметры тела) показываем, как только готовы лёгкие данные: баланс считается по ВСЕЙ
    // истории `daily_values` (постранично) и раньше задерживал весь блок (BACKLOG 6 «Оптимизация блоков»). Монета с баллами
    // у блока и так появляется отдельно (`v-if="balance != null"`). Промис init по-прежнему ждёт и баланс — как и раньше.
    const light = Promise.all([loadProfileRow(), loadParams(), loadValues()]).then(() => {
      loaded.value = true
    })
    await Promise.all([light, loadBalance()])
  }

  async function uploadAvatar(file: File): Promise<boolean> {
    const path = avatarPath(userId, file.name)
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) {
      error.value = friendlyError(upErr, 'upload')
      return false
    }
    const { data } = sb.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now() // ломаем кэш браузера при замене фото
    const { error: e } = await sb.from('profiles').upsert({ user_id: userId, avatar_url: url })
    if (e) {
      error.value = friendlyError(e)
      return false
    }
    await loadProfileRow()
    return true
  }

  // Возвращает текст ошибки валидации/сохранения или null при успехе.
  async function saveBirthdate(value: string): Promise<string | null> {
    const check = validateBirthdate(value, todayStr())
    if (check === 'range') return t('dash_birthdate_range_error')
    const { error: e } = await sb.from('profiles').upsert({ user_id: userId, birthdate: value || null })
    if (e) return friendlyError(e)
    await loadProfileRow()
    return null
  }

  async function addParam(form: BodyParamForm): Promise<string | null> {
    if (!form.name.trim()) return null
    const { error: e } = await sb.from('body_parameters').insert({
      user_id: userId,
      name: form.name.trim(),
      icon: form.icon || 'svg:ruler',
      unit: form.unit,
      position: params.value.length,
      active: true,
    })
    if (e) return friendlyError(e)
    await loadParams()
    notifyParams()
    return null
  }

  async function updateParam(id: string, form: BodyParamForm): Promise<string | null> {
    if (!form.name.trim()) return null
    const { error: e } = await sb.from('body_parameters').update({ name: form.name.trim(), icon: form.icon || 'svg:ruler', unit: form.unit }).eq('id', id)
    if (e) return friendlyError(e)
    await loadParams()
    notifyParams()
    return null
  }

  async function deleteParam(id: string): Promise<string | null> {
    const { error: e } = await sb.from('body_parameters').delete().eq('id', id)
    if (e) return friendlyError(e, 'delete')
    await Promise.all([loadParams(), loadValues()])
    notifyParams()
    return null
  }

  // Запись значения параметра за дату (upsert по user/date/parameter) — понадобится блоку
  // «дневные метрики» (ввод параметров тела в дне); после записи профиль показывает свежую цифру.
  async function saveBodyValue(parameterId: string, date: string, value: number): Promise<string | null> {
    const { error: e } = await sb.from('body_parameter_values').upsert({ user_id: userId, date, parameter_id: parameterId, value }, { onConflict: 'user_id,date,parameter_id' })
    if (e) return friendlyError(e)
    await loadValues()
    window.dispatchEvent(new CustomEvent(BODY_VALUES_CHANGED, { detail: { source: 'profile' } }))
    return null
  }

  // Графики пересобирают серии, когда параметры тела добавлены/изменены/удалены.
  function notifyParams() {
    window.dispatchEvent(new CustomEvent(BODY_PARAMS_CHANGED))
  }

  // Значение изменили снаружи (например, из графика) — перечитать историю параметров тела.
  async function refreshValues() {
    await loadValues()
  }

  return { profile, params, values, stats, balance, loaded, error, init, stopListening, uploadAvatar, saveBirthdate, addParam, updateParam, deleteParam, saveBodyValue, refreshValues }
}
