// Импорт книг из CSV-экспорта Goodreads (BACKLOG 77.9, срез 1): название, автор, полка и дата прочтения. Оценки и страницы пока не переносим (для них нужны поля 77.3/77.8).
export interface ImportedBook {
  title: string
  author: string
  status: 'done' | 'to_read'
  doneDate: string | null // ISO
}

// CSV по RFC 4180: кавычки, запятые и переводы строк внутри кавычек, "" как кавычка, BOM в начале.
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++ } else q = false
      } else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cur); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cur); cur = ''
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
    } else cur += ch
  }
  row.push(cur)
  if (row.some((c) => c !== '')) rows.push(row)
  return rows
}

// Goodreads пишет даты как 2024/03/15 (иногда только 2024/03 — такое считаем неизвестной датой).
export function parseGoodreadsDate(s: string): string | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export interface ParseResult {
  books: ImportedBook[]
  error: 'empty' | 'noColumns' | null
}

export function parseGoodreads(text: string): ParseResult {
  const rows = parseCsv(text)
  if (rows.length < 2) return { books: [], error: 'empty' }
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => head.indexOf(name)
  const iTitle = col('title'), iAuthor = col('author'), iShelf = col('exclusive shelf'), iRead = col('date read'), iAdded = col('date added')
  if (iTitle < 0) return { books: [], error: 'noColumns' }
  const books: ImportedBook[] = []
  for (const r of rows.slice(1)) {
    const title = (r[iTitle] ?? '').trim()
    if (!title) continue
    const shelf = iShelf >= 0 ? (r[iShelf] ?? '').trim().toLowerCase() : 'read'
    const done = shelf === 'read'
    const doneDate = done ? (parseGoodreadsDate(iRead >= 0 ? r[iRead] ?? '' : '') ?? (iAdded >= 0 ? parseGoodreadsDate(r[iAdded] ?? '') : null)) : null
    books.push({ title, author: iAuthor >= 0 ? (r[iAuthor] ?? '').trim() : '', status: done ? 'done' : 'to_read', doneDate })
  }
  return { books, error: books.length ? null : 'empty' }
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
export const bookKey = (title: string, author: string | null) => `${norm(title)}|${norm(author ?? '')}`

export interface ImportPlan {
  toAdd: ImportedBook[]
  duplicates: number
  done: number
  toRead: number
}

// Дубли — по названию и автору (без учёта регистра и лишних пробелов): и с уже имеющимися книгами, и внутри самого файла.
export function planImport(parsed: ImportedBook[], existing: { title: string; author: string | null }[]): ImportPlan {
  const seen = new Set(existing.map((b) => bookKey(b.title, b.author)))
  const toAdd: ImportedBook[] = []
  let duplicates = 0
  for (const b of parsed) {
    const k = bookKey(b.title, b.author)
    if (seen.has(k)) { duplicates++; continue }
    seen.add(k)
    toAdd.push(b)
  }
  return { toAdd, duplicates, done: toAdd.filter((b) => b.status === 'done').length, toRead: toAdd.filter((b) => b.status === 'to_read').length }
}

// Строки для вставки. За импортированные прочитанные баллы не начисляем (points = 0): иначе архив разом «наградил» бы за прошлые годы.
export function importRows(userId: string, books: ImportedBook[], defaultPoints = 10) {
  return books.map((b) => ({ user_id: userId, title: b.title, author: b.author || null, status: b.status, done_date: b.status === 'done' ? b.doneDate : null, points: b.status === 'done' ? 0 : defaultPoints }))
}
