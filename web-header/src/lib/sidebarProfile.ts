import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { sb } from './supabase'
import { frameShadow } from './customFrame'
import { googleProfile } from './googleProfile'
import { onCustomizationChanged } from './customizationEvents'

// Данные для блока профиля в левом меню (BACKLOG 6.2): имя и аватар из profiles. Почта приходит из сессии (App.vue).
// Любая ошибка (нет колонки/сети) — просто остаёмся без имени и аватара: блок покажет почту и букву.
export function useSidebarProfile() {
  const displayName = ref<string | null>(null)
  const avatarUrl = ref<string | null>(null)
  const avatarFrame = ref<string | null>(null) // ключ выбранной рамки (BACKLOG 491, миграция 048); нет колонки/ошибка — без рамки

  // BACKLOG 43 / 9:41: надели/сняли рамку на странице «Кастомизация» (или в соседней вкладке) — рамка в левом меню меняется сразу, без обновления.
  const off = onCustomizationChanged((d) => {
    avatarFrame.value = d.avatar_frame && frameShadow(d.avatar_frame) ? d.avatar_frame : null
  })
  if (getCurrentScope()) onScopeDispose(off)

  async function load(userId: string, authUser?: { user_metadata?: Record<string, unknown> | null } | null) {
    const { data, error } = await sb.from('profiles').select('display_name, avatar_url').eq('user_id', userId).maybeSingle()
    if (error) return
    const row = data as { display_name?: string | null; avatar_url?: string | null } | null
    displayName.value = row?.display_name?.trim() || null
    avatarUrl.value = row?.avatar_url || null
    await fillFromGoogle(userId, authUser)
    // выбранная рамка — ОТДЕЛЬНЫМ запросом: если миграция 048 не применена, имя и аватар выше всё равно покажутся
    const fr = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
    const cz = (fr.error ? null : (fr.data as { customization?: Record<string, unknown> | null } | null)?.customization) || null
    const key = cz && typeof cz.avatar_frame === 'string' ? cz.avatar_frame : null
    avatarFrame.value = key && frameShadow(key) ? key : null
  }

  // Имя профиля обязательно (BACKLOG 841), при входе через Google подставляется из аккаунта (BACKLOG 766): у УЖЕ зарегистрированных с пустым
  // именем один раз берём имя (и аватарку, только если своей нет) из user_metadata. Своё имя не трогаем — только пустое. Сбой записи — молча.
  async function fillFromGoogle(userId: string, authUser?: { user_metadata?: Record<string, unknown> | null } | null) {
    if (displayName.value) return
    const g = googleProfile(authUser)
    if (!g.name) return
    const patch: { user_id: string; display_name: string; avatar_url?: string } = { user_id: userId, display_name: g.name }
    if (!avatarUrl.value && g.avatar) patch.avatar_url = g.avatar
    const { error } = await sb.from('profiles').upsert(patch)
    if (error) return
    displayName.value = g.name
    if (patch.avatar_url) avatarUrl.value = patch.avatar_url
  }

  return { displayName, avatarUrl, avatarFrame, load }
}

// Подпись и буква для аватара без картинки: имя → иначе часть почты до «@»
export function profileLabel(displayName: string | null, email: string | null): { name: string; initial: string } {
  const name = displayName || (email ? email.split('@')[0] : '') || ''
  const initial = (name.trim()[0] || '?').toUpperCase()
  return { name, initial }
}
