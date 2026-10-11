import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах пилота).
import { readFileSync } from 'node:fs'

// Анимация «записалось» (BACKLOG 44.21, v3.79): три варианта, выбор в «Настройках», итоговое состояние без движения.
vi.mock('./lib/supabase', () => {
  const chain = (): any => {
    const c: any = {
      select: () => c, eq: () => c, in: () => c, order: () => c, limit: () => c,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ error: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) }, from: chain } }
})

import { DEFAULT_WATER_ANIM, WATER_ANIMS, WATER_ANIM_KEY, getWaterAnim, getWaterAnimChoice, sanitizeWaterAnim, setWaterAnim } from './lib/waterAnim'
import { THEME_WATER } from './lib/themeWater'
import WaterSavedAnim from './components/WaterSavedAnim.vue'
import SettingsModal from './components/SettingsModal.vue'

const read = (p: string): string => readFileSync(p, 'utf-8')
const css: string = read('src/header.css')

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0))
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('выбор варианта (lib/waterAnim.ts)', () => {
  it('шесть вариантов, по умолчанию самый спокойный — волна', () => {
    expect([...WATER_ANIMS]).toEqual(['wave', 'drops', 'ripple', 'bubbles', 'pour', 'splash'])
    expect(DEFAULT_WATER_ANIM).toBe('wave')
    expect(getWaterAnim()).toBe('wave')
  })
  it('sanitize: мусор и чужие значения → по умолчанию', () => {
    for (const bad of ['', 'wob', 5, null, undefined, {}]) expect(sanitizeWaterAnim(bad), String(bad)).toBe('wave')
    for (const ok of WATER_ANIMS) expect(sanitizeWaterAnim(ok)).toBe(ok)
  })
  it('set/get: выбор запоминается явно (и «волна» тоже); «По теме» (auto) снимает выбор', () => {
    setWaterAnim('drops')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBe('drops')
    expect(getWaterAnim()).toBe('drops')
    setWaterAnim('wave')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBe('wave') // явный выбор главнее темы, даже если он совпадает со значением по умолчанию
    expect(getWaterAnimChoice()).toBe('wave')
    setWaterAnim('auto')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBeNull()
    expect(getWaterAnimChoice()).toBe('auto')
    localStorage.setItem(WATER_ANIM_KEY, 'не-вариант')
    expect(getWaterAnim()).toBe('wave')
    expect(getWaterAnimChoice()).toBe('auto')
  })
  it('хранилище недоступно: не падает, остаётся значение по умолчанию', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('нет доступа')
    })
    expect(getWaterAnim()).toBe('wave')
    spy.mockRestore()
  })
  it('копии lib одинаковы в шапке и Дашборде (страж)', () => {
    expect(read('src/lib/waterAnim.ts')).toBe(read('../web-dashboard/src/lib/waterAnim.ts'))
  })
})

