import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ owned: [] as any[], custom: {} as Record<string, string> }))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, customization: h.custom } : null, error: null }),
      insert: () => Promise.resolve({ error: null }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'user_customizations' ? h.owned : [], error: null }).then(res),
    }
    return c
  }
  return {
    sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from: chain, rpc: () => Promise.resolve({ data: [{ user_id: 'u1', total_points: 500 }], error: null }) },
    logout: vi.fn(),
  }
})
import App from './App.vue'
import { customCount, selectionRows, type SelectionReaders } from './lib/currentSelection'
import { groupCounts } from './lib/pageTabs'

const base: SelectionReaders = { theme: 'dark', selected: {}, splash: 'auto', streakFlame: 'flame', waterAnim: 'auto', bodyModel: null, chartMarker: 'flat' }
const byId = (rows: ReturnType<typeof selectionRows>, id: string) => rows.find((r) => r.section === id)!

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('cust_tab', 'all')
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('site_theme', 'dark')
  document.documentElement.className = 'theme-dark'
  h.owned = []
  h.custom = {}
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('selectionRows (61.6 срез 1)', () => {
  it('по умолчанию всё «базовое»: ни одной подсвеченной строки', () => {
    const rows = selectionRows(base)
    expect(customCount(rows)).toBe(0)
    expect(byId(rows, 'avatar_frame').valueKey).toBe('cust_now_default')
    expect(byId(rows, 'splash').valueKey).toBe('cust_splash_auto')
  })

  it('выбранный предмет и свои значения помечаются и получают названия из словаря', () => {
    const rows = selectionRows({ ...base, theme: 'monet', selected: { avatar_frame: 'frame_neon' }, splash: 'orbit', bodyModel: 'chibi', chartMarker: 'glass', streakFlame: 'tongues', waterAnim: 'drops' })
    expect(byId(rows, 'themes')).toMatchObject({ valueKey: 'theme_monet', custom: true })
    expect(byId(rows, 'avatar_frame')).toMatchObject({ valueKey: 'cust_item_frame_neon', custom: true })
    expect(byId(rows, 'splash').valueKey).toBe('splash_variant_orbit')
    expect(byId(rows, 'bodymodel').valueKey).toBe('cust_body_chibi')
    expect(byId(rows, 'chart-markers').valueKey).toBe('chart_marker_glass')
    expect(byId(rows, 'streakflame').valueKey).toBe('cust_streakflame_tongues')
    expect(byId(rows, 'wateranim').valueKey).toBe('cust_wateranim_drops')
    expect(customCount(rows)).toBe(7)
  })

  it('у каждой строки есть раздел, заголовок и значение — все ключи есть в словаре RU и EN', async () => {
    const { t, setLang } = await import('./lib/i18n')
    const rows = selectionRows({ ...base, theme: 'monet', selected: { avatar_frame: 'frame_neon', water_glass: 'glass_mug' }, splash: 'orbit', bodyModel: 'stocky', waterAnim: 'wave' })
    for (const lang of ['ru', 'en'] as const) {
      setLang(lang)
      for (const r of rows) {
        expect(t(r.titleKey as never), `${lang} ${r.titleKey}`).not.toBe(r.titleKey)
        expect(t(r.valueKey as never), `${lang} ${r.valueKey}`).not.toBe(r.valueKey)
      }
    }
    setLang('ru')
  })
})

describe('groupCounts (счётчики вкладок)', () => {
  it('суммирует «открыто/всего» по разделам группы', () => {
    const c = groupCounts([
      { id: 'themes', owned: 10, total: 35 },
      { id: 'avatar_frame', owned: 2, total: 19 },
      { id: 'splash', owned: 4, total: 4 },
    ])
    expect(c.look).toEqual({ owned: 12, total: 54 })
    expect(c.loading).toEqual({ owned: 4, total: 4 })
  })
})

describe('«Кастомизация»: блок «Сейчас выбрано»', () => {
  const mountApp = async () => {
    const w = mount(App)
    await flushPromises()
    return w
  }

  it('показывает сводку со строкой на раздел и счётчиком «Изменено»', async () => {
    const w = await mountApp()
    expect(w.find('[data-testid="current-selection"]').exists()).toBe(true)
    expect(w.findAll('[data-now]').length).toBeGreaterThanOrEqual(10)
    expect(w.find('[data-testid="now-changed"]').text()).toMatch(/^Изменено: \d+ из \d+$/)
    w.unmount()
  })

  it('заголовок сводки сворачивает и разворачивает список', async () => {
    const w = await mountApp()
    const list = () => w.find('[data-testid="now-list"]').element as HTMLElement
    expect(list().style.display).not.toBe('none')
    await w.find('[data-testid="now-toggle"]').trigger('click')
    expect(list().style.display).toBe('none')
    await w.find('[data-testid="now-toggle"]').trigger('click')
    expect(list().style.display).not.toBe('none')
    w.unmount()
  })

  it('выбор в карточке сразу попадает в сводку (мелкие выборы лежат в localStorage)', async () => {
    const w = await mountApp()
    expect(w.find('[data-now="splash"] [data-testid="now-value"]').text()).toBe('По теме')
    await w.find('[data-testid="splash-orbit"] button').trigger('click')
    await flushPromises()
    expect(w.find('[data-now="splash"] [data-testid="now-value"]').text()).not.toBe('По теме')
    expect(w.find('[data-now="splash"]').attributes('data-custom')).toBe('true')
    w.unmount()
  })

  it('тап по строке открывает вкладку нужной группы и раскрывает свёрнутый раздел', async () => {
    localStorage.setItem('cust_tab', 'home')
    localStorage.setItem('cust_collapsed', JSON.stringify(['section:splash']))
    const w = await mountApp()
    expect(w.find('#sg-splash').exists()).toBe(false) // вкладка «Главная и прогресс» — заставки (группа «Загрузка») нет
    await w.find('[data-now="splash"] button').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="cust-tab-loading"]').attributes('aria-selected')).toBe('true')
    expect((w.find('#sg-splash').element as HTMLElement).style.display).not.toBe('none')
    w.unmount()
  })

  it('на вкладках групп стоят счётчики «открыто/всего»', async () => {
    const w = await mountApp()
    const counts = w.findAll('[data-testid="tab-count"]').map((x) => x.text())
    expect(counts.length).toBeGreaterThan(2)
    for (const c of counts) expect(c).toMatch(/^\d+\/\d+$/)
    w.unmount()
  })
})
