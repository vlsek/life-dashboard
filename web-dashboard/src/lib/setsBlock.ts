import type { Metric } from './types'

// Портировано из renderSetsMetric() в dashboard.js — только чистая логика без DOM и сети.
// Подход хранится в daily_values.value как jsonb-массив [{reps, variation, time}, ...].

export interface SetRow {
  reps: number | null
  variation: string | null
  time: string | null
}

// Текущее время "ЧЧ:ММ" — для отметки времени нового подхода (nowHHMM() из config.js).
export function nowHHMM(d: Date = new Date()): string {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// Приводит сохранённое значение к списку подходов: не-массив (пусто/битое) → [].
export function normalizeSets(value: unknown): SetRow[] {
  if (!Array.isArray(value)) return []
  return (value as Partial<SetRow>[]).map((s) => ({
    reps: s?.reps ?? null,
    variation: s?.variation ?? null,
    time: s?.time ?? null,
  }))
}

export function newSet(now: Date = new Date()): SetRow {
  return { reps: null, variation: null, time: nowHHMM(now) }
}

export function totalReps(sets: SetRow[]): number {
  return sets.reduce((sum, s) => sum + (s.reps || 0), 0)
}

// Ввод в поле "раз": пустое → null, нечисло → 0 (как parseFloat(v) || 0 в оригинале).
export function parseReps(raw: string): number | null {
  return raw === '' ? null : parseFloat(raw) || 0
}

// Время из <input type=time>: пусто → null.
export function parseTime(raw: string): string | null {
  return raw || null
}

export function parseVariation(raw: string): string | null {
  return raw.trim() || null
}

export function removeSet(sets: SetRow[], index: number): SetRow[] {
  return sets.filter((_, i) => i !== index)
}

// Иммутабельная правка одного подхода (Vue-friendly вместо мутации s.reps = ... в оригинале).
export function updateSet(sets: SetRow[], index: number, patch: Partial<SetRow>): SetRow[] {
  return sets.map((s, i) => (i === index ? { ...s, ...patch } : s))
}

// Варианты «особенности подхода» для подсказки — options метрики (label || key).
export function variationLabels(m: Pick<Metric, 'options'>): string[] {
  return (m.options || []).map((o) => o.label || o.key).filter(Boolean)
}

// Подсказки по введённому тексту (регистронезависимый поиск подстроки); showAll — весь список.
export function matchVariations(labels: string[], query: string, showAll: boolean): string[] {
  const q = showAll ? '' : query.trim().toLowerCase()
  return labels.filter((l) => l.toLowerCase().includes(q))
}

// Запомнить новый вариант: null, если пусто или уже есть (без учёта регистра) — писать в БД нечего.
export function rememberVariationOptions(m: Pick<Metric, 'options'>, text: string): Metric['options'] | null {
  if (!text) return null
  const known = new Set(variationLabels(m).map((l) => l.toLowerCase()))
  if (known.has(text.toLowerCase())) return null
  return [...(m.options || []), { key: text, label: text }]
}

// Забыть вариант — убирает опцию с такой подписью (label || key).
export function forgetVariationOptions(m: Pick<Metric, 'options'>, label: string): NonNullable<Metric['options']> {
  return (m.options || []).filter((o) => (o.label || o.key) !== label)
}

// Строка-сводка под заголовком (пустой список → null, чтобы UI подставил «нет подходов»).
export function setsSummary(sets: SetRow[]): { count: number; reps: number } | null {
  return sets.length === 0 ? null : { count: sets.length, reps: totalReps(sets) }
}

// Позиция плавающей выпадашки (position: fixed) под полем или над ним — порт positionFloatingPanel()
// из config.js. Нужна, потому что таблица подходов лежит в контейнере с overflow-x: auto, и обычная
// absolute-выпадашка внутри него обрезалась на узком экране (телефон). viewport — видимая область
// (visualViewport на мобильных: клавиатура её уменьшает).
export interface FloatingRect { left: number; top: number; bottom: number; width: number }
export interface FloatingViewport { top: number; bottom: number; width: number }
export interface FloatingStyle { left: string; width: string; top: string; bottom: string; maxHeight: string }

export function floatingPanelStyle(rect: FloatingRect, vp: FloatingViewport, margin = 8, preferredMax = 280): FloatingStyle {
  const spaceBelow = vp.bottom - rect.bottom - margin
  const spaceAbove = rect.top - vp.top - margin
  const left = Math.max(margin, rect.left)
  const width = Math.max(0, Math.min(rect.width, vp.width - margin * 2))
  if (spaceBelow >= 100 || spaceBelow >= spaceAbove) {
    return {
      left: left + 'px',
      width: width + 'px',
      top: rect.bottom + 4 + 'px',
      bottom: 'auto',
      maxHeight: Math.max(80, Math.min(preferredMax, spaceBelow)) + 'px',
    }
  }
  return {
    left: left + 'px',
    width: width + 'px',
    top: 'auto',
    // bottom считается от нижнего края экрана, а не видимой области — как и в оригинале (fixed)
    bottom: Math.max(0, window.innerHeight - rect.top + 4) + 'px',
    maxHeight: Math.max(80, Math.min(preferredMax, spaceAbove)) + 'px',
  }
}
