import { CHART_ANIM_KEY, CHART_FORECAST_KEY, CHART_GOALZONE_KEY, CHART_KIND_KEY, CHART_LINE_KEY, CHART_SPARKS_KEY, CHART_SPARK_STYLE_KEY } from './chartLine'
import { CHART_MARKER_KEY } from './chartMarker'
import { ICON_STYLE_KEY } from './iconStyle'
import { CATEGORY_ORDER } from './customization'
import { SPLASH_VARIANT_KEY } from './splashVariant'
import { STREAK_FLAME_VARIANT_KEY } from './streakFlameVariant'
import { WATER_ANIM_KEY } from './waterAnim'

// «Образы» (BACKLOG 64.1, срез 5): сохранённое сочетание оформления под именем — надеть одним нажатием. Чистая логика без Vue и сети.
// Образ = тема + выбор из каталога (`profiles.customization`) + выбор «бесплатных» пикеров (их ключи localStorage, на устройствах сами НЕ синхронизируются).
// Хранение: по ключу на образ — `cust_look_<id>` (JSON ≤ 2000 знаков, лимит синхронизации); префикс добавлен в SYNC_PREFIXES шапки, поэтому образы
// едут в профиль и на другие устройства, а вместе с ними — выбор пикеров, который иначе остался бы на одном устройстве.
export const LOOK_PREFIX = 'cust_look_'
export const MAX_LOOKS = 5
export const NAME_MAX = 24
export const MAX_LEN = 1900 // с запасом до лимита синхронизации (2000)

// Ключи localStorage «бесплатных» пикеров, входящие в образ. Отсутствие ключа — вариант «по умолчанию/по теме», образ запоминает и это
export const PREF_KEYS: readonly string[] = [
  SPLASH_VARIANT_KEY,
  STREAK_FLAME_VARIANT_KEY,
  WATER_ANIM_KEY,
  CHART_MARKER_KEY,
  CHART_LINE_KEY,
  CHART_ANIM_KEY,
  CHART_FORECAST_KEY,
  CHART_KIND_KEY,
  CHART_GOALZONE_KEY,
  CHART_SPARKS_KEY,
  CHART_SPARK_STYLE_KEY,
  ICON_STYLE_KEY,
  'workouts_body_model',
]

export interface Look {
  id: string // l1 … l5 (номер ячейки)
  name: string
  theme: string | null
  selected: Record<string, string> // категория каталога → предмет
  prefs: Record<string, string> // ключ пикера → значение; нет ключа = по умолчанию
}

const ID_RE = /^l[1-5]$/
export const lookKey = (id: string): string => LOOK_PREFIX + id
const clean = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '')

// Снимок текущего оформления. `read` — чтение localStorage (для тестов подменяется)
export function captureLook(id: string, name: string, state: { theme: string | null; selected: Record<string, string | null | undefined> }, read: (k: string) => string | null): Look {
  const selected: Record<string, string> = {}
  for (const c of CATEGORY_ORDER) {
    const v = state.selected[c]
    if (typeof v === 'string' && v) selected[c] = v
  }
  const prefs: Record<string, string> = {}
  for (const k of PREF_KEYS) {
    const v = read(k)
    if (typeof v === 'string' && v) prefs[k] = v
  }
  return { id, name: clean(name) || id, theme: state.theme, selected, prefs }
}

// Из строки хранилища: мусор, чужие ключи и неверные типы отбрасываются; битый образ — null
export function parseLook(id: string, raw: string | null | undefined): Look | null {
  if (!ID_RE.test(id) || !raw) return null
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return null
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  const name = clean(o.n)
  if (!name) return null
  const selected: Record<string, string> = {}
  if (o.s && typeof o.s === 'object' && !Array.isArray(o.s)) for (const c of CATEGORY_ORDER) if (typeof (o.s as Record<string, unknown>)[c] === 'string') selected[c] = (o.s as Record<string, string>)[c]
  const prefs: Record<string, string> = {}
  if (o.p && typeof o.p === 'object' && !Array.isArray(o.p)) for (const k of PREF_KEYS) if (typeof (o.p as Record<string, unknown>)[k] === 'string') prefs[k] = (o.p as Record<string, string>)[k]
  return { id, name, theme: typeof o.t === 'string' && o.t ? o.t : null, selected, prefs }
}

// В хранилище: короткие ключи (n/t/s/p). Слишком длинный образ (больше лимита синхронизации) не сохраняем — null
export function serializeLook(l: Look): string | null {
  const s = JSON.stringify({ n: l.name, t: l.theme, s: l.selected, p: l.prefs })
  return s.length <= MAX_LEN ? s : null
}

export interface LookStore {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export function loadLooks(store: LookStore): Look[] {
  const out: Look[] = []
  for (let i = 1; i <= MAX_LOOKS; i++) {
    const l = parseLook('l' + i, store.getItem(lookKey('l' + i)))
    if (l) out.push(l)
  }
  return out
}

// Первая свободная ячейка (l1…l5) или null, если все пять заняты
export function freeLookId(looks: readonly Look[]): string | null {
  for (let i = 1; i <= MAX_LOOKS; i++) if (!looks.some((l) => l.id === 'l' + i)) return 'l' + i
  return null
}

// Записать образ; false — не влезает в лимит
export function saveLook(store: LookStore, l: Look): boolean {
  const s = serializeLook(l)
  if (s === null) return false
  store.setItem(lookKey(l.id), s)
  return true
}
export const deleteLook = (store: LookStore, id: string): void => store.removeItem(lookKey(id))

export function renameLook(store: LookStore, id: string, name: string): boolean {
  const l = parseLook(id, store.getItem(lookKey(id)))
  const n = clean(name)
  if (!l || !n) return false
  return saveLook(store, { ...l, name: n })
}

export interface ApplyPlan {
  theme: string | null
  selected: Record<string, string | null> // итоговый выбор каталога целиком (чего нет в образе — снимается)
  skipped: number // сколько предметов образа сейчас недоступны человеку и пропущены
  prefsSet: Record<string, string>
  prefsRemove: string[] // ключи пикеров, которых нет в образе, — вернуть «по умолчанию»
}

// План применения: ничего не пишет. `isUnlocked` — есть ли у человека предмет (темы и предметы каталога проверяются отдельно)
export function planApply(l: Look, isUnlocked: (category: string, key: string) => boolean, themeUnlocked: (key: string) => boolean): ApplyPlan {
  const selected: Record<string, string | null> = {}
  let skipped = 0
  for (const c of CATEGORY_ORDER) {
    const v = l.selected[c]
    if (v && isUnlocked(c, v)) selected[c] = v
    else {
      selected[c] = null
      if (v) skipped++
    }
  }
  let theme: string | null = null
  if (l.theme) {
    if (themeUnlocked(l.theme)) theme = l.theme
    else skipped++
  }
  const prefsSet: Record<string, string> = {}
  const prefsRemove: string[] = []
  for (const k of PREF_KEYS) {
    if (l.prefs[k]) prefsSet[k] = l.prefs[k]
    else prefsRemove.push(k)
  }
  return { theme, selected, skipped, prefsSet, prefsRemove }
}