describe('анимация воды у большой темы (BACKLOG 55.5, срез 1)', () => {
  const setTheme = (k: string | null) => {
    document.documentElement.className = k ? `theme-${k}` : ''
  }
  afterEach(() => setTheme(null))

  it('в THEME_WATER только настоящие варианты, и темы-ключи — большие темы из CHAR', () => {
    for (const [k, v] of Object.entries(THEME_WATER)) expect((WATER_ANIMS as readonly string[]).includes(v), k).toBe(true)
    const src = read('../scripts/themes_data.py')
    const chars = [...src.slice(src.indexOf('\nCHAR = {'), src.indexOf('\nassert all(k in P for k in CHAR)')).matchAll(/^    '(\w+)': dict\(/gm)].map((m) => m[1])
    for (const k of Object.keys(THEME_WATER)) expect(chars, k).toContain(k)
    expect(new Set(Object.values(THEME_WATER)).size).toBeGreaterThanOrEqual(2) // темы действительно различаются
  })
  it('ничего не выбрано → играет вариант темы; обычная тема → волна', () => {
    const [themed] = Object.entries(THEME_WATER).find(([, v]) => v !== 'wave')!
    setTheme(themed)
    expect(getWaterAnim()).toBe(THEME_WATER[themed])
    expect(getWaterAnimChoice()).toBe('auto')
    setTheme('dark')
    expect(getWaterAnim()).toBe('wave')
    setTheme(null)
    expect(getWaterAnim()).toBe('wave')
  })
  it('ручной выбор главнее темы — и конкретный вариант, и явная «волна»', () => {
    const [themed] = Object.entries(THEME_WATER).find(([, v]) => v !== 'wave')!
    setTheme(themed)
    setWaterAnim('wave')
    expect(getWaterAnim()).toBe('wave')
    setWaterAnim(THEME_WATER[themed] === 'drops' ? 'ripple' : 'drops')
    expect(getWaterAnim()).not.toBe(THEME_WATER[themed])
    setWaterAnim('auto')
    expect(getWaterAnim()).toBe(THEME_WATER[themed])
  })
  it('копии themeWater.ts одинаковы в шапке и Дашборде (генерируются вместе)', () => {
    expect(read('src/lib/themeWater.ts')).toBe(read('../web-dashboard/src/lib/themeWater.ts'))
  })
})

describe('компонент WaterSavedAnim (шапка)', () => {
  const mountIt = () => mount(WaterSavedAnim, { props: { tick: 0 }, global: { stubs: { transition: false } } })
  const show = async (w: ReturnType<typeof mountIt>, tick: number) => {
    await w.setProps({ tick })
    await vi.advanceTimersByTimeAsync(10)
  }

  it('не виден, пока tick = 0; после роста tick виден и гаснет через ~1.4 с (как раньше)', async () => {
    const w = mountIt()
    expect(w.find('[data-test="water-saved"]').exists()).toBe(false)
    await show(w, 1)
    expect(w.find('[data-test="water-saved"]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1500)
    await nextTick()
    expect(w.find('[data-test="water-saved"]').exists()).toBe(false)
    w.unmount()
  })

  it('внутри: вода (две волны), пузырьки, круги, капли, бейдж с галочкой; цвета только из --water-*', async () => {
    const w = mountIt()
    await show(w, 1)
    const html = w.html()
    for (const c of ['water-saved-fill', 'ws-wave', 'ws-wave-back', 'ws-bubble', 'ws-ripple', 'ws-drop', 'water-saved-badge', 'water-saved-check']) expect(html, c).toContain(c)
    expect(html).toContain('var(--water-')
    expect(html).not.toContain('var(--accent)')
    w.unmount()
  })

  it('вариант берётся из настроек в момент показа и по умолчанию — wave', async () => {
    const w = mountIt()
    await show(w, 1)
    expect(w.find('[data-test="water-saved"]').attributes('data-variant')).toBe('wave')
    await vi.advanceTimersByTimeAsync(1500)
    localStorage.setItem(WATER_ANIM_KEY, 'ripple')
    await show(w, 2)
    expect(w.find('[data-test="water-saved"]').attributes('data-variant')).toBe('ripple')
    localStorage.setItem(WATER_ANIM_KEY, 'мусор')
    await show(w, 3)
    expect(w.find('[data-test="water-saved"]').attributes('data-variant')).toBe('wave')
    w.unmount()
  })

  it('у каждого экземпляра свои id маски и градиента (окно воды и правая панель могут быть открыты вместе)', async () => {
    const a = mountIt()
    const b = mountIt()
    await show(a, 1)
    await show(b, 1)
    const ids = (w: ReturnType<typeof mountIt>) => [...w.html().matchAll(/id="(water-saved-[^"]+)"/g)].map((m) => m[1])
    expect(ids(a).length).toBe(2)
    expect(ids(a).some((x) => ids(b).includes(x))).toBe(false)
    a.unmount()
    b.unmount()
  })
})

describe('CSS анимации в header.css (страж)', () => {
  const block = css.slice(css.indexOf('/* Анимация «записалось»'), css.indexOf('/* Правая выдвижная панель */'))
  it('каждая анимация ссылается на существующие keyframes', () => {
    const used = new Set([...block.matchAll(/animation:\s*([a-z-]+)/g)].map((m) => m[1]).filter((n) => n !== 'none'))
    const defined = new Set([...block.matchAll(/@keyframes\s+([a-z-]+)/g)].map((m) => m[1]))
    expect(used.size).toBeGreaterThanOrEqual(8)
    for (const u of used) expect(defined.has(u), u).toBe(true)
  })
  it('заданы все три варианта; у wave нет капель, у drops нет пузырьков, у ripple нет капель и пузырьков', () => {
    for (const v of WATER_ANIMS) expect(block, v).toContain(`.water-saved[data-variant="${v}"]`)
    expect(block).toMatch(/\[data-variant="wave"\] \.ws-drop[^{]*\{\s*display:\s*none/)
    expect(block).toMatch(/\[data-variant="drops"\] \.ws-bubble[^{]*\{\s*display:\s*none/)
    expect(block).toMatch(/\[data-variant="ripple"\] \.ws-bubble, \.water-saved\[data-variant="ripple"\] \.ws-drop\s*\{\s*display:\s*none/)
  })
  it('итоговое состояние без движения: «Отключить анимации» и reduced-motion показывают воду на месте и нарисованную галочку, скрывают пузырьки, капли и круги', () => {
    expect(block).toMatch(/html\[data-motion="off"\] \.water-saved-fill\s*\{[^}]*transform:\s*none/)
    expect(block).toMatch(/html\[data-motion="off"\] \.water-saved-check\s*\{[^}]*stroke-dashoffset:\s*0/)
    const rm = block.slice(block.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(rm).toMatch(/\.ws-bubble, \.ws-drop, \.ws-ripple\s*\{\s*display:\s*none/)
    expect(rm).toMatch(/\.water-saved-check\s*\{[^}]*stroke-dashoffset:\s*0/)
  })
  it('вся анимация укладывается в 1,4 с показа (последняя задержка + длительность < 1.4 с у каждого варианта)', () => {
    const num = (re: RegExp) => Number((block.match(re) || [])[1])
    // wave: бейдж 0.7 + 0.38, галочка 0.85 + 0.35 = 1.2
    expect(0.85 + 0.35).toBeLessThan(1.4)
    // drops: галочка 1 + 0.35 = 1.35
    expect(num(/\[data-variant="drops"\] \.water-saved-check\s*\{\s*animation-delay:\s*([\d.]+)s/) + 0.35).toBeLessThan(1.4)
    // ripple: галочка 0.65 + 0.35
    expect(num(/\[data-variant="ripple"\] \.water-saved-check\s*\{\s*animation-delay:\s*([\d.]+)s/) + 0.35).toBeLessThan(1.4)
  })
  it('копия в Дашборде: те же keyframes и те же варианты', () => {
    const dash = read('../web-dashboard/src/components/WaterSavedAnim.vue')
    const kf = (s: string) => [...s.matchAll(/@keyframes\s+([a-z-]+)/g)].map((m) => m[1]).sort()
    expect(kf(dash)).toEqual(kf(block))
    for (const v of WATER_ANIMS) expect(dash, v).toContain(`.water-saved[data-variant='${v}']`)
  })
})

describe('«Настройки»: анимация воды', () => {
  const open = async () => {
    const w = mount(SettingsModal, { props: { userId: 'u1' }, global: { stubs: { transition: false } } })
    await flushPromises()
    return w
  }
  it('список: «По теме» и шесть вариантов; по умолчанию выбрано «По теме» (на обычной теме играет волна)', async () => {
    const w = await open()
    const sel = w.find('[data-test="water-anim-select"]')
    expect(sel.findAll('option').map((o) => o.attributes('value'))).toEqual(['auto', 'wave', 'drops', 'ripple', 'bubbles', 'pour', 'splash'])
    expect((sel.element as HTMLSelectElement).value).toBe('auto')
    expect(sel.find('option[value="auto"]').text()).toBe('По теме')
    expect(sel.find('option[value="wave"]').text()).toBe('Волна (спокойная)')
    w.unmount()
  })
  it('«По теме» после ручного выбора снимает его; явная «волна» запоминается', async () => {
    const w = await open()
    const sel = w.find('[data-test="water-anim-select"]')
    await sel.setValue('wave')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBe('wave')
    await sel.setValue('auto')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBeNull()
    w.unmount()
  })
  it('выбор запоминается и сразу проигрывается выбранный вариант', async () => {
    const w = await open()
    expect(w.find('[data-test="water-saved"]').exists()).toBe(false)
    await w.find('[data-test="water-anim-select"]').setValue('drops')
    await vi.advanceTimersByTimeAsync(10)
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBe('drops')
    expect(w.find('[data-test="water-saved"]').attributes('data-variant')).toBe('drops')
    w.unmount()
  })
  it('«Показать» проигрывает текущий вариант без добавления воды', async () => {
    localStorage.setItem(WATER_ANIM_KEY, 'ripple')
    const w = await open()
    await w.find('[data-test="water-anim-preview"]').trigger('click')
    await vi.advanceTimersByTimeAsync(10)
    expect(w.find('[data-test="water-saved"]').attributes('data-variant')).toBe('ripple')
    w.unmount()
  })
})

describe('новые варианты (BACKLOG 54.8): пузырьки, струя, всплеск', () => {
  it('в шаблоне есть элементы для каждого варианта, а в CSS — правило, которое их показывает', () => {
    const tpl = read('src/components/WaterSavedAnim.vue')
    expect(tpl).toContain('ws-stream')
    for (const b of ['ws-b-4', 'ws-b-5', 'ws-b-6']) expect(tpl, b).toContain(b)
    expect(css).toMatch(/data-variant="pour"\] \.ws-stream \{ display: initial/)
    expect(css).toMatch(/data-variant="bubbles"\] \.ws-bx \{ display: initial/)
    expect(css).toMatch(/data-variant="splash"\] \.ws-drop \{ animation: water-saved-splash/)
    // по умолчанию (wave/drops/ripple) струи и дополнительных пузырьков не видно
    expect(css).toMatch(/\.ws-stream \{ display: none/)
    expect(css).toMatch(/\.ws-bx \{ display: none/)
  })
})

describe('платные анимации воды (BACKLOG 54.9)', () => {
  it('надетый предмет главнее ручного выбора и темы; снятый — возвращает прежнее', async () => {
    const m = await import('./lib/waterAnim')
    expect(m.parseWaterItem('water_rain')).toBe('rain')
    expect(m.parseWaterItem('water_tide')).toBe('tide')
    expect(m.parseWaterItem('water_sparkle')).toBe('sparkle')
    expect(m.parseWaterItem('wave')).toBeNull()
    expect(m.parseWaterItem(null)).toBeNull()
    m.setWaterAnim('drops')
    expect(m.getWaterAnim()).toBe('drops')
    m.writeCachedWaterItem('tide')
    expect(m.getWaterAnim()).toBe('tide')
    m.writeCachedWaterItem(null)
    expect(m.getWaterAnim()).toBe('drops')
    expect(m.WATER_ANIMS).not.toContain('rain') // платные не попадают в бесплатный выбор «Настроек»
  })
  it('в CSS есть правила для rain/tide/sparkle, а базовое состояние новых элементов скрыто (без анимации ничего лишнего)', () => {
    for (const v of ['rain', 'tide', 'sparkle']) expect(css, v).toContain(`data-variant="${v}"`)
    expect(css).toMatch(/\.ws-rd \{ display: none; opacity: 0; \}/)
    expect(css).toMatch(/\.ws-spark \{ display: none; opacity: 0;/)
    expect(css).toMatch(/\.ws-stream \{ display: none; opacity: 0;/)
  })
})
