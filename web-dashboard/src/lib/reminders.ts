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
