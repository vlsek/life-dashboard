// Фоновый режим страницы «Достижения» (BACKLOG 52.1 срез 2): общая шапка раз в несколько минут грузит эту страницу в скрытом iframe с `?bg=1`,
// страница делает ровно то же, что при обычном заходе (считает, дописывает новые достижения, выдаёт монетки), ничего не рисует и сообщает
// родителю, что открыто именно сейчас — тот показывает поздравление на ЛЮБОЙ странице. Протокол сообщений общий с web-header (`achievementWatcher.ts`).
export const BG_MSG_NEW = 'gh-ach-new'
export const BG_MSG_DONE = 'gh-ach-done'

export interface BgItem {
  key: string
  title: string
  reward: string | null // готовая строка награды («+50 монет»), если у достижения есть награда
}

export function isBgMode(): boolean {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get('bg') === '1'
  } catch {
    return false
  }
}

export function postToParent(msg: { type: string; items?: BgItem[] }): void {
  try {
    window.parent.postMessage(msg, window.location.origin)
  } catch {
    /* родитель недоступен — фоновая проверка просто молчит */
  }
}
