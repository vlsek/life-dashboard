import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { t } from './i18n'
import { effectiveForm, buildInsertRow, buildUpdateRow, categoryKeyFor, nextPosition } from './metricsManager'
import type { MetricFormValues } from './metricsManager'
import type { Metric } from './types'

export interface MetricCategory {
  id: string
  label_ru: string
  label_en: string
}

// Отдельный композабл блока «Управление метриками» — не трогает useDashboard.ts (см. ROADMAP.md).
// После любого изменения зовёт onChanged, чтобы родитель мог перечитать данные дашборда.
export function useMetricsManager(onChanged?: () => void) {
  const metrics = ref<Metric[]>([])
  const categories = ref<MetricCategory[]>([])
  const error = ref<string | null>(null)
  let userId = ''

  async function load(uid: string) {
    userId = uid
    const [mRes, cRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', uid).eq('active', true).order('position'),
      sb.from('metric_categories').select('*').order('label_ru'),
    ])
    if (mRes.error) {
      error.value = mRes.error.message
      return
    }
    error.value = null
    metrics.value = (mRes.data || []) as Metric[]
    categories.value = (cRes.data || []) as MetricCategory[]
  }

  // Подсказка про миграции — портировано из showMetricSaveError().
  function saveErrorText(message: string): string {
    const hint = /schedule/i.test(message) ? ' — ' + t('dash_schedule_migration_hint')
      : /streak_import/i.test(message) ? ' — ' + t('dash_streak_import_migration_hint')
      : /count_streak/i.test(message) ? ' — ' + t('dash_count_streak_migration_hint') : ''
    return t('dash_save_error_generic') + message + hint
  }

  // '__new__' → спросить название и создать категорию (портировано из resolveCategoryId()).
  async function resolveCategoryId(raw: string): Promise<string | null> {
    if (!raw) return null
    if (raw !== '__new__') return raw
    const label = window.prompt(t('dash_new_category_prompt'))
    if (!label?.trim()) return null
    const { data, error: err } = await sb
      .from('metric_categories')
      .insert({ key: categoryKeyFor(label), label_en: label.trim(), label_ru: label.trim(), created_by: userId })
      .select()
      .single()
    if (err) {
      alert(t('dash_category_create_error') + err.message)
      return null
    }
    return (data as MetricCategory).id
  }

  async function addMetric(form: MetricFormValues): Promise<boolean> {
    const categoryId = await resolveCategoryId(form.categoryId)
    const position = nextPosition(metrics.value)
    const { error: err } = await sb.from('metrics').insert(buildInsertRow(form, userId, position, categoryId))
    if (err) {
      error.value = saveErrorText(err.message)
      return false
    }
    // Импорт стрика для новой метрики — отдельным update (до insert колонок ещё не видно)
    const importRaw = effectiveForm(form).streakImportDays // в режиме «просто значение» импорта серии нет
    const days = importRaw === '' ? 0 : parseInt(importRaw, 10) || 0
    if (days > 0) {
      const { data: created } = await sb
        .from('metrics')
        .select('id, streak_import_days')
        .eq('user_id', userId)
        .eq('name', form.name.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (created && 'streak_import_days' in created) {
        await sb.from('metrics').update({ streak_import_days: days, streak_import_date: todayStr() }).eq('id', created.id)
      }
    }
    error.value = null
    await load(userId)
    onChanged?.()
    return true
  }

  async function editMetric(existing: Metric, form: MetricFormValues): Promise<boolean> {
    const categoryId = await resolveCategoryId(form.categoryId)
    const { error: err } = await sb.from('metrics').update(buildUpdateRow(form, existing, categoryId)).eq('id', existing.id)
    if (err) {
      error.value = saveErrorText(err.message)
      return false
    }
    error.value = null
    await load(userId)
    onChanged?.()
    return true
  }

  async function deleteMetric(m: Metric): Promise<boolean> {
    if (!confirm(t('dash_delete_metric_confirm').replace('{name}', m.name))) return false
    const { error: err } = await sb.from('metrics').delete().eq('id', m.id)
    if (err) {
      error.value = t('dash_delete_error_generic') + err.message
      return false
    }
    error.value = null
    await load(userId)
    onChanged?.()
    return true
  }

  return { metrics, categories, error, load, addMetric, editMetric, deleteMetric }
}
