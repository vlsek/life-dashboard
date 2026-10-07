import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Замок тем-наград в шапке (v3.42): помощники открытия, синхронизация с user_achievements, список тем в «Настройках».
const db = vi.hoisted(() => ({ rows: [] as { key: string }[], error: null as null | { message: string }, boom: false, asked: [] as unknown[] }))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      in: (col: string, vals: string[]) => {
        if (db.boom) throw new Error('сеть упала')
        db.asked.push({ table, col, vals })
        return Promise.resolve({ data: db.error ? null : db.rows, error: db.error })
      },
      order: () => c,
      limit: () => c,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ error: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) }, from: chain } }
})

import { THEME_UNLOCK, UNLOCKED_THEMES_EVENT, UNLOCKED_THEMES_KEY, isThemeLocked, readUnlockedThemes, sanitizeUnlockedThemes, unlockedThemesFromAchievements, writeUnlockedThemes } from './lib/themeUnlock'
import { syncUnlockedThemes } from './lib/syncUnlockedThemes'
import SettingsModal from './components/SettingsModal.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.rows = []
  db.error = null
  db.boom = false
  db.asked = []
})

describe('помощники замка тем', () => {
  it('закрыто ровно шесть тем-наград; исходные четыре и «Высокий контраст» открыты всегда', () => {
    expect(Object.keys(THEME_UNLOCK).sort()).toEqual(['amoled', 'mint', 'mocha', 'nord', 'sepia', 'solarlight'])
    for (const k of ['dark', 'monet', 'light', 'pink', 'contrast'] as const) expect(isThemeLocked(k, []), k).toBe(false)
    for (const k of Object.keys(THEME_UNLOCK) as (keyof typeof THEME_UNLOCK)[]) expect(isThemeLocked(k, []), k).toBe(true)
  })

  it('sanitize: берёт только закрываемые темы, без дублей и мусора', () => {
    expect(sanitizeUnlockedThemes(['mint', 'mint', 'dark', 'нет_такой', 5, null, 'nord'])).toEqual(['mint', 'nord'])
    expect(sanitizeUnlockedThemes('mint')).toEqual([])
    expect(sanitizeUnlockedThemes(undefined)).toEqual([])
  })

  it('чтение: пусто, мусор и сломанный JSON дают «ничего не открыто»', () => {
    expect(readUnlockedThemes()).toEqual([])
    localStorage.setItem(UNLOCKED_THEMES_KEY, 'не json')
    expect(readUnlockedThemes()).toEqual([])
    localStorage.setItem(UNLOCKED_THEMES_KEY, '{"a":1}')
    expect(readUnlockedThemes()).toEqual([])
  })

  it('запись пишет в localStorage и шлёт событие ТОЛЬКО при изменении', () => {
    let n = 0
    const on = () => n++
    window.addEventListener(UNLOCKED_THEMES_EVENT, on)
    writeUnlockedThemes(['sepia'])
    expect(readUnlockedThemes()).toEqual(['sepia'])
    expect(n).toBe(1)
    writeUnlockedThemes(['sepia']) // то же самое — без события
    expect(n).toBe(1)
    writeUnlockedThemes(['sepia', 'mocha'])
    expect(n).toBe(2)
    window.removeEventListener(UNLOCKED_THEMES_EVENT, on)
  })

  it('unlockedThemesFromAchievements: тема открыта, если получено её достижение', () => {
    expect(unlockedThemesFromAchievements(['words_100', 'books_25', 'streak_5'])).toEqual(['sepia', 'mocha'])
    expect(unlockedThemesFromAchievements([])).toEqual([])
    expect(unlockedThemesFromAchievements(['_baseline'])).toEqual([])
  })
})

describe('синхронизация с user_achievements', () => {
  it('спрашивает только ключи-награды и запоминает открытые темы', async () => {
    db.rows = [{ key: 'words_100' }, { key: 'workouts_250' }]
    await syncUnlockedThemes('u1')
    expect(db.asked).toHaveLength(1)
    const q = db.asked[0] as { table: string; col: string; vals: string[] }
    expect(q.table).toBe('user_achievements')
    expect(q.col).toBe('key')
    expect([...q.vals].sort()).toEqual(['books_25', 'goals_50', 'learned_100', 'skills_25', 'words_100', 'workouts_250'])
    expect(readUnlockedThemes().sort()).toEqual(['amoled', 'sepia'])
  })

  it('нет достижений → закрыто всё; потерянная награда закрывает тему обратно (список всегда равен серверному)', async () => {
    writeUnlockedThemes(['sepia', 'nord'])
    db.rows = [{ key: 'learned_100' }]
    await syncUnlockedThemes('u1')
    expect(readUnlockedThemes()).toEqual(['nord'])
  })

  it('ошибка запроса или падение сети: прежний список не трогаем, исключения нет', async () => {
    writeUnlockedThemes(['mint'])
    db.error = { message: 'rls' }
    await expect(syncUnlockedThemes('u1')).resolves.toBeUndefined()
    expect(readUnlockedThemes()).toEqual(['mint'])
    db.error = null
    db.boom = true
    await expect(syncUnlockedThemes('u1')).resolves.toBeUndefined()
    expect(readUnlockedThemes()).toEqual(['mint'])
  })
})

describe('«Настройки» шапки: список тем', () => {
  const options = (w: ReturnType<typeof mount>) => w.findAll('[data-test="theme-select"] option').map((o) => o.attributes('value'))
  const open = async () => {
    const w = mount(SettingsModal, { props: { userId: 'u1' } })
    await flushPromises()
    return w
  }

  it('пока ничего не заслужено: только пять открытых тем', async () => {
    const w = await open()
    expect(options(w)).toEqual(['dark', 'monet', 'light', 'pink', 'contrast'])
    w.unmount()
  })

  it('заслуженная тема появляется в списке сразу, как только список открытых обновился', async () => {
    const w = await open()
    writeUnlockedThemes(['sepia'])
    await flushPromises()
    expect(options(w)).toContain('sepia')
    expect(options(w)).not.toContain('mint')
    w.unmount()
  })

  it('уже включённая закрытая тема остаётся в списке (отнимать её нельзя)', async () => {
    localStorage.setItem('site_theme', 'nord')
    const w = await open()
    expect(options(w)).toContain('nord')
    expect(options(w)).not.toContain('amoled')
    w.unmount()
  })

  it('подпись Mocha — «Орхидея» (в списке и после открытия)', async () => {
    writeUnlockedThemes(['mocha'])
    const w = await open()
    expect(w.find('[data-test="theme-select"] option[value="mocha"]').text()).toContain('Орхидея')
    expect(w.text()).not.toContain('Catppuccin')
    w.unmount()
  })
})
