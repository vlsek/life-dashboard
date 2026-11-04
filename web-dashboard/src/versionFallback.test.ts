// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в noConflictMarkers.test.ts)
import { readFileSync, readdirSync } from 'node:fs'
// @ts-ignore — то же
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет

// Сайдбар: если /version.json не загрузился, показываем последнюю известную версию (копия в localStorage), а не пустое «Что нового».
const INFO = { version: '7.60', en: [{ version: '7.60', date: 'd', changes: ['a'] }], ru: [{ version: '7.60', date: 'd', changes: ['б'] }] }
async function fresh() {
  vi.resetModules()
  return await import('./lib/version')
}
beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('loadVersionInfo: запасная копия', () => {
  it('удачный ответ запоминается; при сбое сети отдаётся запомненный', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(INFO) }))
    const a = await fresh()
    expect((await a.loadVersionInfo()).version).toBe('7.60')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const b = await fresh() // «новая загрузка страницы»: память пуста, остался localStorage
    expect((await b.loadVersionInfo()).version).toBe('7.60')
  })
  it('404 или не тот формат — тоже запасная копия; без копии — ошибка как раньше', async () => {
    localStorage.setItem('version_info_cache', JSON.stringify(INFO))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) }))
    expect((await (await fresh()).loadVersionInfo()).version).toBe('7.60')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ oops: 1 }) }))
    expect((await (await fresh()).loadVersionInfo()).version).toBe('7.60')
    localStorage.clear()
    await expect((await fresh()).loadVersionInfo()).rejects.toThrow()
  })
  it('копия lib/version.ts одинакова во всех пилотах', () => {
    const root = resolve(__dirname, '..', '..')
    const dirs = (readdirSync(root) as string[]).filter((d: string) => d.startsWith('web-'))
    const srcs: [string, string][] = []
    for (const d of dirs) {
      try {
        srcs.push([d, readFileSync(resolve(root, d, 'src', 'lib', 'version.ts'), 'utf-8') as string])
      } catch {
        /* у пилота нет своей копии */
      }
    }
    expect(srcs.length).toBeGreaterThanOrEqual(14)
    for (const [d, src] of srcs) expect(src, d).toBe(srcs[0][1])
  })
})
