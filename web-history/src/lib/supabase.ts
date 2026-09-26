import { createClient } from '@supabase/supabase-js'

// Тот же проект и тот же анонимный ключ, что и у остального сайта (config.js). Поскольку
// страница раздаётся с того же домена (life-dashboard.orneryhero.workers.dev/history-vue/),
// supabase-js по умолчанию хранит сессию в localStorage под одним и тем же ключом — вход,
// сделанный на старом сайте, подхватывается здесь без какой-либо доп. синхронизации.
const SUPABASE_URL = 'https://haxmgtflegsfpxieaydv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_jvg_Y0JtOC66Edj1WbAgqg_n0LfjWAF'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function logout() {
  await sb.auth.signOut()
  window.location.href = '/login.html'
}
