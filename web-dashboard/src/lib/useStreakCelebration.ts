import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { StreakItem } from './streaks'
import { findPending } from './streakMilestones'
import type { Milestone, ShownState } from './streakMilestones'

// Показ плашек за серии (BACKLOG 13): что уже показано и выключатель лежат в localStorage — раздела настроек пока нет,
// позже переедет в «Глобальные настройки» (6.2). Всё в try/catch: приватный режим/отключённое хранилище не должны ломать Дашборд.
const OFF_KEY = 'streak_celebrations_off'
const shownKey = (userId: string) => 'streak_milestones_shown:' + userId

export function celebrationsEnabled(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== '1'
  } catch {
    return true
  }
}

export function setCelebrationsEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OFF_KEY)
    else localStorage.setItem(OFF_KEY, '1')
  } catch {
    /* хранилище недоступно — выключатель просто не запомнится */
  }
}

export function loadShown(userId: string): ShownState | null {
  try {
    const raw = localStorage.getItem(shownKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ShownState) : null
  } catch {
    return null
  }
}

export function saveShown(userId: string, state: ShownState): void {
  try {
    localStorage.setItem(shownKey(userId), JSON.stringify(state))
  } catch {
    /* см. выше */
  }
}

// Следит за списком серий Дашборда: при каждом пересчёте (загрузка страницы, отметка метрики) решает, не пора ли поздравить.
export function useStreakCelebration(getUserId: () => string | null, streaks: Ref<StreakItem[]>) {
  const pending = ref<Milestone | null>(null)

  function evaluate() {
    const userId = getUserId()
    if (!userId || streaks.value.length === 0) return
    if (pending.value) return // уже висит плашка — следующая дождётся её закрытия
    const { milestone, nextShown } = findPending(loadShown(userId), streaks.value, { silent: !celebrationsEnabled() })
    saveShown(userId, nextShown)
    pending.value = milestone
  }

  // и за списком серий, и за пользователем: авторизация может стать готовой позже, чем посчитаются серии
  watch([streaks, getUserId], evaluate)

  // Закрыли — следующая серия, если ждёт очереди, поздравится при следующем пересчёте/загрузке: плашки подряд раздражают.
  function close() {
    pending.value = null
  }
  // «Больше не показывать»: выключаем и закрываем
  function disable() {
    setCelebrationsEnabled(false)
    pending.value = null
  }

  return { pending, close, disable, evaluate }
}
