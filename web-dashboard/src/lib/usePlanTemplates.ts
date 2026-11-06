import { ref } from 'vue'
import { sb } from './supabase'
import { friendlyError } from './friendlyError'
import { MAX_TEMPLATES, toPlanTemplate, type PlanTemplate, type TemplateItem } from './planTemplates'

// Композабл шаблонов дня (BACKLOG 75.12, миграция 115). Нет таблицы (миграция не применена) — список пуст и available = false:
// кнопка и окно просто не показываются, «Планы» работают как раньше (как у повторяющихся пунктов).
export type SaveResult = { ok: true } | { ok: false; reason: 'duplicate' | 'limit' | 'other'; message?: string }

export function usePlanTemplates() {
  const templates = ref<PlanTemplate[]>([])
  const available = ref(false)

  async function load(userId: string) {
    try {
      const { data, error } = await sb.from('plan_templates').select('id, name, items').eq('user_id', userId).order('created_at', { ascending: true })
      if (error) {
        templates.value = []
        available.value = false
        return
      }
      available.value = true
      templates.value = ((data || []) as { id: string; name: string; items: unknown }[]).map(toPlanTemplate).filter((x): x is PlanTemplate => x !== null)
    } catch {
      // сеть оборвалась или клиент вернул что-то неожиданное: функция недоступна, «Планы» работают как раньше (а не необработанная ошибка в консоли)
      templates.value = []
      available.value = false
    }
  }

  // Сохранить новый шаблон. Лимит проверяем сами до запроса (не гоняем лишний), дубль названия и прочее — по коду ответа базы.
  async function save(userId: string, name: string, items: TemplateItem[]): Promise<SaveResult> {
    if (templates.value.length >= MAX_TEMPLATES) return { ok: false, reason: 'limit' }
    const { data, error } = await sb.from('plan_templates').insert({ user_id: userId, name, items }).select('id, name, items').single()
    if (error || !data) {
      const code = (error as { code?: string } | null)?.code
      if (code === '23505') return { ok: false, reason: 'duplicate' }
      if (code === '23514') return { ok: false, reason: 'limit' }
      return { ok: false, reason: 'other', message: friendlyError(error ?? { message: 'no data' }, 'save') }
    }
    const t = toPlanTemplate(data as { id: string; name: string; items: unknown })
    if (t) templates.value = [...templates.value, t]
    return { ok: true }
  }

  // Удалить: из списка убираем сразу, при ошибке возвращаем на место. true — удалено.
  async function remove(id: string): Promise<boolean> {
    const before = templates.value
    templates.value = before.filter((t) => t.id !== id)
    const { error } = await sb.from('plan_templates').delete().eq('id', id)
    if (error) {
      templates.value = before
      return false
    }
    return true
  }

  return { templates, available, load, save, remove }
}
