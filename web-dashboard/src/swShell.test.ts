// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в designTokens.test.ts)
import { execSync } from 'node:child_process'
// @ts-ignore — то же
import { existsSync, readdirSync, readFileSync } from 'node:fs'
// @ts-ignore — то же
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './lib/registerSw'

// BACKLOG 66.3, срез 1: оболочка PWA. sw.js грузится в песочнице vm с фальшивыми caches/fetch/событиями — проверяем маршрутизацию без браузера.
const ROOT = '..'
const read = (p: string): string => readFileSync(`${ROOT}/${p}`, 'utf-8')
const run = (cmd: string) => execSync(cmd, { cwd: ROOT, encoding: 'utf-8' })

type Listener = (event: Record<string, unknown>) => void
interface Sandbox {
  listeners: Record<string, Listener>
  stores: Map<string, Map<string, Response>>
  fetchCalls: string[]
  online: { value: boolean }
  fire: (type: string, request?: Request) => { responded: Promise<Response> | null; waited: Promise<unknown> | null }
}

// «Сеть» по умолчанию возвращает тело "net:<url>"; в офлайне — отклоняет промис
function load(shell = { version: 'test1', pages: ['/dashboard/', '/login/'], assets: ['/dashboard/assets/index-AAA.js'], runtime: ['/header-widgets/header.js'] }, existingCaches: string[] = []): Sandbox {
  const listeners: Record<string, Listener> = {}
  const stores = new Map<string, Map<string, Response>>()
  for (const n of existingCaches) stores.set(n, new Map())
  const fetchCalls: string[] = []
  const online = { value: true }
  const ORIGIN = 'https://site.test'
  const keyOf = (r: Request | string) => new URL(typeof r === 'string' ? r : r.url, ORIGIN + '/').href
  const makeCache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const m = stores.get(name)!
    return {
      match: async (r: Request | string) => { const v = m.get(keyOf(r)); return v ? v.clone() : undefined },
      put: async (r: Request | string, resp: Response) => { m.set(keyOf(r), resp) },
      add: async (r: Request | string) => { const resp = await fakeFetch(r); if (!resp.ok) throw new Error('bad status'); m.set(keyOf(r), resp) },
    }
  }
  const fakeFetch = async (r: Request | string): Promise<Response> => {
    const u = keyOf(r)
    fetchCalls.push(u)
    if (!online.value) throw new TypeError('Failed to fetch')
    return new Response('net:' + u, { status: 200 })
  }
  const self: Record<string, unknown> = {
    location: new URL(ORIGIN + '/sw.js'),
    LD_SW: undefined,
    addEventListener: (type: string, fn: Listener) => { listeners[type] = fn },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  }
  // в настоящем service worker относительный адрес Request разрешается от адреса sw.js; в node нужна явная основа
  class ScopedRequest extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(typeof input === 'string' && input.startsWith('/') ? ORIGIN + input : input, init)
    }
  }
  const ctx = vm.createContext({
    self, URL, Request: ScopedRequest, Response, Promise, setTimeout, clearTimeout, console: { warn: () => {}, log: () => {} },
    fetch: fakeFetch,
    caches: {
      open: async (n: string) => makeCache(n),
      keys: async () => [...stores.keys()],
      delete: async (n: string) => stores.delete(n),
      match: async (r: Request | string) => { for (const m of stores.values()) { const v = m.get(keyOf(r)); if (v) return v.clone() } return undefined },
    },
    importScripts: () => { (self as Record<string, unknown>).LD_SW = shell },
  })
  vm.runInContext(read('sw.js'), ctx)
  return {
    listeners, stores, fetchCalls, online,
    fire: (type: string, request?: Request) => {
      let responded: Promise<Response> | null = null
      let waited: Promise<unknown> | null = null
      listeners[type]({ request, respondWith: (p: Promise<Response>) => { responded = p }, waitUntil: (p: Promise<unknown>) => { waited = p } })
      return { responded, waited }
    },
  }
}
const nav = (path: string) => { const r = new Request('https://site.test' + path); Object.defineProperty(r, 'mode', { value: 'navigate' }); return r }
const text = async (p: Promise<Response> | null) => (await (p as Promise<Response>)).text()

