import { beforeEach, describe, expect, it } from 'vitest'
import { getDayProgressSettings, setDayProgressSettings, type DayProgressSettings } from './lib/progressSettings'

// Поле `weekShape` («Вид недели» в глобальном хедере) пишет web-header; сохранение настроек из Дашборда его не стирает.
const S: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' }

describe('weekShape в day_progress_settings', () => {
  beforeEach(() => localStorage.clear())
  it('сохранение из Дашборда сохраняет вид недели, выбранный в хедере', () => {
    localStorage.setItem('day_progress_settings', JSON.stringify({ ...S, weekShape: 'classic' }))
    setDayProgressSettings({ ...S, includePlanned: false })
    const raw = JSON.parse(localStorage.getItem('day_progress_settings')!)
    expect(raw.weekShape).toBe('classic')
    expect(raw.includePlanned).toBe(false)
    expect(getDayProgressSettings().includePlanned).toBe(false)
  })
  it('если вид не выбирали — поле не появляется; битый JSON не ломает сохранение', () => {
    setDayProgressSettings(S)
    expect('weekShape' in JSON.parse(localStorage.getItem('day_progress_settings')!)).toBe(false)
    localStorage.setItem('day_progress_settings', '{bad')
    expect(() => setDayProgressSettings(S)).not.toThrow()
    expect(JSON.parse(localStorage.getItem('day_progress_settings')!)).toEqual(S)
  })
})
