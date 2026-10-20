// Очередь офлайн-записей в шапке (BACKLOG 66.4): показывает состояние и умеет сбросить очередь. Сами записи кладёт Дашборд (и другие
// страницы по мере подключения); IndexedDB общая для всех страниц сайта, поэтому шапка видит их операции, опрашивая хранилище.
import { ref, type Ref } from 'vue'
import { sb } from './supabase'
import { createOutbox, indexedDbStorage, memoryStorage, startAutoFlush, type Outbox, type OutboxEntry, type OutboxStatus, type SbError, type SbLike } from './offlineOutbox'

let box: Outbox | null = null
export function getOutbox(): Outbox {
  if (!box) {
    let storage
    try { storage = typeof indexedDB === 'undefined' ? memoryStorage() : indexedDbStorage() } catch { storage = memoryStorage() }
    box = createOutbox({ client: sb as unknown as SbLike, storage })
  }
  return box
}
export function setOutboxForTests(o: Outbox | null): void { box = o }

export const POLL_MS = 4000

// Запись из шапки (BACKLOG 66.5а, вода): те же помощники, что в Дашборде. Авто-сброс очереди запускает useOutboxView.
export interface QResult { error: SbError | null; queued: boolean }
async function run(userId: string, input: Parameters<Outbox['write']>[0]): Promise<QResult> {
  const o = getOutbox()
  o.setUser(userId)
  const r = await o.write(input)
  if (r.status === 'rejected') return { error: r.raw ?? { message: r.error }, queued: false }
  return { error: null, queued: r.status === 'queued' }
}
export const qUpsert = (userId: string, table: string, key: string, payload: Record<string, unknown> | Record<string, unknown>[], onConflict: string): Promise<QResult> =>
  run(userId, { table, op: 'upsert', key, payload, onConflict })
export const qInsert = (userId: string, table: string, key: string, payload: Record<string, unknown>): Promise<QResult> =>
  run(userId, { table, op: 'insert', key, payload })
export const qDelete = (userId: string, table: string, key: string, match: Record<string, unknown>): Promise<QResult> =>
  run(userId, { table, op: 'delete', key, match })
export const dailyValueKey = (date: string, metricId: string): string => `daily_values:${date}:${metricId}`

export interface OutboxView {
  status: Ref<OutboxStatus>
  entries: Ref<OutboxEntry[]>
  online: Ref<boolean>
  refresh: () => Promise<void>
  retry: (id: string) => Promise<void>
  discard: (id: string) => Promise<void>
  stop: () => void
}

// Подключается из шапки после появления userId; stop() снимает подписки (вызвать при размонтировании).
export function useOutboxView(userId: string, ob: Outbox = getOutbox()): OutboxView {
  ob.setUser(userId)
  const status = ref<OutboxStatus>(ob.status())
  const entries = ref<OutboxEntry[]>([])
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine !== false)
  const refresh = async () => {
    entries.value = await ob.list()
    status.value = await ob.refresh()
  }
  const unsub = ob.subscribe((s) => { status.value = s })
  const onNet = () => { online.value = navigator.onLine !== false; void refresh() }
  const stopFlush = startAutoFlush(ob)
  const timer = setInterval(() => { void refresh() }, POLL_MS)
  if (typeof window !== 'undefined') { window.addEventListener('online', onNet); window.addEventListener('offline', onNet) }
  void refresh()
  const stop = () => {
    unsub(); stopFlush(); clearInterval(timer)
    if (typeof window !== 'undefined') { window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet) }
  }
  return {
    stop,
    status, entries, online, refresh,
    retry: async (id) => { await ob.retry(id); await ob.flush(); await refresh() },
    discard: async (id) => { await ob.discard(id); await refresh() },
  }
}

// Видна ли плашка: есть что отправлять / проблемы / нет сети.
export function badgeKind(s: OutboxStatus, online: boolean): 'error' | 'pending' | 'offline' | null {
  if (s.failed > 0) return 'error'
  if (s.pending > 0) return 'pending'
  if (!online) return 'offline'
  return null
}
