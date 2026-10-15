import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 44.8 срез 2: ключ настройки «Показывать» в «Календаре» должен быть в списке синхронизации шапки — иначе она не поедет в профиль
// (ui_settings, миграция 064) и на втором устройстве всё покажется заново. Ключ в пилоте и в SYNC_KEYS не должны разойтись.
const read = (p: string): string => readFileSync(p, 'utf-8')

describe('calendar_show: календарь ↔ синхронизация профиля', () => {
  it('ключ из web-calendar есть в SYNC_KEYS шапки', () => {
    const m = read('../web-calendar/src/lib/calendarShow.ts').match(/export const SHOW_KEY = '([a-z_]+)'/)
    expect(m).not.toBeNull()
    expect(read('../web-header/src/lib/uiSettingsSync.ts')).toContain(`'${m![1]}', //`)
  })
  it('страница читает и пишет именно этот ключ через calendarShow (а не свой localStorage)', () => {
    const app = read('../web-calendar/src/App.vue')
    expect(app).toContain('loadShow()')
    expect(app).toContain('saveShow(')
    expect(app).not.toMatch(/localStorage\.(get|set)Item\('calendar_show'/)
  })
})
