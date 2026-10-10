// Общий канал «аватар изменился» (BACKLOG 44.17 + раздел 43 9:41): после успешной записи profiles.avatar_url страница («Аккаунт», Дашборд)
// сообщает новый адрес, левое меню (web-header) меняет аватар сразу, без обновления страницы. window-событие — для блоков той же страницы,
// BroadcastChannel — для других открытых вкладок. Пилоты изолированы, поэтому КОПИЯ лежит в web-account, web-header и web-dashboard
// (менять ВМЕСТЕ — страж avatarEvents.test.ts в web-account сверяет файлы).
export const AVATAR_CHANGED = 'avatar:changed'
const CHANNEL = 'life-avatar'
const MAX_LEN = 100000

export interface AvatarChangedDetail {
  avatar_url: string | null // новый адрес (https-ссылка или data-URI животного) или null — аватар убрали
}

// Из чужого сообщения берём только известное поле нужного вида: https-ссылка или SVG data-URI; мусор — null (игнорируем).
export function parseAvatarDetail(raw: unknown): AvatarChangedDetail | null {
  if (!raw || typeof raw !== 'object' || !('avatar_url' in raw)) return null
  const v = (raw as { avatar_url: unknown }).avatar_url
  if (v === null) return { avatar_url: null }
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_LEN) return null
  return /^https:\/\/\S+$/i.test(v) || v.startsWith('data:image/svg+xml;charset=utf-8,') ? { avatar_url: v } : null
}

export function notifyAvatarChanged(detail: AvatarChangedDetail): void {
  window.dispatchEvent(new CustomEvent<AvatarChangedDetail>(AVATAR_CHANGED, { detail }))
  try {
    const ch = new BroadcastChannel(CHANNEL)
    ch.postMessage(detail)
    ch.close()
  } catch {
    // нет BroadcastChannel — остаётся событие window в этой вкладке
  }
}

// Подписка; возвращает функцию отписки. Колбэк может прийти дважды (window и канал) — он должен быть идемпотентным.
export function onAvatarChanged(cb: (d: AvatarChangedDetail) => void): () => void {
  const onWin = (e: Event) => {
    const d = parseAvatarDetail((e as CustomEvent).detail)
    if (d) cb(d)
  }
  window.addEventListener(AVATAR_CHANGED, onWin)
  let ch: BroadcastChannel | null = null
  try {
    ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e: MessageEvent) => {
      const d = parseAvatarDetail(e.data)
      if (d) cb(d)
    }
  } catch {
    ch = null
  }
  return () => {
    window.removeEventListener(AVATAR_CHANGED, onWin)
    ch?.close()
  }
}
