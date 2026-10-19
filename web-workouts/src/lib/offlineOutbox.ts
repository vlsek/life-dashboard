// Очередь офлайн-записей (BACKLOG 66.1; контракт — docs/ANDROID_APP_PLAN.md, раздел «Контракт»). Чистая логика без Vue.
// Идея: запись в Supabase сперва пробуется онлайн; если сети нет — операция кладётся в очередь (IndexedDB) и уходит позже, по порядку
// для одного ключа. Повтор безопасен: вставки идут с клиентским uuid (повторная вставка того же id = «уже применено»), остальное — upsert/update/delete.
// Пилоты изолированы, поэтому файл ЕСТЬ в web-dashboard, web-header и web-workouts (менять ВМЕСТЕ — страж offlineOutboxCopies.test.ts в web-dashboard).

export type OutboxOp = 'insert' | 'upsert' | 'update' | 'delete'

export interface OutboxEntry {
  id: string // uuid самой операции (не путать с id строки в таблице)
  seq: number // порядок постановки; внутри одного ключа операции идут строго по seq
  userId: string
  key: string // ключ порядка и склейки: таблица + естественный ключ строки (например `daily_values:2026-10-19:<metric>`)
  table: string
  op: OutboxOp
  payload?: Record<string, unknown>
  match?: Record<string, unknown> // для update/delete: условие `eq` по каждому полю
  onConflict?: string // для upsert
  clientTs: number
  attempts: number
  nextTryAt: number
  status: 'pending' | 'failed' // failed — сервер отказал (RLS/валидация), сам не повторяется, ждёт решения человека
  lastError?: string
}

export interface OutboxStorage {
  getAll(): Promise<OutboxEntry[]>
  put(entry: OutboxEntry): Promise<void>
  remove(id: string): Promise<void>
}

// Минимум, который нужен от supabase-js (в тестах подставляется заглушка).
export interface SbError { message?: string; code?: string; status?: number }
export interface SbResult { error: SbError | null; status?: number }
type Thenable = PromiseLike<SbResult>
export interface SbTable {
  insert(row: unknown): Thenable
  upsert(row: unknown, opts?: { onConflict?: string }): Thenable
  update(row: unknown): { match(f: Record<string, unknown>): Thenable }
  delete(): { match(f: Record<string, unknown>): Thenable }
}
export interface SbLike { from(table: string): SbTable }

export type WriteInput = Pick<OutboxEntry, 'key' | 'table' | 'op'> & Partial<Pick<OutboxEntry, 'payload' | 'match' | 'onConflict'>>
export type WriteResult = { status: 'sent' } | { status: 'queued' } | { status: 'rejected'; error: string }

export type OutboxState = 'idle' | 'offline' | 'syncing' | 'pending' | 'error'
export interface OutboxStatus { state: OutboxState; pending: number; failed: number }

export interface OutboxDeps {
  client: SbLike
  storage?: OutboxStorage
  now?: () => number
  isOnline?: () => boolean
}

export const OUTBOX_DB = 'ld-outbox'
export const OUTBOX_STORE = 'ops'
export const BACKOFF_BASE_MS = 1000
export const BACKOFF_MAX_MS = 60000

export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function memoryStorage(): OutboxStorage {
  const map = new Map<string, OutboxEntry>()
  return {
    async getAll() { return [...map.values()].map((e) => ({ ...e })) },
    async put(e) { map.set(e.id, { ...e }) },
    async remove(id) { map.delete(id) },
  }
}

// IndexedDB: одна база, одно хранилище; каждая операция — одна транзакция (запись очереди атомарна).
export function indexedDbStorage(idb: IDBFactory = indexedDB): OutboxStorage {
  let dbp: Promise<IDBDatabase> | null = null
  const open = (): Promise<IDBDatabase> => {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = idb.open(OUTBOX_DB, 1)
        req.onupgradeneeded = () => { req.result.createObjectStore(OUTBOX_STORE, { keyPath: 'id' }) }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => { dbp = null; reject(req.error) }
      })
    }
    return dbp
  }
  const run = <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    open().then((db) => new Promise<T>((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, mode)
      const req = fn(tx.objectStore(OUTBOX_STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    }))
  return {
    getAll: () => run('readonly', (s) => s.getAll() as IDBRequest<OutboxEntry[]>),
    put: (e) => run('readwrite', (s) => s.put(e)).then(() => undefined),
    remove: (id) => run('readwrite', (s) => s.delete(id)).then(() => undefined),
  }
}

