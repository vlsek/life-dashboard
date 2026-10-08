import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { t } from './i18n'
import { effectiveForm, buildInsertRow, buildUpdateRow, canLinkExercise, categoryKeyFor, nextPosition } from './metricsManager'
import type { MetricFormValues } from './metricsManager'
import { confirmDialog } from './confirmDialog'
import type { Metric } from './types'
import { friendlyError } from './friendlyError'

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
  const exercises = ref<{ id: string; name: string }[]>([]) // упражнения «Тренировок» для связи с метрикой (миграция 054)
  const error = ref<string | null>(null)
  let userId = ''

  async function load(uid: string) {
    userId = uid
    const [mRes, cRes, eRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', uid).eq('active', true).order('position'),
      sb.from('metric_categories').select('*').order('label_ru'),
      sb.from('workout_exercises').select('id, name').eq('user_id', uid).order('name'),
    ])
    if (mRes.error) {
      error.value = friendlyError(mRes.error, 'load')
      return
    }
    error.value = null
    metrics.value = (mRes.data || []) as Metric[]
    categories.value = (cRes.data || []) as MetricCategory[]
    exercises.value = ((eRes && eRes.data) || []) as { id: string; name: string }[] // нет упражнений/ошибка — просто пустой список, метрики это не ломает
  }

  // Подсказка про миграции — портировано из showMetricSaveError().
  // Текст ошибки сохранения: понятная фраза + (если ошибка про отсутствующую колонку) подсказка про миграцию. Сырое сообщение Supabase не показываем.
  function saveErrorText(err: { message?: unknown }): string {
    const message = String(err?.message ?? '')
    const hint = /schedule/i.test(message) ? ' — ' + t('dash_schedule_migration_hint')
      : /streak_import/i.test(message) ? ' — ' + t('dash_streak_import_migration_hint')
      : /count_streak/i.test(message) ? ' — ' + t('dash_count_streak_migration_hint')
      : /planned_sets/i.test(message) ? ' — ' + t('dash_planned_sets_migration_hint')
      : /ask_note/i.test(message) ? ' — ' + t('dash_ask_note_migration_hint')
      : /source_exercise/i.test(message) ? ' — ' + t('dash_exercise_link_migration_hint') : ''
    return friendlyError(err) + hint
  }

  // '__new__' → создать категорию с названием из поля формы (раньше — системный prompt(), BACKLOG 573). Пустое название — без категории;
  // не получилось создать — метрику НЕ сохраняем и показываем ошибку (раньше alert() и метрика молча сохранялась без категории).
  async function resolveCategoryId(raw: string, newLabel: string): Promise<{ ok: boolean; id: string | null }> {
    if (!raw) return { ok: true, id: null }
    if (raw !== '__new__') return { ok: true, id: raw }
    const label = newLabel.trim()
    if (!label) return { ok: true, id: null }
    const { data, error: err } = await sb
      .from('metric_categories')
      .insert({ key: categoryKeyFor(label), label_en: label, label_ru: label, created_by: userId })
      .select()
      .single()
    if (err) {
      error.value = t('dash_category_create_error') + friendlyError(err)
      return { ok: false, id: null }
    }
    return { ok: true, id: (data as MetricCategory).id }
  }

  async function addMetric(form: MetricFormValues): Promise<boolean> {
    const cat = await resolveCategoryId(form.categoryId, form.newCategory)
    if (!cat.ok) return false
    const categoryId = cat.id
    const position = nextPosition(metrics.value)
    // Связь с упражнением «Тренировок» (BACKLOG 19, срез 2; миграция 054): существующее упражнение или новое — оно создаётся первым, до метрики
    let exerciseId: string | null = null
    if (canLinkExercise(form) && form.exerciseLink) {
      if (form.exerciseLink === '__new__') {
        const { data: ex, error: exErr } = await sb
          .from('workout_exercises')
          .insert({ user_id: userId, name: form.name.trim(), category: null, unit: 'кг', tracks_weight: false, value_label: 'Повторения' })
          .select('id')
          .single()
        if (exErr || !ex) {
          error.value = friendlyError(exErr, 'save')
          return false
        }
        exerciseId = (ex as { id: string }).id
      } else exerciseId = form.exerciseLink
    }
    const { error: err } = await sb.from('metrics').insert(buildInsertRow(form, userId, position, categoryId, exerciseId))
    if (err) {
      error.value = saveErrorText(err)
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
    const cat = await resolveCategoryId(form.categoryId, form.newCategory)
    if (!cat.ok) return false
    const categoryId = cat.id
    const { error: err } = await sb.from('metrics').update(buildUpdateRow(form, existing, categoryId)).eq('id', existing.id)
    if (err) {
      error.value = saveErrorText(err)
      return false
    }
    error.value = null
    await load(userId)
    onChanged?.()
    return true
  }

  async function deleteMetric(m: Metric): Promise<boolean> {
    if (!(await confirmDialog(t('dash_delete_metric_confirm').replace('{name}', m.name)))) return false
    const { error: err } = await sb.from('metrics').delete().eq('id', m.id)
    if (err) {
      error.value = friendlyError(err, 'delete')
      return false
    }
    error.value = null
    await load(userId)
    onChanged?.()
    return true
  }

  return { metrics, categories, exercises, error, load, addMetric, editMetric, deleteMetric }
}
