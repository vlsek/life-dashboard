import { afterEach, describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в стражах web-dashboard).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { ACHIEVEMENTS } from './achievements'
import { COINS_STEP_1, COINS_STEP_2, LADDERS, LOCKABLE_THEMES, REWARDS, REWARD_STATUS, rewardFor, rewardIcon } from './rewards'
import { rewardText } from './achievementText'

afterEach(() => localStorage.removeItem('site_lang'))

const read = (p: string): string => readFileSync(p, 'utf-8')

describe('таблица наград (BACKLOG раздел 37)', () => {
  it('каждая награда привязана к существующему значку; значков с наградой 8 лесенок × 4 ступени = 32', () => {
    const keys = new Set(ACHIEVEMENTS.map((a) => a.key))
    for (const k of Object.keys(REWARDS)) expect(keys.has(k), k).toBe(true)
    expect(Object.keys(REWARDS).length).toBe(32)
  })

  it('схема лесенки: ступень 1 — монетки, 2 — монетки больше, 3 — предмет, 4 — тема (или редкая рамка, пока темы не хватило)', () => {
    for (const [name, l] of Object.entries(LADDERS)) {
      const [r1, r2, r3, r4] = l.steps.map((k) => REWARDS[k])
      expect(r1, name).toEqual({ kind: 'coins', amount: COINS_STEP_1 })
      expect(r2, name).toEqual({ kind: 'coins', amount: COINS_STEP_2 })
      expect(COINS_STEP_2).toBeGreaterThan(COINS_STEP_1)
      expect(r3.kind, name).toBe('item')
      expect(['theme', 'item'], name).toContain(r4.kind)
    }
  })

  it('ступени лесенки идут по возрастанию порога и принадлежат одному счётчику', () => {
    for (const [name, l] of Object.entries(LADDERS)) {
      const defs = l.steps.map((k) => ACHIEVEMENTS.find((a) => a.key === k)!)
      expect(defs.every(Boolean), name).toBe(true)
      expect(new Set(defs.map((d) => d.counter)).size, name).toBe(1)
      const targets = defs.map((d) => d.target)
      expect([...targets].sort((a, b) => a - b), name).toEqual(targets)
    }
  })

  it('темы-награды: только закрываемые, каждая тема достаётся ровно одной ступени; предметы не повторяются', () => {
    const themes = Object.values(REWARDS).filter((r) => r.kind === 'theme').map((r) => (r as { key: string }).key)
    for (const t of themes) expect((LOCKABLE_THEMES as readonly string[]).includes(t), t).toBe(true)
    expect(new Set(themes).size).toBe(themes.length)
    const items = Object.values(REWARDS).filter((r) => r.kind === 'item').map((r) => (r as { key: string }).key)
    expect(new Set(items).size).toBe(items.length)
    expect(themes.length).toBe(6) // тем хватает на 6 лесенок из 8
  })

  it('распределение, выбранное владельцем/агентом 6: языки → Sepia/Nord, книги → Mocha, тренировки → AMOLED, цели → Solar Light, навыки → Mint', () => {
    const th = (k: string) => (REWARDS[k] as { key: string }).key
    expect([th('words_100'), th('learned_100'), th('books_25'), th('workouts_250'), th('goals_50'), th('skills_25')]).toEqual(['sepia', 'nord', 'mocha', 'amoled', 'solarlight', 'mint'])
    expect(REWARDS.challenges_25.kind).toBe('item') // темы не хватило — пока редкая рамка
    expect(REWARDS.milestones_25.kind).toBe('item')
  })

  it('серии, баллы, идеальные дни, недели в эту схему не входят (у них свои рамки)', () => {
    for (const k of ['streak_5', 'streak_100', 'points_100', 'points_1000', 'mega_productivity']) expect(rewardFor(k), k).toBeNull()
    for (const a of ACHIEVEMENTS.filter((x) => x.group === 'perfect')) expect(rewardFor(a.key), a.key).toBeNull()
  })

  it('«первая тренировка» вне лесенки тренировок (10/50/100/250) — без награды', () => {
    expect(rewardFor('first_workout')).toBeNull()
  })
})

describe('защита тем: нельзя закрыть исходные темы и «Высокий контраст»', () => {
  it('LOCKABLE_THEMES не пересекается с DEFAULT_FAVORITE_THEMES (web-customization) и не содержит contrast', () => {
    const src = read('../web-customization/src/lib/theme.ts')
    const m = /DEFAULT_FAVORITE_THEMES[^=]*=\s*\[([^\]]*)\]/.exec(src)
    expect(m, 'не нашёл DEFAULT_FAVORITE_THEMES в web-customization/src/lib/theme.ts').not.toBeNull()
    const defaults = [...m![1].matchAll(/'(\w+)'/g)].map((x) => x[1])
    expect(defaults.length).toBeGreaterThanOrEqual(4)
    for (const t of LOCKABLE_THEMES) expect(defaults, t).not.toContain(t)
    expect(LOCKABLE_THEMES as readonly string[]).not.toContain('contrast')
  })

  it('каждая закрываемая тема существует на сайте (корневой style.css)', () => {
    const css = read('../style.css')
    for (const t of LOCKABLE_THEMES) expect(css, t).toMatch(new RegExp('html\\.theme-' + t + '\\s*\\{'))
  })
})

