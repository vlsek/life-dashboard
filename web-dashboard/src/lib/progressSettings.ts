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
  localStorage.setItem('day_progress_settings', JSON.stringify(s))
}
