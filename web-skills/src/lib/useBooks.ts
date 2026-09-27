import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import type { Book, BookFormInput } from './types'

// Отдельная таблица от навыков, но живёт на той же странице — авторизация уже сделана
// useSkills(), сюда передаётся готовый userId. Портировано из renderBooks()/addBook()/
// editBook()/deleteBook()/toggleBookDone() в skills.js.
export function useBooks() {
  const items = ref<Book[]>([])
  const error = ref<string | null>(null)
  let currentUserId: string | null = null

  async function load(userId: string) {
    currentUserId = userId
    const { data, error: err } = await sb.from('books').select('*').eq('user_id', userId).order('created_at')
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    items.value = (data || []) as Book[]
  }

  async function reload() {
    if (currentUserId) await load(currentUserId)
  }

  function buildRow(res: BookFormInput): { title: string; author: string | null; points: number } {
    return { title: res.title.trim(), author: res.author.trim() || null, points: res.points || 10 }
  }

  async function addBook(userId: string, res: BookFormInput) {
    const row = buildRow(res)
    const { error: err } = await sb.from('books').insert({ user_id: userId, status: 'to_read', ...row })
    if (err) throw err
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
    await reload()
  }

  return { items, error, load, reload, addBook, updateBook, deleteBook, toggleDone }
}
