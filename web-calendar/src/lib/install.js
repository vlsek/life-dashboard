// Порт PWA-install логики из config.js (deferredInstallPrompt, isStandaloneApp,
// isIOSDevice, handleInstallClick) на Vue. beforeinstallprompt слушается один раз на
// модуль (как и в оригинале — событие per-page, не per-компонент), а не при каждом
// монтировании AppShell.
let deferredPrompt = null;
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });
}
export function isStandaloneApp() {
    return (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true);
}
export function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
// Возвращает true, если получилось показать нативный диалог установки. false значит,
// что нативного промпта нет (например, iOS или уже отклонён ранее) — тогда вызывающая
// сторона должна показать инструкции сама (см. InstallModal.vue).
export async function handleInstallClick() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        return true;
    }
    return false;
}
