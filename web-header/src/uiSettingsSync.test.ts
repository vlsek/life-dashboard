import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = { row: { ui_settings: {} } as { ui_settings: Record<string, string | null> } | null, error: null as null | { message: string }, updateError: null as null | { message: string }, updates: [] as unknown[] }
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.error ? null : db.row, error: db.error }) }) }),
      update: (v: unknown) => ({
        eq: async () => {
          db.updates.push(v)
          if (!db.updateError) db.row = v as typeof db.row
          return { error: db.updateError }
        },
      }),
    }),
  },
}))

import { planSync, syncUiSettings, SYNC_KEYS, SYNC_PREFIXES, MAX_KEYS_PER_PREFIX, MAX_VALUE_LEN, collectKeys, prefixOf, applyPulled } from './lib/uiSettingsSync'

describe('planSync — куда копировать настройку', () => {
  const K = ['site_theme']
  it('одинаково — ничего не копируем', () => {
    const p = planSync(K, { site_theme: 'mint' }, { site_theme: 'mint' }, null)
    expect(p.pull).toEqual({})
    expect(p.push).toEqual({})
  })
  it('изменил здесь после прошлой синхронизации → на сервер', () => {
    const p = planSync(K, { site_theme: 'nord' }, { site_theme: 'mint' }, { site_theme: 'mint' })
    expect(p.push).toEqual({ site_theme: 'nord' })
    expect(p.pull).toEqual({})
  })
  it('изменено на другом устройстве → к нам', () => {
    const p = planSync(K, { site_theme: 'mint' }, { site_theme: 'nord' }, { site_theme: 'mint' })
    expect(p.pull).toEqual({ site_theme: 'nord' })
    expect(p.push).toEqual({})
  })
  it('изменено и тут, и там — побеждает это устройство', () => {
    const p = planSync(K, { site_theme: 'pink' }, { site_theme: 'nord' }, { site_theme: 'mint' })
    expect(p.push).toEqual({ site_theme: 'pink' })
  })
  it('новое устройство: на сервере есть → берём серверное; на сервере пусто, локально есть → отправляем', () => {
    expect(planSync(K, { site_theme: 'light' }, { site_theme: 'nord' }, null).pull).toEqual({ site_theme: 'nord' })
    expect(planSync(K, { site_theme: 'light' }, {}, null).push).toEqual({ site_theme: 'light' })
  })
  it('сброс настройки (удалили локально) уходит на сервер как null', () => {
    const p = planSync(['site_motion'], { site_motion: null }, { site_motion: 'off' }, { site_motion: 'off' })
    expect(p.push).toEqual({ site_motion: null })
  })
})

describe('syncUiSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    db.row = { ui_settings: {} }
    db.error = null
    db.updateError = null
    db.updates = []
    document.documentElement.className = ''
  })
  it('новое устройство берёт тему с сервера и применяет сразу', async () => {
    db.row = { ui_settings: { site_theme: 'nord' } }
    await syncUiSettings('u', vi.fn())
    expect(localStorage.getItem('site_theme')).toBe('nord')
    expect(document.documentElement.classList.contains('theme-nord')).toBe(true)
  })
  it('язык с сервера: записывается и один раз перезагружает страницу; повторный заход не перезагружает', async () => {
    db.row = { ui_settings: { site_lang: 'ru' } }
    localStorage.setItem('site_lang', 'en')
    const reload = vi.fn()
    await syncUiSettings('u', reload)
    expect(localStorage.getItem('site_lang')).toBe('ru')
    expect(reload).toHaveBeenCalledTimes(1)
    await syncUiSettings('u', reload)
    expect(reload).toHaveBeenCalledTimes(1)
  })
  it('локальное изменение уходит на сервер вместе с остальным содержимым', async () => {
    db.row = { ui_settings: { site_lang: 'ru' } }
    localStorage.setItem('site_lang', 'ru')
    await syncUiSettings('u', vi.fn())
    localStorage.setItem('site_theme', 'mint')
    await syncUiSettings('u', vi.fn())
    expect(db.row!.ui_settings).toMatchObject({ site_lang: 'ru', site_theme: 'mint' })
  })
  it('без миграции (ошибка чтения) — ничего не делает и не падает', async () => {
    db.error = { message: 'column profiles.ui_settings does not exist' }
    localStorage.setItem('site_theme', 'mint')
    await expect(syncUiSettings('u', vi.fn())).resolves.toBeUndefined()
    expect(db.updates).toHaveLength(0)
    expect(localStorage.getItem('ui_settings_synced:u')).toBeNull()
  })
  it('сбой записи на сервер: отправим при следующей загрузке', async () => {
    localStorage.setItem('site_lang', 'ru')
    await syncUiSettings('u', vi.fn()) // site_lang синхронизирован
    localStorage.setItem('site_theme', 'mint')
    db.updateError = { message: 'boom' }
    await syncUiSettings('u', vi.fn())
    db.updateError = null
    await syncUiSettings('u', vi.fn())
    expect(db.row!.ui_settings.site_theme).toBe('mint')
  })
  it('список ключей — без дублей', () => {
    expect(new Set(SYNC_KEYS).size).toBe(SYNC_KEYS.length)
  })
})