describe('показ награды', () => {
  it('выдаются монетки, рамки и темы (всё active)', () => {
    expect(REWARD_STATUS).toEqual({ coins: 'active', item: 'active', theme: 'active' })
    localStorage.setItem('site_lang', 'ru')
    expect(rewardText(REWARDS.words_10)).toBe('Награда: 20 монет')
    expect(rewardText(REWARDS.words_100)).toBe('Награда: тема «Сепия»')
  })

  it('переключатель статуса: active → «Награда: …» без «скоро»', () => {
    localStorage.setItem('site_lang', 'ru')
    expect(rewardText(REWARDS.words_25, 'active')).toBe('Награда: 50 монет')
    expect(rewardText(REWARDS.words_25, 'planned')).toBe('Награда (скоро): 50 монет')
  })

  it.each(['ru', 'en'] as const)('тексты всех 32 наград на %s: непустые, без «undefined» и без неподставленных {…}', (lang) => {
    localStorage.setItem('site_lang', lang)
    for (const [k, r] of Object.entries(REWARDS)) {
      for (const st of ['planned', 'active'] as const) {
        const t = rewardText(r, st)
        expect(t, `${k}/${st}`).toBeTruthy()
        expect(t, `${k}/${st}`).not.toMatch(/undefined|\{[a-z]+\}/)
      }
    }
  })

  it('примеры RU/EN: предмет и тема', () => {
    localStorage.setItem('site_lang', 'ru')
    expect(rewardText(REWARDS.words_50)).toBe('Награда: рамка «Чернильная»')
    expect(rewardText(REWARDS.words_100)).toBe('Награда: тема «Сепия»')
    localStorage.setItem('site_lang', 'en')
    expect(rewardText(REWARDS.words_50)).toBe('Reward: frame “Ink”')
    expect(rewardText(REWARDS.words_50, 'planned')).toBe('Reward (coming soon): frame “Ink”') // подпись «скоро» осталась для будущих наград
    expect(rewardText(REWARDS.books_25, 'active')).toBe('Reward: theme “Orchid”')
    localStorage.setItem('site_lang', 'ru')
    expect(rewardText(REWARDS.books_25)).toBe('Награда: тема «Орхидея»')
  })

  it('иконка по виду награды', () => {
    expect([rewardIcon(REWARDS.words_10), rewardIcon(REWARDS.words_50), rewardIcon(REWARDS.words_100)]).toEqual(['coin', 'sparkles', 'paintbrush'])
  })
})

describe('замок тем-наград (v3.42): карта THEME_UNLOCK совпадает с лесенками во ВСЕХ пилотах и в шапке', () => {
  // Что на самом деле выдают лесенки: тема → ключ достижения, на котором она лежит.
  const ladderMap = (): Record<string, string> =>
    Object.fromEntries(Object.entries(REWARDS).filter(([, r]) => r.kind === 'theme').map(([ach, r]) => [(r as { key: string }).key, ach]))

  const mapIn = (src: string): Record<string, string> => {
    const m = /export const THEME_UNLOCK[^=]*=\s*\{([^}]*)\}/.exec(src)
    expect(m, 'не нашёл THEME_UNLOCK').not.toBeNull()
    return Object.fromEntries([...m![1].matchAll(/(\w+):\s*'(\w+)'/g)].map((x) => [x[1], x[2]]))
  }

  it('карта замков = темы-награды лесенок (и ровно шесть закрыты)', () => {
    const expected = ladderMap()
    expect(Object.keys(expected).sort()).toEqual([...LOCKABLE_THEMES].sort())
    expect(mapIn(read('../web-customization/src/lib/theme.ts'))).toEqual(expected)
  })

  it('одна и та же карта в theme.ts каждого пилота и в themeUnlock.ts шапки', () => {
    const expected = ladderMap()
    const dirs = (readdirSync('..') as string[]).filter((d: string) => /^web-/.test(d))
    const files = dirs.map((d: string) => `../${d}/src/lib/theme.ts`).filter((f: string) => existsSync(f))
    expect(files.length).toBeGreaterThanOrEqual(15)
    for (const f of files) expect(mapIn(read(f)), f).toEqual(expected)
    expect(mapIn(read('../web-header/src/lib/themeUnlock.ts'))).toEqual(expected)
  })

  it('закрытая тема не может быть ни одной из «всегда открытых»', () => {
    for (const t of ['dark', 'monet', 'light', 'pink', 'contrast']) expect(Object.keys(ladderMap()), t).not.toContain(t)
  })
})

describe('рамки-награды (v3.73): реестр наград ⇔ реестр «Кастомизации»', () => {
  // Реестр предметов Кастомизации (источник — web-customization/src/lib/customization.ts): ключ рамки → достижение, за которое она выдаётся.
  const custMap = (): Record<string, string> => {
    const src = read('../web-customization/src/lib/customization.ts')
    return Object.fromEntries([...src.matchAll(/key: '(frame_\w+)', category: 'avatar_frame', source: 'achievement', achievement: '(\w+)'/g)].map((m) => [m[1], m[2]]))
  }
  const rewardItems = (): Record<string, string> =>
    Object.fromEntries(Object.entries(REWARDS).filter(([, r]) => r.kind === 'item').map(([ach, r]) => [(r as { key: string }).key, ach]))

  it('каждая рамка-награда лесенки есть в реестре Кастомизации и выдаётся за то же достижение', () => {
    const rw = rewardItems()
    expect(Object.keys(rw)).toHaveLength(Object.keys(LADDERS).length + 2) // по рамке на лесенку + две финальные «редкие» (челленджи, вехи)
    const cust = custMap()
    for (const [frame, ach] of Object.entries(rw)) expect(cust[frame], frame + ' отсутствует в customization.ts или выдаётся за другое достижение').toBe(ach)
  })

  it('статус «рамки выдаются» включён только вместе с реестром (нет рамки без записи в Кастомизации)', () => {
    expect(REWARD_STATUS.item).toBe('active')
    for (const frame of Object.keys(rewardItems())) expect(custMap()[frame], frame).toBeTruthy()
  })
})
