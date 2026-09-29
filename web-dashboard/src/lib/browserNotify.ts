// Тонкая обёртка над Notification API — всё в try/catch: в приватном режиме, в старых браузерах и на
// iOS вне установленного PWA объекта Notification может не быть вовсе. Системные уведомления
// работают только пока страница открыта (пуш при закрытой странице — отдельная большая задача).
export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied'

export function notifyPermission(): NotifyPermission {
  try {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission as NotifyPermission
  } catch {
    return 'unsupported'
  }
}

// Вызывать только из обработчика клика — иначе браузер молча откажет.
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  try {
    if (typeof Notification === 'undefined') return 'unsupported'
    return (await Notification.requestPermission()) as NotifyPermission
  } catch {
    return notifyPermission()
  }
}

export function showSystemNotification(title: string, body: string, tag: string): boolean {
  try {
    if (notifyPermission() !== 'granted') return false
    new Notification(title, { body, tag }) // tag: одно и то же напоминание не задваивается
    return true
  } catch {
    return false
  }
}
