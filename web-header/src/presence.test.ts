// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// «Был в сети» (BACKLOG 48.2, миграция 069): отметка активности из шапки и выключатель «Показывать друзьям, что я в сети».
const db = vi.hoisted(() => ({
  rpcCalls: [] as string[],
  rpcThrows: false,
  showOnline: undefined as boolean | null | undefined,
  selectError: false,
  upserts: [] as Record<string, unknown>[],
  upsertError: null as unknown,
}))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      order: () => c,
      limit: () => c,
      range: () => c,
      maybeSingle: () =>
        Promise.resolve(
          db.selectError
            ? { data: null, error: { message: 'column show_online does not exist' } }
            : { data: table === 'profiles' ? { show_online: db.showOnline, track_water: true } : null, error: null },
        ),
      upsert: (row: Record<string, unknown>) => {
        if ('show_online' in row) db.upserts.push(row)
        return Promise.resolve({ error: 'show_online' in row ? db.upsertError : null })
      },
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
    }
    return c
  }
  return {
    sb: {
      from: chain,
      rpc: (name: string) => {
        db.rpcCalls.push(name)
        if (db.rpcThrows) return Promise.reject(new Error('offline'))
        return Promise.resolve({ data: null, error: null })
      },
      auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) },
    },
  }
})

import SettingsModal from './components/SettingsModal.vue'
import { HEARTBEAT_MS, startPresenceHeartbeat, touchLastSeen } from './lib/presence'
import { loadShowOnline, saveShowOnline } from './lib/presenceSetting'

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

describe('отметка «был в сети»', () => {
  beforeEach(() => {
    db.rpcCalls = []
    db.rpcThrows = false
    vi.useFakeTimers()
    setVisibility('visible')
  })
  afterEach(() => vi.useRealTimers())

  it('сразу при запуске и затем раз в ~2 минуты, пока вкладка видна; остановка прекращает', async () => {
    const stop = startPresenceHeartbeat()
    expect(db.rpcCalls).toEqual(['touch_last_seen'])
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
    expect(db.rpcCalls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
    expect(db.rpcCalls).toHaveLength(3)
    stop()
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3)
    expect(db.rpcCalls).toHaveLength(3)
  })

  it('скрытая вкладка не отмечается; вернулись на вкладку — отмечаемся сразу', async () => {
    setVisibility('hidden')
    const stop = startPresenceHeartbeat()
    expect(db.rpcCalls).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2)
    expect(db.rpcCalls).toHaveLength(0)
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(db.rpcCalls).toHaveLength(1)
    stop()
  })

  it('сбой сети / нет функции на сервере не ломает страницу', async () => {
    db.rpcThrows = true
    await expect(touchLastSeen()).resolves.toBeUndefined()
    const stop = startPresenceHeartbeat()
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
    stop()
  })
})

describe('настройка «Показывать друзьям, что я в сети»', () => {
  beforeEach(() => {
    db.showOnline = undefined
    db.selectError = false
    db.upserts = []
    db.upsertError = null
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('loadShowOnline: значение из профиля; нет значения / ошибка (колонки ещё нет) — включено', async () => {
    db.showOnline = false
    expect(await loadShowOnline('u1')).toBe(false)
    db.showOnline = true
    expect(await loadShowOnline('u1')).toBe(true)
    db.showOnline = null
    expect(await loadShowOnline('u1')).toBe(true)
    db.selectError = true
    expect(await loadShowOnline('u1')).toBe(true)
  })

  it('saveShowOnline пишет в профиль и возвращает ошибку сервера', async () => {
    expect(await saveShowOnline('u1', false)).toEqual({ ok: true })
    expect(db.upserts).toEqual([{ user_id: 'u1', show_online: false }])
    db.upsertError = { message: 'boom' }
    expect((await saveShowOnline('u1', true)).ok).toBe(false)
  })

  it('в окне настроек: выключатель отражает профиль и сохраняется; при сбое возвращается назад с ошибкой', async () => {
    db.showOnline = false
    const w = mount(SettingsModal, { props: { userId: 'u1' } })
    await flushPromises()
    const box = () => w.find('[data-test="show-online"]')
    expect((box().element as HTMLInputElement).checked).toBe(false)
    await box().setValue(true)
    await flushPromises()
    expect(db.upserts.at(-1)).toEqual({ user_id: 'u1', show_online: true })
    expect((box().element as HTMLInputElement).checked).toBe(true)
    expect(w.find('[data-test="show-online-error"]').exists()).toBe(false)
    db.upsertError = { message: 'boom' }
    await box().setValue(false)
    await flushPromises()
    expect((box().element as HTMLInputElement).checked).toBe(true) // не записалось — вернулся
    expect(w.find('[data-test="show-online-error"]').exists()).toBe(true)
  })
})

describe('подключение в main.ts (страж)', () => {
  const main = readFileSync('src/main.ts', 'utf-8')
  it('отметка стартует из start() только вошедшим и один раз; на login/onboarding/admin шапки нет вовсе', () => {
    expect(main).toContain('void startPresence()')
    expect(main).toContain('if (!data.session) return')
    expect(main).toContain('if (presenceStarted) return')
    expect(main).toMatch(/const SKIP = \/\^\\\/\(login\|onboarding\|admin\|legacy\)/)
  })
})
