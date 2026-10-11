// Фоновая проверка новых достижений (BACKLOG 52.1 срез 2): достижения считает и записывает страница «Достижения», поэтому раньше о новом
// человек узнавал только открыв её. Теперь шапка (она есть на каждой странице) раз в несколько минут грузит эту страницу в скрытом iframe
// `/achievements/?bg=1`; та делает обычную загрузку и сообщает, что открыто именно сейчас. «Уже поздравляли» хранит сам сервер: достижение
// записывается в `unlocked` в момент первой проверки, поэтому новое устройство/аккаунт не получает повторов. Чистые части — без DOM (тесты).
export const BG_MSG_NEW = 'gh-ach-new'
export const BG_MSG_DONE = 'gh-ach-done'
export const CHECK_KEY = 'gh_ach_check'
export const CHECK_EVERY_MS = 10 * 60 * 1000
export const IFRAME_TIMEOUT_MS = 90 * 1000

export interface WatchItem {
  key: string
  title: string
  reward: string | null
}

// Пора ли проверять: нет отметки, она из будущего (часы переведены) или давно — да.
export function isCheckDue(last: number | null, now: number, every = CHECK_EVERY_MS): boolean {
  if (last == null || !Number.isFinite(last)) return true
  if (last > now) return true
  return now - last >= every
}

// Разбор сообщения iframe: только наш протокол, только строки; всё чужое — null.
export function parseWatchMessage(data: unknown): { type: typeof BG_MSG_NEW; items: WatchItem[] } | { type: typeof BG_MSG_DONE } | null {
  if (!data || typeof data !== 'object') return null
  const d = data as { type?: unknown; items?: unknown }
  if (d.type === BG_MSG_DONE) return { type: BG_MSG_DONE }
  if (d.type !== BG_MSG_NEW || !Array.isArray(d.items)) return null
  const items: WatchItem[] = []
  for (const raw of d.items) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as { key?: unknown; title?: unknown; reward?: unknown }
    if (typeof r.key !== 'string' || typeof r.title !== 'string') continue
    items.push({ key: r.key, title: r.title, reward: typeof r.reward === 'string' ? r.reward : null })
  }
  return items.length ? { type: BG_MSG_NEW, items } : null
}

export const WATCH_SKIP = /^\/(login|onboarding|admin|legacy|achievements)(\/|\.html|$)/ // на самой странице «Достижения» поздравляет она сама

function readLast(): number | null {
  try {
    const v = localStorage.getItem(CHECK_KEY)
    return v == null ? null : Number(v)
  } catch {
    return null
  }
}

function writeLast(now: number) {
  try {
    localStorage.setItem(CHECK_KEY, String(now))
  } catch {
    /* приватный режим: проверим снова при следующей странице */
  }
}

// Запускает проверку и повторяет её, пока страница открыта и видна. onNew получает список новых достижений.
export function startAchievementWatcher(onNew: (items: WatchItem[]) => void): () => void {
  let frame: HTMLIFrameElement | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const cleanup = () => {
    if (timer) clearTimeout(timer)
    timer = null
    frame?.remove()
    frame = null
  }

  const onMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin || !frame || e.source !== frame.contentWindow) return
    const msg = parseWatchMessage(e.data)
    if (!msg) return
    if (msg.type === BG_MSG_NEW) onNew(msg.items)
    else cleanup()
  }

  const check = () => {
    if (frame || document.visibilityState === 'hidden') return
    const now = Date.now()
    if (!isCheckDue(readLast(), now)) return
    writeLast(now)
    frame = document.createElement('iframe')
    frame.src = '/achievements/?bg=1'
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.title = ''
    frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:360px;height:240px;border:0;visibility:hidden;pointer-events:none'
    document.body.appendChild(frame)
    timer = setTimeout(cleanup, IFRAME_TIMEOUT_MS)
  }

  window.addEventListener('message', onMessage)
  const interval = setInterval(check, 60 * 1000)
  const onVisible = () => document.visibilityState === 'visible' && check()
  document.addEventListener('visibilitychange', onVisible)
  setTimeout(check, 4000) // не мешаем первой отрисовке страницы
  return () => {
    window.removeEventListener('message', onMessage)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(interval)
    cleanup()
  }
}
