export type DayPlace = 'avatar' | 'header' | 'off'
export type WeekPlace = 'profile' | 'header' | 'off'

export interface DayProgressSettings {
  enabled: boolean
  includePlanned: boolean
  includeMetrics: boolean
  dayPlace: DayPlace
  weekPlace: WeekPlace
}

export const BONUS_PCT_PER_ITEM = 20

// В дне один бонусный пункт (⭐) даёт +20% сверху. В неделе пунктов в разы больше, и те же +20% за
// один пункт перекосили бы кольцо, поэтому бонус недели пропорционален: +20%/7 за пункт — так
// бонус, сделанный каждый день, даёт неделе ровно те же +20%, что дню. Одна цифра после запятой.
export const WEEK_DAYS = 7
export function weekBonusPct(doneBonusItems: number): number {
  return Math.round(((doneBonusItems * BONUS_PCT_PER_ITEM) / WEEK_DAYS) * 10) / 10
}

const DEFAULTS: DayProgressSettings = {
  enabled: true,
  includePlanned: true,
  includeMetrics: true,
  dayPlace: 'avatar',
  weekPlace: 'profile',
}

export function getDayProgressSettings(): DayProgressSettings {
  try {
    const raw = localStorage.getItem('day_progress_settings')
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw)
    // старый формат (displayMode) → новые поля — тот же миграционный код, что и в config.js
    if (saved.displayMode && !saved.dayPlace) {
      if (saved.displayMode === 'header') {
        saved.dayPlace = 'header'
        saved.weekPlace = 'profile'
      } else if (saved.displayMode === 'header_week') {
        saved.dayPlace = 'off'
        saved.weekPlace = 'header'
      } else {
        saved.dayPlace = 'avatar'
        saved.weekPlace = 'profile'
      }
    }
    delete saved.displayMode
    return { ...DEFAULTS, ...saved }
  } catch {
    return DEFAULTS
  }
}

export function setDayProgressSettings(s: DayProgressSettings) {
  // Поле `weekShape` (вид недели в шапке) принадлежит глобальному хедеру; Дашборд его не знает, но и стирать не должен.
  let weekShape: unknown
  try {
    weekShape = JSON.parse(localStorage.getItem('day_progress_settings') || '{}')?.weekShape
  } catch {
    weekShape = undefined
  }
  localStorage.setItem('day_progress_settings', JSON.stringify(weekShape ? { ...s, weekShape } : s))
}
