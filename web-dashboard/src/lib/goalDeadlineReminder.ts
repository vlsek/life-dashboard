// Напоминание «скоро просрочка цели» (BACKLOG 47.2; ответ владельца 2026-10-07): у цели срок — дата без времени, поэтому «за 5 часов
// до конца дня» = с 19:00 локального времени в день срока. Плашка в приложении при открытии, без push. Здесь — только чистые функции
// без сети и DOM; запрос и таймер — в useDeadlineReminder.ts. Покрыто goalDeadlineReminder.test.ts.
export const DEADLINE_REMINDER_HOUR = 19

// Ключи localStorage: выключатель общий для Дашборда и страницы «Цели» (один origin), закрытие — на день.
export const DEADLINE_REMINDER_OFF_KEY = 'goal_deadline_reminder_off'
export const DEADLINE_REMINDER_DISMISS_KEY = 'goal_deadline_reminder_dismissed'

export interface DeadlineGoal {
  id: string
  name: string
  done: boolean | null
  deadline: string | null
}

// Локальное время устройства: getHours(), а не UTC — «19:00» у человека своё в любом поясе.
export function isReminderTime(now: Date, hour: number = DEADLINE_REMINDER_HOUR): boolean {
  return now.getHours() >= hour
}

// Цели, у которых срок именно СЕГОДНЯ и они ещё не выполнены (без срока, выполненные и с другой датой не напоминают).
export function dueTodayGoals(goals: DeadlineGoal[], todayIso: string): DeadlineGoal[] {
  return goals.filter((g) => !g.done && g.deadline === todayIso)
}

// Показывать плашку: включено, уже 19:00 или позже, есть что напоминать и сегодня её ещё не закрывали.
export function shouldShowDeadlineReminder(now: Date, count: number, dismissedOn: string | null, todayIso: string, enabled: boolean): boolean {
  return enabled && isReminderTime(now) && count > 0 && dismissedOn !== todayIso
}
