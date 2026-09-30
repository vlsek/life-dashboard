import { ref } from 'vue'
import { sb } from './supabase'
import type { VocabWord, WordFormInput } from './types'

// Тот же паттерн session/onboarded redirect, что и в useSkills.ts/useGoals.ts —
// портировано из requireAuth()/requireOnboarded() в config.js.
export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

export function useVocab() {
  const auth = ref<AuthState>({ status: 'loading' })
  const words = ref<VocabWord[]>([])
  const error = ref<string | null>(null)

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await load(userId)
  }

  async function load(userId: string) {
    const { data, error: err } = await sb
      .from('vocabulary')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    words.value = (data || []) as VocabWord[]
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  // Порт langFields() из english.js: столбец lang появился в миграции 024. Если слово на
  // английском и у существующей записи ещё нет поля lang, не отправляем его в апдейте —
  // чтобы не падать на базе, где миграция ещё не применена (см. eng_lang_migration_hint).
  function langFields(res: WordFormInput, existing: VocabWord | null): { lang?: string } {
    if (res.lang !== 'en' || (existing && 'lang' in existing)) return { lang: res.lang }
    return {}
  }

  async function addWord(userId: string, res: WordFormInput) {
    const { error: err } = await sb.from('vocabulary').insert({
      user_id: userId,
      word: res.word,
      translation: res.translation,
      example: res.example,
      learned: false,
      ...langFields(res, null),
    })
    if (err) throw err
    await reload()
  }

  async function editWord(existing: VocabWord, res: WordFormInput) {
    const { error: err } = await sb
      .from('vocabulary')
      .update({
        word: res.word,
        translation: res.translation,
        example: res.example,
        ...langFields(res, existing),
      })
      .eq('id', existing.id)
    if (err) throw err
    await reload()
  }

  async function deleteWord(id: string) {
    const { error: err } = await sb.from('vocabulary').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  async function toggleLearned(w: VocabWord) {
    const { error: err } = await sb.from('vocabulary').update({ learned: !w.learned }).eq('id', w.id)
    if (err) throw err
    await reload()
  }

  init()

  return { auth, words, error, addWord, editWord, deleteWord, toggleLearned, reload }
}
