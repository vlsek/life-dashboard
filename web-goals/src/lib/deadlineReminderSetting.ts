// Выключатель напоминания «скоро просрочка цели» (BACKLOG 47.2). Плашку показывает Дашборд (web-dashboard/src/lib/goalDeadlineReminder.ts),
// а включить/выключить её можно здесь, на странице «Цели». Оба пилота на одном origin и читают ОДИН ключ localStorage — менять вместе
// (страж deadlineReminderSetting.test.ts сверяет ключ с файлом Дашборда). Значение '1' = выключено; по умолчанию напоминание включено.
export const DEADLINE_REMINDER_OFF_KEY = 'goal_deadline_reminder_off'

export function isDeadlineReminderEnabled(): boolean {
  try {
    return localStorage.getItem(DEADLINE_REMINDER_OFF_KEY) !== '1'
  } catch {
    return true
  }
}

export function setDeadlineReminderEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(DEADLINE_REMINDER_OFF_KEY)
    else localStorage.setItem(DEADLINE_REMINDER_OFF_KEY, '1')
  } catch {
    /* приватный режим — просто не запоминаем */
  }
}
