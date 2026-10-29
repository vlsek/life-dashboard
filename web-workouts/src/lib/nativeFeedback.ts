// Короткий вибро-отклик в приложении Android (BACKLOG 66.9). `android-app/native-shell.js` кладёт `__ldNative.haptic`; в обычном браузере
// объекта нет — функция ничего не делает и никогда не бросает.
type NativeShell = { haptic?: (kind: string) => unknown }

export function haptic(kind: 'light' | 'medium' | 'success' = 'light'): void {
  try {
    const shell = (globalThis as { __ldNative?: NativeShell }).__ldNative
    if (shell && typeof shell.haptic === 'function') void Promise.resolve(shell.haptic(kind)).catch(() => undefined)
  } catch {
    /* отклик — косметика */
  }
}