// Сетевая ошибка (повторять) или отказ сервера (не повторять). 5xx/408/429 — временные, их повторяем.
export function isRetryable(err: unknown): boolean {
  if (err == null) return false
  const e = err as SbError & { name?: string }
  if (typeof e.status === 'number') return e.status === 0 || e.status === 408 || e.status === 429 || e.status >= 500
  if (typeof e.code === 'string' && /^[0-9A-Z]{5}$/.test(e.code)) return false // код PostgreSQL → сервер ответил и отказал
  const m = String(e.message ?? err).toLowerCase()
  return e.name === 'TypeError' || /failed to fetch|networkerror|load failed|network request failed|fetch failed|timeout|offline/.test(m)
}

const isDuplicate = (err: SbError | null): boolean => !!err && err.code === '23505' // вставка с тем же id уже была применена

export interface Outbox {
  write(input: WriteInput): Promise<WriteResult>
  flush(): Promise<void>
  list(): Promise<OutboxEntry[]>
  retry(id: string): Promise<void>
  discard(id: string): Promise<void>
  setUser(userId: string | null): void
  status(): OutboxStatus
  refresh(): Promise<OutboxStatus>
  subscribe(fn: (s: OutboxStatus) => void): () => void
}

export function createOutbox(deps: OutboxDeps): Outbox {
  const storage = deps.storage ?? memoryStorage()
  const now = deps.now ?? (() => Date.now())
  const online = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  let user: string | null = null
  let seq = 0
  let flushing = false
  let cache: OutboxEntry[] = []
  let current: OutboxStatus = { state: 'idle', pending: 0, failed: 0 }
  const listeners = new Set<(s: OutboxStatus) => void>()

  const mine = (list: OutboxEntry[]) => list.filter((e) => e.userId === user)
  const compute = (list: OutboxEntry[]): OutboxStatus => {
    const m = mine(list)
    const pending = m.filter((e) => e.status === 'pending').length
    const failed = m.filter((e) => e.status === 'failed').length
    const state: OutboxState = flushing ? 'syncing' : failed > 0 ? 'error' : pending > 0 ? (online() ? 'pending' : 'offline') : online() ? 'idle' : 'offline'
    return { state, pending, failed }
  }
  const emit = (list: OutboxEntry[]) => {
    cache = list
    current = compute(list)
    for (const fn of listeners) fn(current)
  }
  const reload = async (): Promise<OutboxEntry[]> => {
    const all = (await storage.getAll()).sort((a, b) => a.seq - b.seq)
    for (const e of all) if (e.seq > seq) seq = e.seq
    emit(all)
    return all
  }

  const apply = async (e: Pick<OutboxEntry, 'table' | 'op' | 'payload' | 'match' | 'onConflict'>): Promise<SbResult> => {
    try {
      const t = deps.client.from(e.table)
      if (e.op === 'insert') return await t.insert(e.payload ?? {})
      if (e.op === 'upsert') return await t.upsert(e.payload ?? {}, e.onConflict ? { onConflict: e.onConflict } : undefined)
      if (e.op === 'update') return await t.update(e.payload ?? {}).match(e.match ?? {})
      return await t.delete().match(e.match ?? {})
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : String(err), status: 0 } }
    }
  }

  const enqueue = async (input: WriteInput, userId: string, error?: string): Promise<void> => {
    const all = await storage.getAll()
    // «Склейка»: новая upsert-запись того же ключа заменяет ещё не отправленную прежнюю (в таблице всё равно останется последняя).
    if (input.op === 'upsert') {
      for (const old of all) if (old.userId === userId && old.key === input.key && old.op === 'upsert' && old.status === 'pending') await storage.remove(old.id)
    }
    seq += 1
    const entry: OutboxEntry = { id: newId(), seq, userId, key: input.key, table: input.table, op: input.op, payload: input.payload, match: input.match, onConflict: input.onConflict, clientTs: now(), attempts: 0, nextTryAt: now(), status: 'pending', lastError: error }
    await storage.put(entry)
    await reload()
  }

  const write = async (input: WriteInput): Promise<WriteResult> => {
    if (!user) return { status: 'rejected', error: 'no user' }
    const userId = user
    await reload()
    // Если по этому ключу уже что-то ждёт — порядок важнее скорости: встаём в очередь.
    const blocked = cache.some((e) => e.userId === userId && e.key === input.key)
    if (blocked || !online()) {
      await enqueue(input, userId)
      return { status: 'queued' }
    }
    const res = await apply(input)
    if (!res.error || (input.op === 'insert' && isDuplicate(res.error))) return { status: 'sent' }
    if (isRetryable(res.error)) {
      await enqueue(input, userId, res.error.message)
      return { status: 'queued' }
    }
    return { status: 'rejected', error: res.error.message ?? 'rejected' }
  }

  const flush = async (): Promise<void> => {
    if (!user || flushing || !online()) return
    const run = async () => {
      flushing = true
      emit(cache)
      try {
        const all = await reload()
        const blockedKeys = new Set<string>()
        for (const e of all) {
          if (e.userId !== user) continue
          if (e.status === 'failed') { blockedKeys.add(e.key); continue } // решение человека; следующие по ключу ждут
          if (blockedKeys.has(e.key)) continue
          if (e.nextTryAt > now()) { blockedKeys.add(e.key); continue }
          const res = await apply(e)
          if (!res.error || (e.op === 'insert' && isDuplicate(res.error))) { await storage.remove(e.id); continue }
          blockedKeys.add(e.key)
          if (isRetryable(res.error)) {
            const attempts = e.attempts + 1
            await storage.put({ ...e, attempts, lastError: res.error.message, nextTryAt: now() + Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(attempts, 10)) })
            if (!online()) break
          } else {
            await storage.put({ ...e, status: 'failed', attempts: e.attempts + 1, lastError: res.error.message ?? 'rejected' })
          }
        }
      } finally {
        flushing = false
        await reload()
      }
    }
    // Одна «лидирующая» вкладка: Web Locks, где они есть; иначе хватает флага в этой вкладке.
    const locks = (globalThis as { navigator?: { locks?: { request: (n: string, o: { ifAvailable: boolean }, cb: (l: unknown) => Promise<void>) => Promise<void> } } }).navigator?.locks
    if (locks) await locks.request('ld-outbox-flush', { ifAvailable: true }, async (lock) => { if (lock) await run() })
    else await run()
  }

  return {
    write,
    flush,
    list: async () => mine(await reload()),
    retry: async (id) => {
      const e = (await storage.getAll()).find((x) => x.id === id)
      if (e) await storage.put({ ...e, status: 'pending', nextTryAt: now(), lastError: undefined })
      await reload()
    },
    discard: async (id) => { await storage.remove(id); await reload() },
    setUser: (u) => { user = u; emit(cache) },
    status: () => current,
    refresh: async () => { await reload(); return current },
    subscribe: (fn) => { listeners.add(fn); fn(current); return () => { listeners.delete(fn) } },
  }
}

// Автосброс: при возвращении сети, при возврате на вкладку и по таймеру. Возвращает функцию отписки.
export function startAutoFlush(outbox: Outbox, intervalMs = 30000): () => void {
  if (typeof window === 'undefined') return () => undefined
  const go = () => { void outbox.flush() }
  const vis = () => { if (document.visibilityState === 'visible') go() }
  window.addEventListener('online', go)
  document.addEventListener('visibilitychange', vis)
  const timer = setInterval(go, intervalMs)
  go()
  return () => { window.removeEventListener('online', go); document.removeEventListener('visibilitychange', vis); clearInterval(timer) }
}
