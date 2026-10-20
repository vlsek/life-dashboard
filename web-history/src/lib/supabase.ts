import { createClient } from '@supabase/supabase-js'
import { patchOfflineSession } from '../../../shared/offline-session/offlineSession'
import { cachingFetch, clearReadCacheOnSignOut, sharedReadStore } from '../../../shared/offline-read/offlineRead'
import { accountCount, finishLogout, readCurrent } from '../../../shared/accounts/accounts'

// Тот же проект и тот же анонимный ключ, что и у остального сайта (config.js). Поскольку
// страница раздаётся с того же домена (life-dashboard.orneryhero.workers.dev/history/),
// supabase-js по умолчанию хранит сессию в localStorage под одним и тем же ключом — вход,
// сделанный на старом сайте, подхватывается здесь без какой-либо доп. синхронизации.
const SUPABASE_URL = 'https://haxmgtflegsfpxieaydv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_jvg_Y0JtOC66Edj1WbAgqg_n0LfjWAF'

export const sb = patchOfflineSession(createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: cachingFetch } }))
clearReadCacheOnSignOut(sb, sharedReadStore) // офлайн-чтение (BACKLOG 66.12): при выходе кэш чтения стирается

export async function logout() {
  // BACKLOG 1081: при нескольких записях «из какой выйти» спрашивает окно шапки; запись одна (или шапки на странице нет) — выходим из текущей, как раньше
  const chooser = (window as unknown as { lifeLogoutChooser?: () => void }).lifeLogoutChooser
  if (chooser && accountCount() > 1) {
    chooser()
    return
  }
  const id = readCurrent()?.id ?? null
  await sb.auth.signOut()
  window.location.href = finishLogout(id) === 'switched' ? '/' : '/login/'
}
