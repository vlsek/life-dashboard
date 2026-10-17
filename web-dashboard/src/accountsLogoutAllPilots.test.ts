import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в newGoalCopy.test.ts).
import { existsSync, readFileSync, readdirSync } from 'node:fs'

// BACKLOG 1081: «Выйти» при нескольких записях. В каждом пилоте logout() обязан (1) отдать выбор окну шапки, если записей больше одной,
// (2) иначе выйти из ТЕКУЩЕЙ записи и убрать её из склада (finishLogout), а не выкидывать все сессии разом.
const pilots: string[] = (readdirSync('..') as string[]).filter((d: string) => d.startsWith('web-') && d !== 'web-header' && existsSync(`../${d}/src/lib/supabase.ts`))
const logoutOf = (src: string): string => src.match(/export async function logout\(\)[^{]*\{[\s\S]*?\n\}/)![0]

describe('logout() во всех пилотах', () => {
  it('пилотов не меньше 17 (иначе страж ничего не проверяет)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(17)
  })
  it.each(pilots)('%s: выбор записи, finishLogout, импорт из shared', (p: string) => {
    const src = readFileSync(`../${p}/src/lib/supabase.ts`, 'utf-8')
    const fn = logoutOf(src)
    expect(src).toContain("from '../../../shared/accounts/accounts'")
    expect(fn).toContain('lifeLogoutChooser')
    expect(fn).toContain('accountCount() > 1')
    expect(fn).toContain('readCurrent()')
    expect(fn).toContain('finishLogout(id)')
    // порядок: id снимается ДО выхода (после signOut сессии в хранилище уже нет)
    expect(fn.indexOf('readCurrent()')).toBeLessThan(fn.indexOf('signOut()'))
    expect(fn).not.toContain('clearAll')
  })
  it('все пилоты — один и тот же logout (копия не разъезжается)', () => {
    const bodies = new Set(pilots.map((p: string) => logoutOf(readFileSync(`../${p}/src/lib/supabase.ts`, 'utf-8'))))
    expect(bodies.size).toBe(1)
  })
})

describe('старые страницы (config.js)', () => {
  it('logout() выходит из текущей записи и чистит склад теми же ключами, что shared/accounts', () => {
    const cfg = readFileSync('../config.js', 'utf-8')
    const shared = readFileSync('../shared/accounts/accounts.ts', 'utf-8')
    const store = shared.match(/export const STORE_KEY = '([a-z0-9_]+)'/)![1]
    const project = shared.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)![1]
    const fn = cfg.slice(cfg.indexOf('async function logout()'), cfg.indexOf('// Текущее время'))
    expect(fn).toContain(`"${store}"`)
    expect(fn).toContain(`"sb-${project}-auth-token"`)
    expect(fn).toContain('signOut()')
    expect(fn.indexOf('curId')).toBeLessThan(fn.indexOf('signOut()')) // id снимается ДО выхода
  })
})

