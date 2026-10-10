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

import { planSync, syncUiSettings, SYNC_KEYS } from './lib/uiSettingsSync'

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
