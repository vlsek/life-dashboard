// Выгрузка своих данных (BACKLOG 79.2, GDPR ст. 20): читаем только свои строки теми же запросами, что и пилоты, и собираем JSON и CSV (в zip).
// Ничего не отправляется на сервер, файл собирается на устройстве.

export interface ExportTable {
  name: string
  userCol: string // по какой колонке отбираем «свои» строки
  ru: string
  en: string
}

// Таблицы пользователя. Таблицы, которых в базе ещё нет (миграция не применена), попадают в «skipped», а не ломают выгрузку.
export const EXPORT_TABLES: ExportTable[] = [
  { name: 'profiles', userCol: 'user_id', ru: 'Профиль и оформление', en: 'Profile and customization' },
  { name: 'metrics', userCol: 'user_id', ru: 'Метрики', en: 'Metrics' },
  { name: 'daily_values', userCol: 'user_id', ru: 'Значения метрик по дням', en: 'Daily metric values' },
  { name: 'daily_notes', userCol: 'user_id', ru: 'Заметки и планы дней', en: 'Daily notes and plans' },
  { name: 'plan_repeats', userCol: 'user_id', ru: 'Повторяющиеся планы', en: 'Recurring plans' },
  { name: 'goals', userCol: 'user_id', ru: 'Цели', en: 'Goals' },
  { name: 'goal_categories', userCol: 'user_id', ru: 'Категории целей', en: 'Goal categories' },
  { name: 'skills', userCol: 'user_id', ru: 'Навыки', en: 'Skills' },
  { name: 'books', userCol: 'user_id', ru: 'Книги', en: 'Books' },
  { name: 'vocabulary', userCol: 'user_id', ru: 'Слова для изучения', en: 'Vocabulary' },
  { name: 'milestones', userCol: 'user_id', ru: 'Вехи', en: 'Milestones' },
  { name: 'water_log', userCol: 'user_id', ru: 'Журнал воды', en: 'Water log' },
  { name: 'workout_exercises', userCol: 'user_id', ru: 'Упражнения', en: 'Exercises' },
  { name: 'workout_entries', userCol: 'user_id', ru: 'Записи тренировок', en: 'Workout entries' },
  { name: 'workout_sessions', userCol: 'user_id', ru: 'Тренировки (сессии)', en: 'Workout sessions' },
  { name: 'workout_routines', userCol: 'user_id', ru: 'Рутины тренировок', en: 'Workout routines' },
  { name: 'workout_routine_items', userCol: 'user_id', ru: 'Упражнения в рутинах', en: 'Routine items' },
  { name: 'body_parameters', userCol: 'user_id', ru: 'Параметры тела', en: 'Body parameters' },
  { name: 'body_parameter_values', userCol: 'user_id', ru: 'Значения параметров тела', en: 'Body parameter values' },
  { name: 'body_measurements', userCol: 'user_id', ru: 'Замеры тела', en: 'Body measurements' },
  { name: 'body_stats', userCol: 'user_id', ru: 'Данные о теле', en: 'Body stats' },
  { name: 'challenge_instances', userCol: 'user_id', ru: 'Челленджи', en: 'Challenges' },
  { name: 'challenge_entries', userCol: 'user_id', ru: 'Записи челленджей', en: 'Challenge entries' },
  { name: 'user_achievements', userCol: 'user_id', ru: 'Достижения', en: 'Achievements' },
  { name: 'achievement_bonuses', userCol: 'user_id', ru: 'Бонусы за достижения', en: 'Achievement bonuses' },
  { name: 'user_customizations', userCol: 'user_id', ru: 'Купленное оформление', en: 'Owned customizations' },
  { name: 'streak_sparks', userCol: 'user_id', ru: 'Огоньки серий', en: 'Streak sparks' },
  { name: 'streak_pauses', userCol: 'user_id', ru: 'Паузы серий', en: 'Streak pauses' },
  { name: 'follows', userCol: 'follower_id', ru: 'Подписки', en: 'Follows' },
]

type Row = Record<string, unknown>
// Минимальная часть supabase-js, которая нужна (чтобы подменять в тестах).
export interface SbReader {
  from(table: string): {
    select(cols: string): {
      eq(col: string, v: string): {
        order(col: string, o?: { ascending: boolean }): { range(a: number, b: number): PromiseLike<{ data: Row[] | null; error: { message: string } | null }> }
        range(a: number, b: number): PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
      }
    }
  }
}

export const PAGE = 1000 // потолок строк за запрос в supabase