describe('sw.js: оболочка пилотов (BACKLOG 66.3)', () => {
  it('установка кладёт в кэш все страницы, хэшированные ассеты и runtime-файлы под именем ld-shell-<версия>', async () => {
    const sb = load()
    await sb.fire('install').waited
    const m = sb.stores.get('ld-shell-test1')!
    for (const u of ['/dashboard/', '/login/', '/dashboard/assets/index-AAA.js', '/header-widgets/header.js']) expect(m.has('https://site.test' + u), u).toBe(true)
  })
  it('холодный старт без сети: /dashboard/, /dashboard и /dashboard/index.html отдаются из кэша', async () => {
    const sb = load()
    await sb.fire('install').waited
    sb.online.value = false
    sb.fetchCalls.length = 0
    for (const p of ['/dashboard/', '/dashboard', '/dashboard/index.html']) {
      expect(await text(sb.fire('fetch', nav(p)).responded), p).toBe('net:https://site.test/dashboard/')
    }
    expect(sb.fetchCalls).toEqual([]) // страница из кэша — в сеть не ходили вовсе
  })
  it('страницы нет в кэше и сети нет — страница входа; нет и её — короткий текст со статусом 503', async () => {
    const sb = load()
    await sb.fire('install').waited
    sb.stores.get('ld-shell-test1')!.delete('https://site.test/dashboard/')
    sb.online.value = false
    expect(await text(sb.fire('fetch', nav('/dashboard/')).responded)).toBe('net:https://site.test/login/')
    sb.stores.get('ld-shell-test1')!.clear()
    const r = await (sb.fire('fetch', nav('/dashboard/')).responded as Promise<Response>)
    expect(r.status).toBe(503)
  })
  it('хэшированный ассет: cache-first — из кэша без обращения к сети', async () => {
    const sb = load()
    await sb.fire('install').waited
    sb.fetchCalls.length = 0
    expect(await text(sb.fire('fetch', new Request('https://site.test/dashboard/assets/index-AAA.js')).responded)).toBe('net:https://site.test/dashboard/assets/index-AAA.js')
    expect(sb.fetchCalls).toEqual([])
  })
  it('файл без хэша (header.js): сеть первая — свежая версия; без сети — копия из кэша', async () => {
    const sb = load()
    await sb.fire('install').waited
    sb.stores.get('ld-shell-test1')!.set('https://site.test/header-widgets/header.js', new Response('old-copy'))
    expect(await text(sb.fire('fetch', new Request('https://site.test/header-widgets/header.js')).responded)).toBe('net:https://site.test/header-widgets/header.js')
    sb.online.value = false
    expect(await text(sb.fire('fetch', new Request('https://site.test/header-widgets/header.js')).responded)).toBe('net:https://site.test/header-widgets/header.js') // обновлённая копия, положенная при онлайне
  })
  it('не трогает чужое: не-GET, другой домен (Supabase), неизвестные страницы и файлы', () => {
    const sb = load()
    // запись (POST/PATCH) не перехватывается даже по адресу, который в списке: иначе запись данных застряла бы в кэше
    for (const u of ['/dashboard/assets/index-AAA.js', '/header-widgets/header.js']) {
      expect(sb.fire('fetch', new Request('https://site.test' + u, { method: 'POST' })).responded, u).toBeNull()
    }
    expect(sb.fire('fetch', new Request('https://haxmgtflegsfpxieaydv.supabase.co/rest/v1/metrics')).responded).toBeNull()
    expect(sb.fire('fetch', nav('/unknown-page/')).responded).toBeNull()
    expect(sb.fire('fetch', new Request('https://site.test/some/other.js')).responded).toBeNull()
  })
  it('активация удаляет только старые кэши ld-shell-*, чужие не трогает', async () => {
    const sb = load(undefined, ['ld-shell-v17', 'ld-shell-old', 'other-cache'])
    await sb.fire('install').waited
    await sb.fire('activate').waited
    expect([...sb.stores.keys()].sort()).toEqual(['ld-shell-test1', 'other-cache'])
  })
})

describe('scripts/gen_sw_assets.py и sw-assets.js', () => {
  it('генератор идемпотентен и список актуален: после пересборки пилотов запустите python3 scripts/gen_sw_assets.py', () => {
    expect(run('python3 scripts/gen_sw_assets.py --check')).toContain('актуален')
  })
  it('в списке нет висячих ссылок, а у каждой страницы пилота все её ассеты и favicon есть в списке', () => {
    const src = read('sw-assets.js')
    const data = vm.runInNewContext(src + '\nself.LD_SW', { self: {} }) as { pages: string[]; assets: string[]; runtime: string[] }
    for (const u of [...data.assets, ...data.runtime]) expect(existsSync(`${ROOT}${u}`), u).toBe(true)
    for (const page of data.pages) {
      expect(existsSync(`${ROOT}${page}index.html`), page).toBe(true)
      const html = read(`${page.slice(1)}index.html`)
      for (const m of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) {
        const u = m[1]
        if (u.startsWith(page) || u.startsWith('/icons/') || u === '/manifest.json') expect([...data.assets, ...data.runtime], `${page} → ${u}`).toContain(u)
      }
    }
    expect(data.runtime).toContain('/header-widgets/header.js')
    expect(data.pages.length).toBeGreaterThanOrEqual(17)
  })
  it('sw.js не содержит ручного номера кэша (ld-shell-vNN) — версия берётся из sw-assets.js', () => {
    expect(read('sw.js')).not.toMatch(/ld-shell-v\d+/)
    expect(readdirSync(ROOT)).toContain('sw-assets.js')
  })
})

describe('registerSw.ts: постоянное хранилище (BACKLOG 66.3)', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('после регистрации просит navigator.storage.persist(); ошибка persist() не роняет страницу', async () => {
    const persist = vi.fn(() => Promise.reject(new Error('denied')))
    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn(() => Promise.resolve()) }, storage: { persist } })
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    expect(() => registerServiceWorker()).not.toThrow()
    expect(persist).toHaveBeenCalledTimes(1)
    await Promise.resolve()
  })
  it('браузер без storage.persist: регистрация идёт как раньше', () => {
    const register = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    registerServiceWorker()
    expect(register).toHaveBeenCalledWith('/sw.js')
  })
  it('все 17 копий registerSw.ts в пилотах одинаковы', () => {
    const dirs = (readdirSync(ROOT) as string[]).filter((d: string) => d.startsWith('web-'))
    const copies = new Set<string>()
    let n = 0
    for (const d of dirs) {
      const p = `${d}/src/lib/registerSw.ts`
      if (!existsSync(`${ROOT}/${p}`)) continue
      n++
      copies.add(read(p))
    }
    expect(n).toBeGreaterThanOrEqual(17)
    expect(copies.size).toBe(1)
  })
})
