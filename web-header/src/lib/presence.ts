import { sb } from './supabase'

// «Был в сети» (BACKLOG 48.2): пока вкладка открыта и видна, раз в ~2 минуты ставим себе отметку на сервере (touch_last_seen,
// миграция 069). Сервер сам не пишет чаще раза в минуту, поэтому лишние вызовы безвредны. Не применена миграция / нет сети — молча
// ничего не происходит (ошибки RPC глотаем: отметка не должна мешать странице).
export const HEARTBEAT_MS = 120_000

export async function touchLastSeen(): Promise<void> {
  try {
    await sb.rpc('touch_last_seen')
  } catch {
    /* без отметки — не страшно */
  }
}

// Запуск отметок для страницы; возвращает функцию остановки (для тестов и повторного запуска)
export function startPresenceHeartbeat(): () => void {
  const beat = () => {
    if (document.visibilityState === 'visible') void touchLastSeen()
  }
  beat()
  const timer = setInterval(beat, HEARTBEAT_MS)
  document.addEventListener('visibilitychange', beat) // вернулись на вкладку — отмечаемся сразу
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', beat)
  }
}
