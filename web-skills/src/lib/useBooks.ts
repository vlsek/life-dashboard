import { importRows, type ImportedBook } from './importGoodreads'
import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import type { Book, BookFormInput } from './types'
import { completionDelta, emitPointsFloat } from './pointsFloat'
import { normalizeNotes, normalizeRating } from './bookExtras'
import { friendlyError } from './friendlyError'

// Очки книги по умолчанию — как в балансе: пусто → 10
const BOOK_DEFAULT_POINTS = 10

// Отдельная таблица от навыков, но живёт на той же странице — авторизация уже сделана
// useSkills(), сюда передаётся готовый userId. Портировано из renderBooks()/addBook()/
// editBook()/deleteBook()/toggleBookDone() в skills.js.
export function useBooks() {
  const items = ref<Book[]>([])
  const error = ref<string | null>(null)
  const loaded = ref(false) // первая загрузка закончилась (успехом или ошибкой): до этого «нет …» показывать нельзя — ложная пустота
  // Есть ли колонки books.rating/notes (миграция 123, BACKLOG 77.8): по первой строке, у пустого списка — пробным запросом. Нет колонок — «Оценка» и «Заметка» не показываем и не пишем.
  const hasExtras = ref(false)
  let currentUserId: string | null = null

  async function load(userId: string) {
    try {
      await loadData(userId)
    } finally {
      loaded.value = true
    }
  }

  async function loadData(userId: string) {
    currentUserId = userId
    const { data, error: err } = await sb.from('books').select('*').eq('user_id', userId).order('created_at')
    if (err) {
      error.value = friendlyError(err, 'load')
      return
    }
    error.value = null
    items.value = (data || []) as Book[]
    if (items.value.length) hasExtras.value = 'rating' in items.value[0]
    else hasExtras.value = !(await sb.from('books').select('rating, notes').limit(1)).error
  }

  async function reload() {
    if (currentUserId) await load(currentUserId)
  }

  function buildRow(res: BookFormInput): { title: string; author: string | null; points: number; rating?: number | null; notes?: string | null } {
    const row: { title: string; author: string | null; points: number; rating?: number | null; notes?: string | null } = { title: res.title.trim(), author: res.author.trim() || null, points: res.points || 10 }
    if (hasExtras.value) {
      row.rating = normalizeRating(res.rating)
      row.notes = normalizeNotes(res.notes)
    }
    return row
  }

  async function addBook(userId: string, res: BookFormInput) {
    const row = buildRow(res)
    const { error: err } = await sb.from('books').insert({ user_id: userId, status: 'to_read', ...row })
    if (err) throw err
    await reload()
  }

  // Импорт пачкой (BACKLOG 77.9): вставляем порциями по 100, чтобы не упереться в лимит запроса; после — одна перезагрузка списка.
  async function importBooks(userId: string, books: ImportedBook[]) {
    const rows = importRows(userId, books, BOOK_DEFAULT_POINTS)
    for (let i = 0; i < rows.length; i += 100) {
      const { error: err } = await sb.from('books').insert(rows.slice(i, i + 100))
      if (err) {
        if (i > 0) await reload() // часть уже вставлена — покажем её
        throw err
      }
    }
    await reload()
  }

  async function updateBook(id: string, res: BookFormInput) {
    const row = buildRow(res)
    const { error: err } = await sb.from('books').update(row).eq('id', id)
    if (err) throw err
    await reload()
  }

  async function deleteBook(id: string) {
    const { error: err } = await sb.from('books').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  async function toggleDone(b: Book) {
    const done = b.status !== 'done'
    const { error: err } = await sb
      .from('books')
      .update({ status: done ? 'done' : 'to_read', done_date: done ? todayStr() : null })
      .eq('id', b.id)
    if (err) throw err
    emitPointsFloat(completionDelta(b.status === 'done', done, b.points, BOOK_DEFAULT_POINTS))
    await reload()
  }

  return { items, error, hasExtras, loaded, load, reload, addBook, importBooks, updateBook, deleteBook, toggleDone }
}
