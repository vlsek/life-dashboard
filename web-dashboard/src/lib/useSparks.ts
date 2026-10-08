import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { DATA_CHANGED } from './events'

// «Огоньки стриков» (BACKLOG 46.3, миграция 057): баланс валюты Магазина в «Профиле». Начисление делает БД — функция sync_streak_sparks()
// считает выполненные сегодня/вчера метрики и сразу возвращает баланс; клиент зовёт её при открытии страницы и через RECONCILE_MS после последнего
// изменения данных (как пересчёт монет). null — функции нет (миграция не применена) или сбой: блок просто скрыт, остальное работает.
export const SPARKS_RECONCILE_MS = 1200

export function parseSparksBalance(data: unknown): number | null {
  const row = Array.isArray(data) ? data[0] : data
  const v = row && typeof row === 'object' ? (row as { balance?: unknown }).balance : null
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

export function useSparks() {
  const sparks = ref<number | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function sync() {
    try {
      const { data, error } = await sb.rpc('sync_streak_sparks')
      sparks.value = error ? null : parseSparksBalance(data)
    } catch {
      sparks.value = null
    }
  }

  function onDataChanged() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void sync(), SPARKS_RECONCILE_MS)
  }

  onMounted(() => {
    void sync()
    window.addEventListener(DATA_CHANGED, onDataChanged)
  })
  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
    window.removeEventListener(DATA_CHANGED, onDataChanged)
  })

  return { sparks, sync }
}
