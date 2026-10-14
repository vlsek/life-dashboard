// «Человек что-то сохранил» (BACKLOG 52.1 срез 4): шапка есть на каждой странице, поэтому по успешным записям в базу (а не по событиям отдельных
// страниц) узнаёт о действии везде — Цели, Тренировки, Навыки… — и запускает проверку достижений. Свой отдельный сигнал, не `dashboard:data-changed`:
// на тот подписаны блоки Дашборда, лишних перезагрузок им не нужно.
export const WRITE_SIGNAL = 'gh:data-written'

const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE']
// Фоновые записи, не действия человека: отметка «был в сети» и синхронизация настроек оформления (profiles).
const IGNORED = /\/rest\/v1\/(rpc\/touch_last_seen|profiles)(\?|\/|$)/

export function isActionWrite(method: string | undefined, url: string): boolean {
  if (!method || !WRITE_METHODS.includes(method.toUpperCase())) return false
  if (!url.includes('/rest/v1/')) return false
  return !IGNORED.test(url)
}

// Оборачивает window.fetch (один раз) и шлёт WRITE_SIGNAL после успешной записи. Возвращает снятие обёртки (только если fetch всё ещё наш).
export function installWriteSignal(): () => void {
  const w = window as unknown as { fetch: typeof fetch; __ghWriteSignal?: boolean }
  if (w.__ghWriteSignal || typeof w.fetch !== 'function') return () => {}
  const original = w.fetch
  const wrapped: typeof fetch = async (input, init) => {
    const res = await original.call(window, input, init)
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      const method = init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')
      if (res.ok && isActionWrite(method, url)) window.dispatchEvent(new Event(WRITE_SIGNAL))
    } catch {
      /* сигнал — вспомогательный: ответ страницы важнее */
    }
    return res
  }
  w.fetch = wrapped
  w.__ghWriteSignal = true
  return () => {
    if (w.fetch === wrapped) w.fetch = original
    w.__ghWriteSignal = false
  }
}
