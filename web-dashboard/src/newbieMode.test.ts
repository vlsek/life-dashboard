import { beforeEach, describe, expect, it } from 'vitest'
// @ts-ignore — node:fs для сверки исходников (как в соседних тестах)
import { readFileSync } from 'node:fs'
import { NEWBIE_DAYS, SHOW_ALL_KEY, accountAgeDays, daysLeft, isBlockInNewbie, isNewbie, readShowAll, writeShowAll } from './lib/newbieMode'

// BACKLOG 49.5 (решение владельца 2026-10-29): первые 7 дней — на Дашборде только «Метрики дня»; «Показать всё» открывает остальное.
const NOW = Date.parse('2026-10-29T12:00:00Z')
const ago = (days: number) => new Date(NOW - days * 86400_000).toISOString()

beforeEach(() => localStorage.clear())

describe('кто «новичок»', () => {
  it('аккаунт младше 7 дней — новичок; ровно 7 дней и старше — нет', () => {
    expect(NEWBIE_DAYS).toBe(7)
    expect(isNewbie(ago(0.2), false, NOW)).toBe(true)
    expect(isNewbie(ago(6.9), false, NOW)).toBe(true)
    expect(isNewbie(ago(7), false, NOW)).toBe(false)
    expect(isNewbie(ago(400), false, NOW)).toBe(false)
  })
  it('«Показать всё» выключает режим; нет даты, мусор или дата из будущего — режим не включаем (не прячем блоки зря)', () => {
    expect(isNewbie(ago(1), true, NOW)).toBe(false)
    for (const bad of [null, undefined, '', 'вчера', new Date(NOW + 5 * 86400_000).toISOString()]) expect(isNewbie(bad as string, false, NOW), String(bad)).toBe(false)
    expect(accountAgeDays('мусор', NOW)).toBeNull()
  })
  it('сколько дней осталось: не меньше 1, пока режим включён', () => {
    expect(daysLeft(ago(0.1), NOW)).toBe(7)
    expect(daysLeft(ago(3), NOW)).toBe(4)
    expect(daysLeft(ago(6.95), NOW)).toBe(1)
  })
})

describe('что остаётся на экране', () => {
  it('только «Метрики дня» (в них «Цели на сегодня»); профиль, графики и виджеты — под «Показать всё»', () => {
    expect(isBlockInNewbie('daily')).toBe(true)
    for (const k of ['profile', 'charts', 'widgets']) expect(isBlockInNewbie(k), k).toBe(false)
  })
})

describe('выбор «Показать всё» помнится', () => {
  it('ключ dash_show_all = 1; без записи — false', () => {
    expect(SHOW_ALL_KEY).toBe('dash_show_all')
    expect(readShowAll()).toBe(false)
    expect(writeShowAll()).toBe(true)
    expect(localStorage.getItem('dash_show_all')).toBe('1')
    expect(readShowAll()).toBe(true)
  })
  it('ключ едет между устройствами (SYNC_KEYS шапки)', () => {
    expect(readFileSync('../web-header/src/lib/uiSettingsSync.ts', 'utf-8')).toContain("'dash_show_all',")
  })
})

describe('Дашборд подключён', () => {
  const app: string = readFileSync('src/App.vue', 'utf-8')
  const dash: string = readFileSync('src/lib/useDashboard.ts', 'utf-8')
  it('дата создания аккаунта берётся из сессии; блоки фильтруются blockOn; кольцо дня уходит в шапку, когда «Профиль» скрыт', () => {
    expect(dash).toContain('accountCreatedAt.value = session.user.created_at')
    expect(app).toContain('<template v-if="blockOn(item)">')
    expect(app).toMatch(/profileVisible = computed\(\(\) => layout\.value\.some\(\(i: LayoutItem\) => i\.key === 'profile' && blockOn\(i\)\)\)/)
    expect(app).toContain('data-test="show-all"')
  })
  it('тексты на обоих языках', () => {
    const i18n: string = readFileSync('src/lib/i18n.ts', 'utf-8')
    for (const k of ['dash_newbie_note', 'dash_newbie_show_all']) expect(i18n.match(new RegExp(k + ':', 'g'))!.length, k).toBe(2)
  })
})