// ---- BACKLOG 48.3, срез 2: расположение и вид между устройствами
describe('prefixOf / collectKeys', () => {
  it('ключи с известным началом узнаются; голое начало и чужие ключи — нет', () => {
    expect(prefixOf('dash_collapsed:goals')).toBe('dash_collapsed:')
    expect(prefixOf('goals_section_active')).toBe('goals_section_')
    expect(prefixOf('dash_collapsed:')).toBeNull()
    for (const k of ['water-undo:1', 'week_reminder_dismissed:2026-10-11', 'ex:42', 'metric:7', 'tour_pending', 'site_theme']) expect(prefixOf(k)).toBeNull()
  })
  it('собирает постоянные ключи + найденные с началом (локально, на сервере, в «запомненном»), без дублей и без посторонних', () => {
    const keys = collectKeys(['dash_collapsed:a', 'tour_pending', 'water-undo:1', 'x'], ['dash_collapsed:a', 'goals_section_done'], ['skills_section_x'])
    expect(keys).toEqual(expect.arrayContaining([...SYNC_KEYS, 'dash_collapsed:a', 'goals_section_done', 'skills_section_x']))
    expect(new Set(keys).size).toBe(keys.length)
    for (const bad of ['tour_pending', 'water-undo:1', 'x']) expect(keys).not.toContain(bad)
  })
  it(`на каждое начало не больше ${MAX_KEYS_PER_PREFIX} ключей, по алфавиту (одинаково на всех устройствах)`, () => {
    const many = Array.from({ length: MAX_KEYS_PER_PREFIX + 15 }, (_, i) => 'dash_collapsed:b' + String(i).padStart(3, '0'))
    const keys = collectKeys([...many].reverse(), [], [])
    const got = keys.filter((k) => k.startsWith('dash_collapsed:'))
    expect(got).toHaveLength(MAX_KEYS_PER_PREFIX)
    expect(got).toEqual([...many].sort().slice(0, MAX_KEYS_PER_PREFIX))
  })
  it('список настроек не содержит кэшей, одноразовых «закрыл подсказку» и служебных ключей; постоянные ключи не пересекаются с началами', () => {
    for (const k of SYNC_KEYS) {
      expect(k).not.toMatch(/dismissed|_seen|_shown|_synced|_baseline|achievements_unlocked|unlocked_themes|tour_pending|^sb_|workout_program/)
      expect(prefixOf(k)).toBeNull()
    }
    expect(new Set(SYNC_PREFIXES).size).toBe(SYNC_PREFIXES.length)
  })
})

