import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { sb } from './supabase'
import { onCustomizationChanged } from './customizationEvents'
import { frameRing } from './frameRing'

// Ключ выбранной рамки аватарки (profiles.customization.avatar_frame, миграция 048) для кольца прогресса дня (BACKLOG 43, 9:40).
// Читается ОТДЕЛЬНЫМ запросом: нет колонки / сбой сети — просто без рамки, профиль не страдает. Меняется сразу, когда рамку
// надели или сняли на странице «Кастомизация» (9:41), без обновления страницы.
export function useAvatarFrame() {
  const frame = ref<string | null>(null)

  async function load(userId: string) {
    const { data, error } = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
    if (error) return
    const cz = (data as { customization?: Record<string, unknown> | null } | null)?.customization
    const key = cz && typeof cz.avatar_frame === 'string' ? cz.avatar_frame : null
    frame.value = frameRing(key) ? key : null
  }
  const off = onCustomizationChanged((d) => {
    frame.value = frameRing(d.avatar_frame) ? d.avatar_frame : null
  })
  if (getCurrentScope()) onScopeDispose(off)

  return { frame, load }
}
