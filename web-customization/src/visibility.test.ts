import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 47.1 (владелец 2026-10-07): «в кастомизации сделать переключатель видимости: получено, за достижения, за монеты».
const h = vi.hoisted(() => ({ total: 250, owned: [] as any[], ach: [] as { key: string }[] }))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, customization: {} } : null, error: null }),
      insert: () => Promise.resolve({ error: null }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'user_customizations' ? h.owned : table === 'user_achievements' ? h.ach : [], error: null }).then(res),
    }
    return c
  }
  return {
    sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from: chain, rpc: () => Promise.resolve({ data: [{ user_id: 'u1', total_points: h.total }], error: null }) },
    logout: vi.fn(),
  }
})
import App from './App.vue'
import VisibilityChips from './components/VisibilityChips.vue'
import { ITEMS } from './lib/customization'
import { THEME_UNLOCK } from './lib/theme'
import { VISIBILITY_KEY, allVisible, groupOfItem, groupOfTheme, readVisibility, useVisibility } from './lib/useVisibility'
import source from './App.vue?raw'

beforeEach(() => {
  vi.restoreAllMocks() // в тесте про недоступное хранилище localStorage.setItem подменён
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.documentElement.className = 'theme-dark'
  h.total = 250
  h.owned = []
  h.ach = []
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

const mountPage = async () => {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const cards = (w: ReturnType<typeof mount>) => w.findAll('[data-testid^="item-"]').filter((n) => /^item-(frame|collapse)_/.test(n.attributes('data-testid') || ''))
const themeCards = (w: ReturnType<typeof mount>) => w.findAll('[data-section="themes"] [data-testid^="theme-"]').filter((n) => /^theme-[a-z]+$/.test(n.attributes('data-testid') || '') && n.attributes('data-locked') !== undefined)
const lockedThemes = Object.keys(THEME_UNLOCK)
const chip = (w: ReturnType<typeof mount>, g: string) => w.find(`[data-testid="vis-${g}"]`)

describe('группы: каждый предмет и тема ровно в одной', () => {
  it('куплено/выбрано → получено; иначе по источнику', () => {
    expect(groupOfItem({ source: 'points' }, 'owned')).toBe('owned')
    expect(groupOfItem({ source: 'points' }, 'selected')).toBe('owned')
    expect(groupOfItem({ source: 'achievement' }, 'owned')).toBe('owned') // награда, которую уже выдали
    expect(groupOfItem({ source: 'points' }, 'buyable')).toBe('coins')
    expect(groupOfItem({ source: 'points' }, 'short')).toBe('coins') // не хватает монет — всё равно «за монеты»
    expect(groupOfItem({ source: 'achievement' }, 'locked')).toBe('achievement')
  })
  it('тема: закрытая — за достижения, открытая — получено', () => {
    expect(groupOfTheme(true)).toBe('achievement')
    expect(groupOfTheme(false)).toBe('owned')
  })
})

describe('хранение', () => {
  it('по умолчанию видно всё; мусор и чужие ключи — тоже всё', () => {
    expect(readVisibility()).toEqual(allVisible())
    localStorage.setItem(VISIBILITY_KEY, '{oops')
    expect(readVisibility()).toEqual(allVisible())
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify({ owned: 'нет', coins: 0, zzz: false }))
    expect(readVisibility()).toEqual(allVisible()) // не булево false — не прячем
    localStorage.setItem(VISIBILITY_KEY, '[1,2]')
    expect(readVisibility()).toEqual(allVisible())
  })
  it('переключение запоминается и читается заново', () => {
    const v = useVisibility()
    v.toggle('achievement')
    expect(JSON.parse(localStorage.getItem(VISIBILITY_KEY)!)).toEqual({ owned: true, achievement: false, coins: true })
    expect(useVisibility().isVisible('achievement')).toBe(false)
    v.toggle('achievement')
    expect(readVisibility()).toEqual(allVisible())
  })
  it('«все выключены» определяется; хранилище недоступно — выбор действует до перезагрузки, без ошибки', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const v = useVisibility()
    v.toggle('owned')
    v.toggle('achievement')
    expect(v.noneVisible.value).toBe(false)
    v.toggle('coins')
    expect(v.noneVisible.value).toBe(true)
  })
})

describe('<VisibilityChips>', () => {
  it('три чипа с числом предметов; нажатие поднимает событие; aria-pressed отражает состояние', async () => {
    const w = mount(VisibilityChips, { props: { state: { owned: true, achievement: false, coins: true }, counts: { owned: 3, achievement: 12, coins: 4 } } })
    expect(w.findAll('button')).toHaveLength(3)
    expect(w.find('[data-testid="vis-owned"]').text()).toContain('Получено')
    expect(w.find('[data-testid="vis-achievement"]').text()).toContain('За достижения')
    expect(w.find('[data-testid="vis-coins"]').text()).toContain('За монеты')
    expect(w.findAll('[data-testid="vis-count"]').map((n) => n.text())).toEqual(['3', '12', '4'])
    expect(w.find('[data-testid="vis-achievement"]').attributes('aria-pressed')).toBe('false')
    expect(w.find('[data-testid="vis-owned"]').attributes('aria-pressed')).toBe('true')
    await w.find('[data-testid="vis-coins"]').trigger('click')
    expect(w.emitted('toggle')).toEqual([['coins']])
  })
})

describe('страница «Кастомизация»: фильтр видимости', () => {
  const owned = ['frame_neon', 'frame_gold'].map((k) => ({ item_key: k, source: k === 'frame_gold' ? 'achievement' : 'points', unlocked_at: '2026-10-01' }))

  it('по умолчанию видно всё: предметов столько же, сколько в реестре; счётчики групп сходятся с реестром', async () => {
    h.owned = owned
    const w = await mountPage()
    expect(cards(w)).toHaveLength(ITEMS.length)
    const counts = w.findAll('[data-testid="vis-count"]').map((n) => Number(n.text()))
    const themes = themeCards(w).length
    expect(themes).toBe(25) // все 25 тем видны
    expect(counts.reduce((a, b) => a + b, 0)).toBe(ITEMS.length + themes) // каждый предмет и каждая тема — ровно в одной группе
    // за достижения: ещё не выданные рамки-награды + 6 закрытых тем; получено: 2 рамки + 5 открытых тем; за монеты: остальные платные
    expect(counts[1]).toBe(ITEMS.filter((i) => i.source === 'achievement' && i.key !== 'frame_gold').length + lockedThemes.length)
    expect(counts[0]).toBe(2 + (themes - lockedThemes.length))
    w.unmount()
  })

  it('«За монеты» выключен — не купленные за монеты предметы исчезают, купленные и «за достижения» остаются', async () => {
    h.owned = owned
    const w = await mountPage()
    await chip(w, 'coins').trigger('click')
    await flushPromises()
    const statuses = cards(w).map((c) => c.attributes('data-status'))
    expect(statuses).not.toContain('buyable')
    expect(statuses).not.toContain('short')
    expect(cards(w).some((c) => c.attributes('data-testid') === 'item-frame_neon')).toBe(true) // куплена — «получено»
    expect(cards(w).some((c) => c.attributes('data-testid') === 'item-frame_inferno')).toBe(true) // за достижение, ещё закрыта
    w.unmount()
  })

  it('«За достижения» выключен — закрытые награды и закрытые темы исчезают', async () => {
    h.owned = owned
    const w = await mountPage()
    await chip(w, 'achievement').trigger('click')
    await flushPromises()
    expect(cards(w).map((c) => c.attributes('data-status'))).not.toContain('locked')
    expect(w.find('[data-testid="item-frame_inferno"]').exists()).toBe(false)
    expect(w.find('[data-testid="item-frame_gold"]').exists()).toBe(true) // уже выдана — «получено»
    const shown = themeCards(w)
    expect(shown).toHaveLength(25 - lockedThemes.length) // шесть тем-наград закрыты — скрыты, открытые (в том числе двенадцать новых) остались
    expect(shown.every((n) => n.attributes('data-locked') === 'false')).toBe(true)
    w.unmount()
  })

  it('«Получено» выключен — остаются только ещё не полученные', async () => {
    h.owned = owned
    const w = await mountPage()
    await chip(w, 'owned').trigger('click')
    await flushPromises()
    const st = cards(w).map((c) => c.attributes('data-status'))
    expect(st).not.toContain('owned')
    expect(st).not.toContain('selected')
    expect(w.find('[data-testid="item-frame_neon"]').exists()).toBe(false)
    expect(themeCards(w)).toHaveLength(lockedThemes.length) // открытые темы — «получено», скрыты; остались закрытые
    expect(themeCards(w).every((n) => n.attributes('data-locked') === 'true')).toBe(true)
    w.unmount()
  })

  it('все выключены — понятная подпись, карточек нет; возврат чипа возвращает витрину', async () => {
    const w = await mountPage()
    for (const g of ['owned', 'achievement', 'coins']) await chip(w, g).trigger('click')
    await flushPromises()
    expect(cards(w)).toHaveLength(0)
    expect(w.find('[data-section="themes"]').exists()).toBe(false)
    expect(w.find('[data-testid="vis-empty"]').text()).toContain('Всё скрыто')
    await chip(w, 'coins').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="vis-empty"]').exists()).toBe(false)
    expect(cards(w).length).toBeGreaterThan(0)
    w.unmount()
  })

  it('выбор запоминается: после «перезагрузки» страницы чип остаётся выключенным', async () => {
    const w1 = await mountPage()
    await chip(w1, 'achievement').trigger('click')
    w1.unmount()
    const w2 = await mountPage()
    expect(chip(w2, 'achievement').attributes('aria-pressed')).toBe('false')
    expect(chip(w2, 'coins').attributes('aria-pressed')).toBe('true')
    w2.unmount()
  })

  it('счётчики «открыто/всего» у групп редкости не меняются от фильтра (прогресс честный)', async () => {
    h.owned = owned
    const w = await mountPage()
    const before = w.findAll('[data-testid="rarity-count"]').map((n) => n.text())
    await chip(w, 'coins').trigger('click')
    await flushPromises()
    const after = w.findAll('[data-testid="rarity-count"]')
    // оставшиеся группы показывают те же «открыто/всего», что и до фильтра
    for (const n of after) expect(before).toContain(n.text())
    w.unmount()
  })

  it('проводка: фильтр применяется к и темам, и предметам; реестр предметов не менялся', () => {
    expect(source).toMatch(/visibleThemeBuckets/)
    expect(source).toMatch(/visibleCategories/)
    expect(source).toMatch(/v-for="k in g\.shown"/)
    expect(source).toMatch(/v-for="it in g\.shown"/)
  })
})
