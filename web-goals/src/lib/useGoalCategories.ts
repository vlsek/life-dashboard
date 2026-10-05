import { ref } from 'vue'
import { sb } from './supabase'
import { categoryKey, needsSaving } from './categories'

// Сохранённый список своих категорий целей (миграция 050, BACKLOG раздел 35 «Цели: категории должны сохраняться»).
// Безопасен ДО применения миграции: нет таблицы / сбой чтения — список пуст, запись молча отключается, раздел работает как в v3.11
// (список собирается из самих целей), пользователь ничего не видит. Ошибки записи категории не мешают сохранить цель.
export function useGoalCategories() {
  const saved = ref<string[]>([]) // имена в порядке `position`
  let userId = ''
  let available = true // false — таблицы нет или чтение не удалось: ничего не пишем

  async function load(uid: string) {
    userId = uid
    try {
      const { data, error } = await sb.from('goal_categories').select('name').eq('user_id', uid).order('position').order('created_at')
      if (error) {
        available = false
        saved.value = []
        return
      }
      available = true
      saved.value = ((data || []) as { name: string }[]).map((r) => r.name).filter((n) => typeof n === 'string' && n.trim() !== '')
    } catch {
      available = false
      saved.value = []
    }
  }

  // Записать категорию в список, если её там нет. Никогда не бросает.
  async function ensure(name: string, noCategoryLabels: string[] = []) {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!available || !userId || !needsSaving(clean, saved.value, noCategoryLabels)) return
    try {
      const { error } = await sb.from('goal_categories').insert({ user_id: userId, name: clean, position: saved.value.length })
      // 23505 — такая уже есть (другое устройство успело раньше): для списка это то же самое, что успех
      if (!error || (error as { code?: string }).code === '23505') {
        if (!saved.value.some((s) => categoryKey(s) === categoryKey(clean))) saved.value = [...saved.value, clean]
      }
    } catch {
      /* сеть: цель уже сохранена, категория попадёт в список из самих целей */
    }
  }

  return { saved, load, ensure }
}
