// Общий канал «выбор кастомизации изменился» (BACKLOG раздел 43, 9:41: надеть/снять рамку применяется без обновления страницы).
// Страница «Кастомизация» после успешной записи в profiles.customization сообщает новый выбор; левое меню (web-header) и Дашборд
// (кольцо прогресса вокруг аватарки) подхватывают его сразу. window-событие — для блоков той же страницы, BroadcastChannel — для
// других открытых вкладок (Дашборд/Сообщество в соседней вкладке). Пилоты изолированы, поэтому КОПИЯ лежит в web-customization,
// web-header, web-dashboard и web-account (менять ВМЕСТЕ — страж customizationEvents.test.ts в web-customization сверяет файлы).
export const CUSTOMIZATION_CHANGED = 'customization:changed'
const CHANNEL = 'life-customization'

export interface CustomizationChangedDetail {
  avatar_frame: string | null // ключ выбранной рамки или null — рамку сняли
}

// Из чужого сообщения берём только известное поле нужного типа; мусор — null (игнорируем).
export function parseCustomizationDetail(raw: unknown): CustomizationChangedDetail | null {
  if (!raw || typeof raw !== 'object' || !('avatar_frame' in raw)) return null
  const v = (raw as { avatar_frame: unknown }).avatar_frame
  if (v === null) return { avatar_frame: null }
  return typeof v === 'string' && v.length > 0 && v.length <= 64 ? { avatar_frame: v } : null
}

export function notifyCustomizationChanged(detail: CustomizationChangedDetail): void {
  window.dispatchEvent(new CustomEvent<CustomizationChangedDetail>(CUSTOMIZATION_CHANGED, { detail }))
  try {
    const ch = new BroadcastChannel(CHANNEL)
    ch.postMessage(detail)
    ch.close()
  } catch {
    // нет BroadcastChannel (старый браузер) — остаётся событие window в этой вкладке
  }
}

// Подписка; возвращает функцию отписки. Колбэк может прийти дважды (window и канал) — он должен быть идемпотентным.
export function onCustomizationChanged(cb: (d: CustomizationChangedDetail) => void): () => void {
  const onWin = (e: Event) => {
    const d = parseCustomizationDetail((e as CustomEvent).detail)
    if (d) cb(d)
  }
  window.addEventListener(CUSTOMIZATION_CHANGED, onWin)
  let ch: BroadcastChannel | null = null
  try {
    ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e: MessageEvent) => {
      const d = parseCustomizationDetail(e.data)
      if (d) cb(d)
    }
  } catch {
    ch = null
  }
  return () => {
    window.removeEventListener(CUSTOMIZATION_CHANGED, onWin)
    ch?.close()
  }
}
