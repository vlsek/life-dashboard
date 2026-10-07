import { ref } from 'vue'
import { sb } from './supabase'
import { friendlyError } from './friendlyError'
import { defaultLayout, normalizeLayout, type LayoutItem } from './layout'

// Отдельный composable (как useReminders/useEveningReminder): свой лёгкий запрос profiles.dashboard_layout,
// не часть useDashboard.ts. Если колонки нет (миграция 015 не применена) или запрос упал — работаем с
// раскладкой по умолчанию, страница не ломается. Сохранение — upsert по user_id, как в классике.
export function useLayout() {
  const layout = ref<LayoutItem[]>(defaultLayout())
  const saveError = ref('')
  const loaded = ref(false)

  async function load(userId: string) {
    const { data, error } = await sb.from('profiles').select('dashboard_layout').eq('user_id', userId).maybeSingle()
    layout.value = error ? defaultLayout() : normalizeLayout(data?.dashboard_layout)
    loaded.value = true
  }

  async function save(userId: string, next: LayoutItem[]): Promise<boolean> {
    saveError.value = ''
    const { error } = await sb.from('profiles').upsert({ user_id: userId, dashboard_layout: next })
    if (error) {
      saveError.value = friendlyError(error, 'save')
      return false
    }
    layout.value = next
    return true
  }

  return { layout, loaded, saveError, load, save }
}