describe('syncUiSettings: расположение и вид', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    db.row = { ui_settings: {} }
    db.error = null
    db.updateError = null
    db.updates = []
    document.documentElement.className = ''
  })
  it('новое устройство получает свёрнутые блоки и вкладки аккаунта и один раз перезагружает страницу', async () => {
    db.row = { ui_settings: { 'dash_collapsed:goals': '1', 'dash_period_chart:weight': '30', workouts_tab: 'map', favorite_pages: '["/goals/"]' } }
    const reload = vi.fn()
    await syncUiSettings('u', reload)
    expect(localStorage.getItem('dash_collapsed:goals')).toBe('1')
    expect(localStorage.getItem('dash_period_chart:weight')).toBe('30')
    expect(localStorage.getItem('workouts_tab')).toBe('map')
    expect(localStorage.getItem('favorite_pages')).toBe('["/goals/"]')
    expect(reload).toHaveBeenCalledTimes(1)
    await syncUiSettings('u', reload) // всё уже совпадает — повторной перезагрузки нет
    expect(reload).toHaveBeenCalledTimes(1)
  })
  it('локальные свёрнутые блоки и периоды графиков уходят на сервер', async () => {
    localStorage.setItem('dash_collapsed:goals', '1')
    localStorage.setItem('dash_period_chart:weight', '90')
    localStorage.setItem('skills_section_done', '1')
    await syncUiSettings('u', vi.fn())
    expect(db.row!.ui_settings).toMatchObject({ 'dash_collapsed:goals': '1', 'dash_period_chart:weight': '90', skills_section_done: '1' })
  })
  it('развернули блок (ключ удалён) — на сервере ключ исчезает совсем, а не хранится как null', async () => {
    localStorage.setItem('dash_collapsed:goals', '1')
    localStorage.setItem('site_lang', 'ru')
    await syncUiSettings('u', vi.fn())
    expect('dash_collapsed:goals' in db.row!.ui_settings).toBe(true)
    localStorage.removeItem('dash_collapsed:goals')
    await syncUiSettings('u', vi.fn())
    expect('dash_collapsed:goals' in db.row!.ui_settings).toBe(false)
    expect(Object.values(db.row!.ui_settings).includes(null)).toBe(false)
    expect(db.row!.ui_settings.site_lang).toBe('ru')
  })
  it('на другом устройстве блок развернули — у нас тоже (ключ снимается и страница перезагружается)', async () => {
    localStorage.setItem('dash_collapsed:goals', '1')
    await syncUiSettings('u', vi.fn()) // синхронизировано: свёрнут
    db.row = { ui_settings: {} } // другое устройство развернуло и стёрло ключ на сервере
    const reload = vi.fn()
    await syncUiSettings('u', reload)
    expect(localStorage.getItem('dash_collapsed:goals')).toBeNull()
    expect(reload).toHaveBeenCalledTimes(1)
  })
  it('больше лимита локальных ключей с одним началом — на сервер уходит только лимит', async () => {
    for (let i = 0; i < MAX_KEYS_PER_PREFIX + 20; i++) localStorage.setItem('dash_collapsed:k' + String(i).padStart(3, '0'), '1')
    await syncUiSettings('u', vi.fn())
    expect(Object.keys(db.row!.ui_settings).filter((k) => k.startsWith('dash_collapsed:'))).toHaveLength(MAX_KEYS_PER_PREFIX)
  })
  it('слишком длинное значение не синхронизируется; серверный мусор (число, объект) на устройство не попадает', async () => {
    localStorage.setItem('cust_collapsed', 'x'.repeat(MAX_VALUE_LEN + 1))
    db.row = { ui_settings: { workouts_tab: 5, shop_view: { a: 1 }, skills_sort: 'name' } as unknown as Record<string, string | null> }
    await syncUiSettings('u', vi.fn())
    expect('cust_collapsed' in db.row!.ui_settings).toBe(false)
    expect(localStorage.getItem('workouts_tab')).toBeNull()
    expect(localStorage.getItem('shop_view')).toBeNull()
    expect(localStorage.getItem('skills_sort')).toBe('name')
  })
  it('тема и анимации применяются сразу — без перезагрузки', async () => {
    db.row = { ui_settings: { site_theme: 'nord', site_motion: 'off' } }
    const reload = vi.fn()
    await syncUiSettings('u', reload)
    expect(reload).not.toHaveBeenCalled()
    expect(document.documentElement.classList.contains('theme-nord')).toBe(true)
  })
  it('защита от цикла: вторая перезагрузка в течение минуты не выполняется; нет sessionStorage — не перезагружаем вовсе', async () => {
    db.row = { ui_settings: { workouts_tab: 'map' } }
    const reload = vi.fn()
    sessionStorage.setItem('ui_sync_reload_at', String(Date.now() - 5000)) // только что перезагружали
    await syncUiSettings('u', reload)
    expect(localStorage.getItem('workouts_tab')).toBe('map') // значение всё равно принято
    expect(reload).not.toHaveBeenCalled()
    localStorage.clear()
    sessionStorage.clear()
    // sessionStorage недоступен — защититься от цикла нечем, поэтому не перезагружаем вовсе (значение при этом принимается)
    const spy = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const r2 = vi.fn()
    await syncUiSettings('u', r2)
    spy.mockRestore()
    expect(localStorage.getItem('workouts_tab')).toBe('map')
    expect(r2).not.toHaveBeenCalled()
  })
})

describe('applyPulled', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  it('перезагрузка просится, только если значение реально изменилось и записалось', () => {
    expect(applyPulled({ workouts_tab: 'map' }).reload).toBe(true)
    expect(applyPulled({ workouts_tab: 'map' }).reload).toBe(false) // уже так
    expect(applyPulled({ workouts_tab: null }).reload).toBe(true) // ключ стёрт
    expect(localStorage.getItem('workouts_tab')).toBeNull()
  })
  it('если запись на устройство не держится (приватный режим) — перезагрузка не нужна', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(applyPulled({ workouts_tab: 'map' }).reload).toBe(false)
    spy.mockRestore()
    expect(localStorage.getItem('workouts_tab')).toBeNull()
  })
  it('язык: только ru/en; чужое значение не принимается и не перезагружает', () => {
    expect(applyPulled({ site_lang: 'de' }).reload).toBe(false)
    expect(localStorage.getItem('site_lang')).toBeNull()
    expect(applyPulled({ site_lang: 'ru' }).reload).toBe(true)
  })
})
