// Общая очередь офлайн-записей для Тренировок (BACKLOG 66.5в; копия outboxClient.ts Дашборда, контракт — docs/ANDROID_APP_PLAN.md). Хуки пишут через qInsert/qUpdate/qDelete/qUpsert вместо
// прямого sb.from(...): онлайн всё как раньше, офлайн (или при обрыве сети) запись уходит в очередь и отправляется позже.
import { sb } from './supabase'
import { createOutbox, indexedDbStorage, memoryStorage, startAutoFlush, type Outbox, type SbError, type SbLike } from './offlineOutbox'

let box: Outbox | null = null
let stop: (() => void) | null = null

export function getOutbox(): Outbox {
  if (!box) {
    let storage
    try { storage = typeof indexedDB === 'undefined' ? memoryStorage() : indexedDbStorage() } catch { storage = memoryStorage() }
    box = createOutbox({ client: sb as unknown as SbLike, storage })
  }
  return box
}

// Подмена в тестах.
export function setOutboxForTests(o: Outbox | null): void {
  if (stop) { stop(); stop = null }
  box = o
}

// Результат в форме, привычной хукам: { error } как у supabase-js; queued=true — «принято локально, уйдёт при появлении сети».
export interface QResult { error: SbError | null; queued: boolean }

// Очередь пользователя с автосбросом: для чтения ожидающих записей (workoutOverlay) и подписки на её изменения.
export const outboxFor = (userId: string): Outbox => ensure(userId)

function ensure(userId: string): Outbox {
  const o = getOutbox()
  o.setUser(userId)
  if (!stop) stop = startAutoFlush(o)
  return o
}

async function run(userId: string, input: Parameters<Outbox['write']>[0]): Promise<QResult> {
  const r = await ensure(userId).write(input)
  if (r.status === 'rejected') return { error: r.raw ?? { message: r.error }, queued: false }
  return { error: null, queued: r.status === 'queued' }
}

export const qUpsert = (userId: string, table: string, key: string, payload: Record<string, unknown> | Record<string, unknown>[], onConflict: string): Promise<QResult> =>
  run(userId, { table, op: 'upsert', key, payload: payload, onConflict })

export const qUpdate = (userId: string, table: string, key: string, payload: Record<string, unknown>, match: Record<string, unknown>): Promise<QResult> =>
  run(userId, { table, op: 'update', key, payload, match })

export const qInsert = (userId: string, table: string, key: string, payload: Record<string, unknown>): Promise<QResult> =>
  run(userId, { table, op: 'insert', key, payload })

export const qDelete = (userId: string, table: string, key: string, match: Record<string, unknown>): Promise<QResult> =>
  run(userId, { table, op: 'delete', key, match })

export const dailyValueKey = (date: string, metricId: string): string => `daily_values:${date}:${metricId}`
