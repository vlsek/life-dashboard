import { ref } from 'vue'
import { sb } from './supabase'

// Данные для блока профиля в левом меню (BACKLOG 6.2): имя и аватар из profiles. Почта приходит из сессии (App.vue).
// Любая ошибка (нет колонки/сети) — просто остаёмся без имени и аватара: блок покажет почту и букву.
export function useSidebarProfile() {
  const displayName = ref<string | null>(null)
  const avatarUrl = ref<string | null>(null)

  async function load(userId: string) {
    const { data, error } = await sb.from('profiles').select('display_name, avatar_url').eq('user_id', userId).maybeSingle()
    if (error) return
    const row = data as { display_name?: string | null; avatar_url?: string | null } | null
    displayName.value = row?.display_name?.trim() || null
    avatarUrl.value = row?.avatar_url || null
  }

  return { displayName, avatarUrl, load }
}

// Подпись и буква для аватара без картинки: имя → иначе часть почты до «@»
export function profileLabel(displayName: string | null, email: string | null): { name: string; initial: string } {
  const name = displayName || (email ? email.split('@')[0] : '') || ''
  const initial = (name.trim()[0] || '?').toUpperCase()
  return { name, initial }
}
