// Порт PWA-install логики из config.js (deferredInstallPrompt, isStandaloneApp,
// isIOSDevice, handleInstallClick) на Vue. beforeinstallprompt слушается один раз на
// модуль (как и в оригинале — событие per-page, не per-компонент), а не при каждом
// монтировании AppShell.

let deferredPrompt: { prompt: () => void; userChoice: Promise<unknown> } | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as unknown as { prompt: () => void; userChoice: Promise<unknown> }
  })
}

export function isStandaloneApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

// Возвращает true, если получилось показать нативный диалог установки. false значит,
// что нативного промпта нет (например, iOS или уже отклонён ранее) — тогда вызывающая
// сторона должна показать инструкции сама (см. InstallModal.vue).
export async function handleInstallClick(): Promise<boolean> {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    return true
  }
  return false
}
