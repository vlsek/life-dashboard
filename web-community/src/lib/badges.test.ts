import { describe, expect, it } from 'vitest'

// Файлы читаем через node:fs; имя модуля собрано строкой, чтобы vue-tsc не требовал @types/node для тестов пилота.
async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}
import { BADGES, badgeDef, badgesByUser, topBadges } from './badges'
import { ICON_PATHS } from './icons'

const row = (user_id: string, key: string) => ({ user_id, key, unlocked_at: null })

describe('реестр значков', () => {
  it('ключи, группы, пороги и иконки совпадают с реестром страницы «Достижения» (страж от расхождения копий; лесенки makeLadder тоже)', async () => {
    const src = await readSrc('../../../web-achievements/src/lib/achievements.ts')
    // Явные записи реестра…
    const literal = [...src.matchAll(/\{ key: '(\w+)', group: '(\w+)', counter: '\w+', target: (\d+), icon: '(\w+)' \}/g)].map((m) => ({
      index: m.index ?? 0, key: m[1], group: m[2], target: Number(m[3]), icon: m[4],
    }))
    // …и лесенки `...makeLadder('префикс', 'группа', 'счётчик', 'иконка', [пороги])` (ключ = префикс_порог); порядок — как в файле
    const ladders = [...src.matchAll(/\.\.\.makeLadder\('(\w+)', '(\w+)', '\w+', '(\w+)', \[([\d, ]+)\]\)/g)].flatMap((m) =>
      m[4].split(',').map((n) => ({ index: m.index ?? 0, key: `${m[1]}_${n.trim()}`, group: m[2], target: Number(n), icon: m[3] })),
    )
    const expected = [...literal, ...ladders].sort((a, b) => a.index - b.index)
    expect(expected.length, 'реестр «Достижений» не разобрался').toBeGreaterThanOrEqual(40)
    expect(BADGES.map((b) => b.key)).toEqual(expected.map((e) => e.key))
    expect(BADGES.map((b) => b.group)).toEqual(expected.map((e) => e.group))
    expect(BADGES.map((b) => b.target)).toEqual(expected.map((e) => e.target))
    expect(BADGES.map((b) => b.icon)).toEqual(expected.map((e) => e.icon))
  })
  it('у каждого значка есть иконка в Сообществе', () => {
    for (const b of BADGES) expect((ICON_PATHS as Record<string, string>)[b.icon], b.key).toBeTruthy()
  })
  it('у каждого значка есть название на обоих языках', async () => {
    const i18nSrc = await readSrc('./i18n.ts')
    for (const b of BADGES) expect([...i18nSrc.matchAll(new RegExp('comm_badge_' + b.key + ':', 'g'))].length, b.key).toBe(2)
  })
  it('badgeDef находит по ключу, неизвестный — undefined', () => {
    expect(badgeDef('streak_30')?.target).toBe(30)
    expect(badgeDef('nope')).toBeUndefined()
  })
})

describe('badgesByUser', () => {
  it('группирует по пользователю, старшие пороги выше, «первые» последними', () => {
    const m = badgesByUser([row('a', 'first_goal'), row('a', 'streak_30'), row('a', 'streak_5'), row('b', 'points_100')])
    expect(m.get('a')).toEqual(['streak_30', 'streak_5', 'first_goal'])
    expect(m.get('b')).toEqual(['points_100'])
  })
  it('дубли и неизвестные ключи отбрасываются', () => {
    const m = badgesByUser([row('a', 'streak_5'), row('a', 'streak_5'), row('a', 'future_badge'), row('a', '_baseline')])
    expect(m.get('a')).toEqual(['streak_5'])
  })
  it('пользователя без значков в карте нет', () => {
    expect(badgesByUser([]).size).toBe(0)
    expect(badgesByUser([row('a', 'future_badge')]).has('a')).toBe(false)
  })
})

describe('topBadges', () => {
  it('до max и остаток', () => {
    expect(topBadges(['a', 'b', 'c', 'd'], 3)).toEqual({ shown: ['a', 'b', 'c'], more: 1 })
    expect(topBadges(['a'], 3)).toEqual({ shown: ['a'], more: 0 })
  })
  it('нет значков — пусто', () => {
    expect(topBadges(undefined, 3)).toEqual({ shown: [], more: 0 })
    expect(topBadges([], 3)).toEqual({ shown: [], more: 0 })
  })
})
