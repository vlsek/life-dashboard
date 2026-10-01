import { computed, ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { t } from './i18n'
import { fetchAllRows } from './fetchAll'
import { BODY_PARAMS_CHANGED, BODY_VALUES_CHANGED } from './useCharts'
import { calcBalance, type BalanceMetric, type BalanceValueRow } from './balance'
import { withWaterGoal } from './waterGoal'
import { avatarPath, paramStats, validateBirthdate, type BodyParam, type BodyParamForm, type BodyValue, type ProfileRow } from './profile'

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
    if (e) error.value = e.message
    profile.value = (data as ProfileRow | null) ?? { avatar_url: null, birthdate: null, goal_type: null }
  }

  async function loadParams() {
    const { data, error: e } = await sb.from('body_parameters').select('id, name, icon, unit, position').eq('user_id', userId).eq('active', true).order('position')
    if (e) error.value = e.message
    params.value = (data || []) as BodyParam[]
  }

  async function loadValues() {
    const res = await fetchAllRows<BodyValue>((from, to) =>
      sb.from('body_parameter_values').select('parameter_id, date, value').eq('user_id', userId).order('date', { ascending: true }).order('parameter_id').range(from, to),
    )
    if (res.error) error.value = res.error
    values.value = res.rows
  }

  // Баланс: те же 6 источников, что у дашборда и магазина; daily_values читается постранично.
  async function loadBalance() {
    const [metricsRes, valuesRes, goalsRes, skillsRes, booksRes, redeemedRes] = await Promise.all([
      sb.from('metrics').select('id, name, icon, type, goal_value, goal_direction, position').eq('user_id', userId).eq('active', true),
      fetchAllRows<BalanceValueRow>((from, to) => sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).order('date').order('metric_id').range(from, to)),
      sb.from('goals').select('points').eq('user_id', userId).eq('done', true),
      sb.from('skills').select('points').eq('user_id', userId).eq('mastered', true),
      sb.from('books').select('points').eq('user_id', userId).eq('status', 'done'),
      sb.from('shop_items').select('cost').eq('user_id', userId).eq('redeemed', true),
    ])
    const err = metricsRes.error?.message || valuesRes.error || goalsRes.error?.message || skillsRes.error?.message || booksRes.error?.message || redeemedRes.error?.message
    if (err) {
      error.value = err
      return
    }
    balance.value = calcBalance(
      // вода — по эффективной норме, а не по пустому goal_value (migrations/033)
      await withWaterGoal(userId, (metricsRes.data || []) as (BalanceMetric & { name?: string | null; icon?: string | null; position?: number | null })[]),
      valuesRes.rows,
      goalsRes.data || [],
      skillsRes.data || [],
      booksRes.data || [],
      (redeemedRes.data || []).map((r: { cost: number | null }) => r.cost),
    ).balance
  }

  async function init(uid: string) {
    userId = uid
    error.value = null
    await Promise.all([loadProfileRow(), loadParams(), loadValues(), loadBalance()])
    loaded.value = true
  }

  async function uploadAvatar(file: File): Promise<boolean> {
    const path = avatarPath(userId, file.name)
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) {
      error.value = t('dash_avatar_upload_error') + upErr.message
      return false
    }
    const { data } = sb.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now() // ломаем кэш браузера при замене фото
    const { error: e } = await sb.from('profiles').upsert({ user_id: userId, avatar_url: url })
    if (e) {
      error.value = t('dash_save_error_generic') + e.message
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
    if (e) return t('dash_save_error_generic') + e.message
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
    if (e) return t('dash_save_error_generic') + e.message
    await loadParams()
    notifyParams()
    return null
  }

  async function updateParam(id: string, form: BodyParamForm): Promise<string | null> {
    if (!form.name.trim()) return null
    const { error: e } = await sb.from('body_parameters').update({ name: form.name.trim(), icon: form.icon || 'svg:ruler', unit: form.unit }).eq('id', id)
    if (e) return t('dash_save_error_generic') + e.message
    await loadParams()
    notifyParams()
    return null
  }

  async function deleteParam(id: string): Promise<string | null> {
    const { error: e } = await sb.from('body_parameters').delete().eq('id', id)
    if (e) return t('dash_delete_error_generic') + e.message
    await Promise.all([loadParams(), loadValues()])
    notifyParams()
    return null
  }

  // Запись значения параметра за дату (upsert по user/date/parameter) — понадобится блоку
  // «дневные метрики» (ввод параметров тела в дне); после записи профиль показывает свежую цифру.
  async function saveBodyValue(parameterId: string, date: string, value: number): Promise<string | null> {
    const { error: e } = await sb.from('body_parameter_values').upsert({ user_id: userId, date, parameter_id: parameterId, value }, { onConflict: 'user_id,date,parameter_id' })
    if (e) return t('dash_save_error_generic') + e.message
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

  return { profile, params, values, stats, balance, loaded, error, init, uploadAvatar, saveBirthdate, addParam, updateParam, deleteParam, saveBodyValue, refreshValues }
}
