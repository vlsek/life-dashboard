import { ref } from 'vue'
import { sb } from './supabase'
import { fmtDate, todayStr } from './date'
import { classifyMilestoneReminders, shouldShowWeekendReminder, soonDateFor, type MilestoneReminderCounts } from './reminders'

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
    const soonDate = soonDateFor(todayStr())
    const { data, error } = await sb
      .from('milestones')
      .select('due_date')
      .eq('user_id', userId)
      .eq('done', false)
      .not('due_date', 'is', null)
      .lte('due_date', soonDate)
    if (error || !data?.length) return // нет таблицы (миграция не накатана) или нечего показывать — молча ничего
    milestonesReminder.value = classifyMilestoneReminders(data as { due_date: string }[], fmtDate(new Date()))
  }

  function dismissMilestonesReminder() {
    try {
      localStorage.setItem('ms_reminder_dismissed', fmtDate(new Date()))
    } catch {
      /* ignore */
    }
    milestonesReminder.value = null
  }

  function checkWeekendReminder(weekTotalPct: number) {
    const dismissedKey = 'week_reminder_dismissed:' + fmtDate(new Date())
    try {
      if (localStorage.getItem(dismissedKey)) return
    } catch {
      /* ignore */
    }
    weekendReminderVisible.value = shouldShowWeekendReminder(new Date().getDay(), weekTotalPct)
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
