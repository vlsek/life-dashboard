import { ref } from 'vue'
import { sb } from './supabase'

import { friendlyError } from './friendlyError'
// Виджет «Изучение языков» на главной (BACKLOG 390, владелец 2026-10-03: «верхние 5 слов всегда перед глазами, чтобы человек мог их
// постоянно повторять, со скроллером — если что, листнуть ниже»; разрешено сделать лучше). Данные — слова раздела Языков (таблица
// `vocabulary`, КОПИЯ правил web-languages: язык слова — `lang`, пусто = английский; `learned` — выучено). Миграции нет: набор слов —
// `config.languages` в элементе раскладки (код языка или 'all'), а «знаю — уводит слово вниз очереди» хранится на устройстве
// (localStorage: когда слово последний раз отметили «знаю»), чтобы не писать в БД на каждый тап.

export interface LangWord {
  id: string
  word: string
  translation: string | null
  example: string | null
  lang: string
  created_at: string
}

export interface LangOption {
  code: string
  name: string
  count: number // сколько невыученных слов
}

export const ALL_LANGS = 'all'
export const QUEUE_LIMIT = 300 // сколько невыученных слов читаем (виджет — «верхние слова», а не вся база)

// КОПИЯ имён языков из web-languages/src/lib/vocab.ts (VOCAB_LANGS)
const LANG_NAMES: Record<string, string> = {
  en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski',
  cs: 'Čeština', sv: 'Svenska', tr: 'Türkçe', uk: 'Українська', ru: 'Русский', ka: 'ქართული', ar: 'العربية', he: 'עברית',
  hi: 'हिन्दी', zh: '中文', ja: '日本語', ko: '한국어',
}
export function langName(code: string): string {
  return LANG_NAMES[code] ?? (code || '').toUpperCase()
}

type Row = { id: string; word: string; translation?: string | null; example?: string | null; lang?: string | null; learned?: boolean | null; created_at?: string | null }
const wordLang = (r: Row) => r.lang || 'en'
const toWord = (r: Row): LangWord => ({ id: r.id, word: r.word, translation: r.translation ?? null, example: r.example ?? null, lang: wordLang(r), created_at: r.created_at ?? '' })

// ===== очередь: «знаю» уводит слово вниз =====
const KNOWN_KEY = 'dash_lang_known'
const KNOWN_MAX = 500
export type KnownMap = Record<string, number>

export function readKnown(): KnownMap {
  try {
    const raw = JSON.parse(localStorage.getItem(KNOWN_KEY) || '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: KnownMap = {}
    for (const [id, ts] of Object.entries(raw as Record<string, unknown>)) if (typeof ts === 'number' && Number.isFinite(ts)) out[id] = ts
    return out
  } catch {
    return {}
  }
}

export function writeKnown(map: KnownMap): void {
  try {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, KNOWN_MAX) // старые отметки отбрасываем
    localStorage.setItem(KNOWN_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* без localStorage очередь просто не запоминается */
  }
}

// Порядок слов: сначала те, что ещё не отмечали «знаю» (новые сверху, как в разделе Языков), затем отмеченные — давнее «знаю» раньше.
// Так слово, отмеченное «знаю», уходит вниз очереди и возвращается наверх, когда остальные пройдены.
export function orderQueue(words: LangWord[], known: KnownMap): LangWord[] {
  const fresh = words.filter((w) => known[w.id] === undefined)
  const seen = words.filter((w) => known[w.id] !== undefined).sort((a, b) => known[a.id] - known[b.id])
  return [...fresh, ...seen]
}

// Слова набора: невыученные, нужного языка ('all' — любого), в порядке очереди
export function pickWords(rows: Row[], lang: string, known: KnownMap): LangWord[] {
  const words = rows.filter((r) => !r.learned && (lang === ALL_LANGS || wordLang(r) === lang)).map(toWord)
  return orderQueue(words, known)
}

// Языки, на которых есть невыученные слова, — для выбора в окне раскладки (больше слов — выше)
export async function loadLangOptions(userId: string): Promise<LangOption[]> {
  const { data, error } = await sb.from('vocabulary').select('lang, learned').eq('user_id', userId).eq('learned', false).limit(2000)
  if (error) return []
  const counts = new Map<string, number>()
  for (const r of (data || []) as Row[]) counts.set(wordLang(r), (counts.get(wordLang(r)) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, name: langName(code), count }))
}

export type LangWidgetState = 'loading' | 'ready' | 'empty' | 'error'

export function useLanguagesWidget() {
  const state = ref<LangWidgetState>('loading')
  const words = ref<LangWord[]>([])
  const error = ref('')
  const busy = ref<Set<string>>(new Set())
  let lang = ALL_LANGS
  let userId = ''

  async function load(uid: string, langCode: string) {
    userId = uid
    lang = langCode
    state.value = 'loading'
    error.value = ''
    const { data, error: err } = await sb.from('vocabulary').select('*').eq('user_id', uid).eq('learned', false).order('created_at', { ascending: false }).limit(QUEUE_LIMIT)
    if (err) {
      error.value = friendlyError(err, 'load')
      state.value = 'error'
      return
    }
    words.value = pickWords((data || []) as Row[], lang, readKnown())
    state.value = words.value.length > 0 ? 'ready' : 'empty'
  }

  // «Знаю»: слово уходит вниз очереди (только на этом устройстве), слово остаётся невыученным
  function know(id: string) {
    if (!words.value.some((w) => w.id === id)) return
    const known = readKnown()
    known[id] = Date.now()
    writeKnown(known)
    words.value = orderQueue(words.value, known)
  }

  // «Выучил»: слово выучено в разделе Языков (learned = true) и уходит из очереди; при сбое возвращается
  async function learned(id: string) {
    const i = words.value.findIndex((w) => w.id === id)
    if (i < 0 || busy.value.has(id)) return
    const before = words.value
    busy.value = new Set(busy.value).add(id)
    error.value = ''
    words.value = before.filter((w) => w.id !== id)
    const { error: err } = await sb.from('vocabulary').update({ learned: true }).eq('id', id).eq('user_id', userId)
    const rest = new Set(busy.value)
    rest.delete(id)
    busy.value = rest
    if (err) {
      words.value = before
      error.value = friendlyError(err)
      return
    }
    if (words.value.length === 0) state.value = 'empty'
  }

  return { state, words, error, busy, load, know, learned }
}
