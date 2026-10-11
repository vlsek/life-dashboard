import { addDaysIso } from './date'

// Порог "срок в ближайшую неделю" — календарные +7 дней от сегодня, не Date.now()+7*86400000:
// в сутки перехода на летнее/зимнее время миллисекундная арифметика на час короче/длиннее
// суток и в редких случаях даёт не тот календарный день. Вынесено отдельной функцией ради теста.
export function soonDateFor(todayStr: string): string {
  return addDaysIso(todayStr, 7)
}

export interface MilestoneReminderCounts {
  overdue: number
  soon: number
}

// Разбивка на "просрочено"/"срок в ближайшую неделю" — портировано из checkMilestonesReminder().
// Вход — уже отфильтрованный запрос (done=false, due_date<=today+7d), эта функция только считает.
export function classifyMilestoneReminders(rows: { due_date: string }[], todayStr: string): MilestoneReminderCounts {
  let overdue = 0
  let soon = 0
  for (const r of rows) {
    if (r.due_date < todayStr) overdue++
    else soon++
  }
  return { overdue, soon }
}

// Новому пользователю (аккаунт младше 7 дней — первая неделя) «итоги недели» не нужны: подводить нечего (BACKLOG 57.5, владелец 2026-10-11: «для новых
// пользователей не надо проводить итоги недели, а то это как-то глупо»). Нет даты создания — считаем аккаунт не новым, как и раньше.
export const NEW_ACCOUNT_DAYS = 7
export function isFirstWeekAccount(createdAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) return false
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t)) return false
  return now.getTime() - t < NEW_ACCOUNT_DAYS * 86_400_000
}

// Показывать баннер "недоделанная неделя" только по сб/вс, только если неделя ещё не на 100% и только не в первую неделю аккаунта.
export function shouldShowWeekendReminder(dayOfWeek: number, weekTotalPct: number, accountCreatedAt?: string | null, now: Date = new Date()): boolean {
  if (isFirstWeekAccount(accountCreatedAt, now)) return false
  return (dayOfWeek === 0 || dayOfWeek === 6) && weekTotalPct < 100
}
