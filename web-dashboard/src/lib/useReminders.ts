import { ref } from 'vue'
import { sb } from './supabase'
import { addDaysIso, fmtDate, todayStr } from './date'
import { MAX_REMIND_DAYS, classifyMilestoneReminders, shouldShowWeekendReminder, type MilestoneReminderCounts } from './reminders'

// Отдельный композабл, а не часть useDashboard.ts — по тому же принципу, что и lib/useWater.ts
// (см. коммит агента 4, v0.84): несколько человек переносят разные блоки Дашборда одновременно,
// отдельные файлы меньше шансов столкнуться друг с другом при мерже. Портировано из
// checkMilestonesReminder()/checkWeekendGoalReminder() в dashboard.js.
export function useReminders() {
  const milestonesReminder = ref<MilestoneReminderCounts | null>(null)
  const weekendReminderVisible = ref(false)

  async function loadMilestonesReminder(userId: string) {
    try {
      if (localStorage.getItem('ms_reminder_dismissed') === fmtDate(new Date())) return
    } catch {
      /* приватный режим — просто не запоминаем закрытие */
    }
    const today = todayStr()
    // окно запроса — максимальное напоминание вехи; точный порог у каждой вехи считает classifyMilestoneReminders
    const farDate = addDaysIso(today, MAX_REMIND_DAYS)
    const run = (cols: string) => sb.from('milestones').select(cols).eq('user_id', userId).eq('done', false).not('due_date', 'is', null).lte('due_date', farDate)
    let res = await run('due_date, remind_days')
    if (res.error) res = await run('due_date') // миграция 116 не накатана — работает как раньше (за 7 дней)
    const { data, error } = res
    if (error || !data?.length) return // нет таблицы (миграция не накатана) или нечего показывать — молча ничего
    const counts = classifyMilestoneReminders(data as unknown as { due_date: string; remind_days?: number | null }[], fmtDate(new Date()))
    if (counts.overdue + counts.soon === 0) return
    milestonesReminder.value = counts
  }

  function dismissMilestonesReminder() {
    try {
      localStorage.setItem('ms_reminder_dismissed', fmtDate(new Date()))
    } catch {
      /* ignore */
    }
    milestonesReminder.value = null
  }

  async function checkWeekendReminder(weekTotalPct: number) {
    const dismissedKey = 'week_reminder_dismissed:' + fmtDate(new Date())
    try {
      if (localStorage.getItem(dismissedKey)) return
    } catch {
      /* ignore */
    }
    let createdAt: string | null = null
    try {
      createdAt = (await sb.auth.getSession()).data.session?.user.created_at ?? null // дата создания аккаунта: в первую неделю итогов нет (BACKLOG 57.5)
    } catch {
      /* без даты — как раньше */
    }
    weekendReminderVisible.value = shouldShowWeekendReminder(new Date().getDay(), weekTotalPct, createdAt)
  }

  function dismissWeekendReminder() {
    try {
      localStorage.setItem('week_reminder_dismissed:' + fmtDate(new Date()), '1')
    } catch {
      /* ignore */
    }
    weekendReminderVisible.value = false
  }

  return { milestonesReminder, weekendReminderVisible, loadMilestonesReminder, dismissMilestonesReminder, checkWeekendReminder, dismissWeekendReminder }
}
