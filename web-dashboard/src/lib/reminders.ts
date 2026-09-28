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

// Показывать баннер "недоделанная неделя" только по сб/вс и только если неделя ещё не на 100%.
export function shouldShowWeekendReminder(dayOfWeek: number, weekTotalPct: number): boolean {
  return (dayOfWeek === 0 || dayOfWeek === 6) && weekTotalPct < 100
}