// Все свои строки таблицы постранично. Порядок по id, если колонки нет — без порядка (повторный запрос без order).
export async function fetchAllRows(sb: SbReader, table: ExportTable, uid: string): Promise<Row[]> {
  const out: Row[] = []
  let ordered = true
  for (let from = 0; ; from += PAGE) {
    const q = sb.from(table.name).select('*').eq(table.userCol, uid)
    let res = await (ordered ? q.order('id', { ascending: true }).range(from, from + PAGE - 1) : q.range(from, from + PAGE - 1))
    if (res.error && ordered && /column .*id|does not exist/i.test(res.error.message)) {
      ordered = false
      res = await sb.from(table.name).select('*').eq(table.userCol, uid).range(from, from + PAGE - 1)
    }
    if (res.error) throw new Error(res.error.message)
    const rows = res.data ?? []
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export interface ExportResult {
  exportedAt: string
  userId: string
  tables: Record<string, Row[]>
  skipped: Record<string, string> // таблица → причина
}

export async function collectExport(sb: SbReader, uid: string, now: Date = new Date(), tables: ExportTable[] = EXPORT_TABLES, onProgress?: (done: number, total: number) => void): Promise<ExportResult> {
  const res: ExportResult = { exportedAt: now.toISOString(), userId: uid, tables: {}, skipped: {} }
  let n = 0
  for (const t of tables) {
    try {
      res.tables[t.name] = await fetchAllRows(sb, t, uid)
    } catch (e) {
      res.skipped[t.name] = e instanceof Error ? e.message : String(e)
    }
    onProgress?.(++n, tables.length)
  }
  return res
}

export const totalRows = (r: ExportResult) => Object.values(r.tables).reduce((a, rows) => a + rows.length, 0)

export function buildJson(r: ExportResult): string {
  return JSON.stringify({ exported_at: r.exportedAt, user_id: r.userId, format: 'life-dashboard-export-v1', tables: r.tables, skipped: r.skipped }, null, 2)
}

// CSV (RFC 4180, UTF-8 с BOM, чтобы Excel не ломал кириллицу). Вложенное (массивы, объекты) — как JSON-текст. Колонки — объединение ключей всех строк.
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function buildCsv(rows: Row[]): string {
  const cols: string[] = []
  const seen = new Set<string>()
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); cols.push(k) }
  const lines = [cols.map(csvCell).join(',')]
  for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(','))
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}

export function readme(r: ExportResult, lang: 'ru' | 'en', tables: ExportTable[] = EXPORT_TABLES): string {
  const ru = lang === 'ru'
  const lines = [ru ? 'Выгрузка данных Life Dashboard' : 'Life Dashboard data export', (ru ? 'Дата: ' : 'Date: ') + r.exportedAt, '', ru ? 'Файлы — по одному на таблицу; названия колонок — как в базе. Вложенные значения записаны как JSON-текст.' : 'One file per table; column names are as in the database. Nested values are written as JSON text.', '']
  for (const t of tables) {
    if (!(t.name in r.tables)) continue
    const n = r.tables[t.name].length
    lines.push(n ? `${t.name}.csv — ${ru ? t.ru : t.en} (${n})` : `${t.name} — ${ru ? t.ru : t.en}: ${ru ? 'пусто, файла нет' : 'empty, no file'}`)
  }
  const sk = Object.keys(r.skipped)
  if (sk.length) {
    lines.push('', ru ? 'Не выгружено:' : 'Not exported:')
    for (const k of sk) lines.push(`${k}: ${r.skipped[k]}`)
  }
  return lines.join('\r\n') + '\r\n'
}

// ---- ZIP без сжатия (store), без зависимостей ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function buildZip(files: { name: string; data: string }[], now: Date = new Date()): Uint8Array {
  const enc = new TextEncoder()
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff
  const dosDate = (((Math.max(now.getFullYear(), 1980) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff]
  const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = enc.encode(f.data)
    const crc = crc32(data)
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name])
    parts.push(local, data)
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]))
    offset += local.length + data.length
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)])
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0))
  let pos = 0
  for (const p of all) { out.set(p, pos); pos += p.length }
  return out
}

export function exportCsvZip(r: ExportResult, lang: 'ru' | 'en', now: Date = new Date()): Uint8Array {
  const files = [{ name: 'README.txt', data: readme(r, lang) }]
  for (const [name, rows] of Object.entries(r.tables)) if (rows.length) files.push({ name: name + '.csv', data: buildCsv(rows) })
  return buildZip(files, now)
}

// Дата в имени файла — ЛОКАЛЬНАЯ (toISOString — UTC: после полуночи по Вильнюсу в имени оказывалась вчерашняя дата)
const localDate = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const exportFileName = (kind: 'json' | 'zip', now: Date = new Date()) => `life-dashboard-data-${localDate(now)}.${kind}`
