import { ref } from 'vue'

// Установка приложения (PWA) на Дашборде — BACKLOG 🎨 п.2: «предложение добавить приложение прямо из
// адресной строки». Браузер сам решает, когда сайт можно установить, и шлёт `beforeinstallprompt`; мы
// перехватываем событие, прячем стандартную мини-панель и показываем СВОЮ закрывающуюся плашку
// (InstallBanner.vue). На iOS события нет — там показываем подсказку «Поделиться → На экран Домой».
// Состояние реактивное (событие приходит позже монтирования). Слушатели ставятся один раз при загрузке модуля.
interface DeferredPrompt {
  prompt: () => void | Promise<void>
  userChoice: Promise<unknown>
}

let deferred: DeferredPrompt | null = null
export const installAvailable = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferred = e as unknown as DeferredPrompt
    installAvailable.value = true
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installAvailable.value = false
  })
}

export function isStandaloneApp(): boolean {
  try {
    return (
      (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

export function isIOSDevice(): boolean {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

// true — нативный диалог показан; false — события нет (iOS или браузер ещё не разрешил/уже отклонено).
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const p = deferred
  deferred = null
  installAvailable.value = false // событие одноразовое: повторно prompt() вызвать нельзя
  await p.prompt()
  await p.userChoice
  return true
}

// Закрытие плашки запоминаем на 14 дней (потом можно напомнить, но не навязываемся).
export const INSTALL_DISMISS_KEY = 'install_banner_dismissed'
export const INSTALL_DISMISS_DAYS = 14

export function isInstallDismissed(now: number = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(INSTALL_DISMISS_KEY))
    return Number.isFinite(at) && at > 0 && now - at < INSTALL_DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

export function dismissInstall(now: number = Date.now()): void {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(now))
  } catch {
    /* приватный режим — просто не запомним */
  }
}
