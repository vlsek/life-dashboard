import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { celebrationsEnabled, setCelebrationsEnabled } from './useStreakCelebration'
import { loadUnlockedKeys, saveUnlockedKeys } from './achievementKeys'
import { perfectKey, perfectOutcome } from './perfectDay'
import type { NextPerfect, PerfectDayInfo } from './perfectDay'

// Окно-поздравление в идеальный день (BACKLOG раздел 36). Следит за расчётом Дашборда (он пересчитывается при каждой записи и при
// загрузке): когда сегодняшний день стал идеальным — выдаёт достижения «Идеальных дней» (если их ещё нет в хранилище) и один раз
// в день показывает окно. «Один раз в день» — по дате в localStorage; день, ставший неидеальным и снова идеальным, второй раз не
// поздравляется. Выключатель поздравлений (как у серий) глушит окно, но достижения всё равно выдаются.
const shownKey = (userId: string) => 'perfect_day_shown:' + userId

export function loadShownDate(userId: string): string | null {
  try {
    return localStorage.getItem(shownKey(userId))
  } catch {
    return null
  }
}

export function saveShownDate(userId: string, date: string): void {
  try {
    localStorage.setItem(shownKey(userId), date)
  } catch {
    /* без хранилища окно может показаться повторно при перезагрузке — не страшно */
  }
}

export interface PerfectDayPopup {
  count: number // всего идеальных дней
  gained: number | null // порог самого высокого достижения, открытого сейчас (null — новых нет)
  next: NextPerfect | null // сколько осталось до следующего (null — все получены)
}

export function usePerfectDay(getUserId: () => string | null, info: Ref<PerfectDayInfo | null>) {
  const pending = ref<PerfectDayPopup | null>(null)
  let busy = false

  async function evaluate() {
    const userId = getUserId()
    const cur = info.value
    if (!userId || !cur || !cur.todayPerfect || busy) return
    if (loadShownDate(userId) === cur.date) return
    busy = true
    saveShownDate(userId, cur.date) // сразу: параллельный пересчёт не покажет окно дважды
    try {
      const { keys, mode } = await loadUnlockedKeys(userId)
      const out = perfectOutcome(cur.count, keys)
      if (out.newTargets.length) await saveUnlockedKeys(userId, mode, out.newTargets.map(perfectKey), new Date().toISOString())
      if (celebrationsEnabled()) {
        pending.value = { count: cur.count, gained: out.newTargets.length ? out.newTargets[out.newTargets.length - 1] : null, next: out.next }
      }
    } finally {
      busy = false
    }
  }

  watch([info, getUserId], () => void evaluate(), { immediate: true })

  return {
    pending,
    close: () => {
      pending.value = null
    },
    disable: () => {
      setCelebrationsEnabled(false) // «Больше не показывать» — общий выключатель поздравлений (тот же, что у серий)
      pending.value = null
    },
  }
}
