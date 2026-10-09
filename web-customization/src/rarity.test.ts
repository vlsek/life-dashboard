import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ITEMS } from './lib/customization'
import { THEME_KEYS } from './lib/theme'
import { COLLAPSED_KEY, readCollapsed } from './lib/useCollapsed'
import { ITEM_RARITY, RARITIES, RARITY_COLOR, THEME_RARITY, groupByRarity, itemGroups, priceRank, rarityOfItem, rarityOfTheme, themeGroups } from './lib/rarity'
import i18nRaw from './lib/i18n.ts?raw'

const h = vi.hoisted(() => ({ total: 250 }))
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
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
    }
    return c
  }
  return {
    sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from: chain, rpc: () => Promise.resolve({ data: [{ user_id: 'u1', total_points: h.total }], error: null }) },
    logout: vi.fn(),
  }
})
import App from './App.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.total = 250
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('таблица редкости (страж: ничего не остаётся без редкости)', () => {
  it('у каждого предмета реестра есть редкость, и нет записей про несуществующие предметы', () => {
    expect(ITEMS.filter((i) => !(i.key in ITEM_RARITY)).map((i) => i.key)).toEqual([])
    expect(Object.keys(ITEM_RARITY).filter((k) => !ITEMS.some((i) => i.key === k))).toEqual([])
  })

  it('у каждой темы есть редкость, и нет записей про несуществующие темы', () => {
    const themes = Object.keys(THEME_KEYS)
    expect(themes.filter((k) => !(k in THEME_RARITY))).toEqual([])
    expect(Object.keys(THEME_RARITY).filter((k) => !themes.includes(k))).toEqual([])
  })

  it('все значения — известные уровни; у каждого уровня есть цвет и подпись RU и EN', () => {
    const known = new Set<string>(RARITIES)
    for (const r of [...Object.values(ITEM_RARITY), ...Object.values(THEME_RARITY)]) expect(known.has(r), r).toBe(true)
    for (const r of RARITIES) {
      expect(RARITY_COLOR[r], r).toMatch(/^#[0-9a-f]{6}$/i)
      expect([...i18nRaw.matchAll(new RegExp('cust_rarity_' + r + ':', 'g'))].length, r).toBe(2)
    }
  })

  it('у платных предметов редкость не убывает с ценой (100 ≤ 150 ≤ 250)', () => {
    const paid = ITEMS.filter((i) => priceRank(i) > 0).sort((a, b) => priceRank(a) - priceRank(b))
    for (let i = 1; i < paid.length; i++) {
      expect(RARITIES.indexOf(rarityOfItem(paid[i].key)), paid[i].key + ' не реже ' + paid[i - 1].key).toBeGreaterThanOrEqual(RARITIES.indexOf(rarityOfItem(paid[i - 1].key)))
    }
  })

  it('исходные четыре темы и «Высокий контраст» — обычные (доступность не прячется за наградой)', () => {
    for (const k of ['dark', 'monet', 'light', 'pink', 'contrast']) expect(rarityOfTheme(k), k).toBe('common')
    expect(RARITIES.map((r) => themeGroups().find((g) => g.rarity === r)?.items.length ?? 0).reduce((a, b) => a + b, 0)).toBe(Object.keys(THEME_KEYS).length)
  })

  it('неизвестный ключ считается обычным (страница не падает)', () => {
    expect(rarityOfItem('нет_такого')).toBe('common')
    expect(rarityOfTheme('нет_такой')).toBe('common')
  })

  it('groupByRarity: порядок от обычных к легендарным, пустые группы не возвращаются, порядок внутри сохранён', () => {
    const g = groupByRarity(['a', 'b', 'c', 'd'], (x) => ({ a: 'epic', b: 'common', c: 'epic', d: 'legendary' })[x] as 'epic' | 'common' | 'legendary')
    expect(g.map((x) => x.rarity)).toEqual(['common', 'epic', 'legendary'])
    expect(g[1].items).toEqual(['a', 'c'])
    expect(itemGroups(ITEMS).flatMap((x) => x.items).length).toBe(ITEMS.length)
  })
})

describe('страница: группы по редкости и сворачивание', () => {
  it('темы и рамки разложены по группам редкости в порядке «обычные → легендарные»', async () => {
    const w = mount(App)
    await flushPromises()
    const order = (sel: string) => w.findAll(`${sel} [data-rarity][data-collapsed]`).map((g) => g.attributes('data-rarity'))
    expect(order('[data-section="themes"]')).toEqual(['common', 'uncommon', 'rare', 'epic', 'legendary'])
    expect(order('[data-section="avatar_frame"]')).toEqual(['common', 'uncommon', 'rare', 'epic', 'legendary'])
    expect(w.find('[data-testid="rarity-themes:uncommon"]').text()).toContain('Необычные')
    expect(w.find('[data-testid="rarity-themes:common"]').text()).toContain('Обычные')
    expect(w.find('[data-testid="rarity-hint"]').text()).toContain('Награды разложены по редкости')
    // карточка в нужной группе и помечена редкостью
    expect(w.find('[data-testid="rarity-themes:legendary"] [data-testid="theme-amoled"]').attributes('data-rarity')).toBe('legendary')
    expect(w.find('[data-testid="rarity-avatar_frame:common"] [data-testid="item-frame_neon"]').exists()).toBe(true)
    expect(w.find('[data-testid="rarity-avatar_frame:legendary"] [data-testid="item-frame_inferno"]').exists()).toBe(true)
    w.unmount()
  })

  it('заголовок группы: «открыто/всего» у предметов и у тем', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="rarity-themes:common"] [data-testid="rarity-count"]').text()).toBe('5/5')
    expect(w.find('[data-testid="rarity-avatar_frame:common"] [data-testid="rarity-count"]').text()).toBe('0/4')
    expect(w.find('[data-testid="rarity-avatar_frame:rare"] [data-testid="rarity-count"]').text()).toBe('0/13')
    expect(w.find('[data-testid="rarity-avatar_frame:epic"] [data-testid="rarity-count"]').text()).toBe('0/4')
    w.unmount()
  })

  it('по умолчанию всё развёрнуто; клик сворачивает группу, второй клик разворачивает; состояние пишется в localStorage', async () => {
    const w = mount(App)
    await flushPromises()
    const g = '[data-testid="rarity-themes:epic"]'
    expect(w.find(g).attributes('data-collapsed')).toBe('false')
    expect(w.find(`${g} [data-testid="rarity-toggle"]`).attributes('aria-expanded')).toBe('true')
    await w.find(`${g} [data-testid="rarity-toggle"]`).trigger('click')
    expect(w.find(g).attributes('data-collapsed')).toBe('true')
    expect(w.find(`${g} [data-testid="rarity-toggle"]`).attributes('aria-expanded')).toBe('false')
    expect(w.find(`${g} [data-testid="rarity-body"]`).attributes('style')).toContain('display: none')
    expect(JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]')).toEqual(['themes:epic'])
    // соседние группы не затронуты
    expect(w.find('[data-testid="rarity-themes:rare"]').attributes('data-collapsed')).toBe('false')
    expect(w.find('[data-testid="rarity-avatar_frame:epic"]').attributes('data-collapsed')).toBe('false')
    await w.find(`${g} [data-testid="rarity-toggle"]`).trigger('click')
    expect(w.find(g).attributes('data-collapsed')).toBe('false')
    expect(JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]')).toEqual([])
    w.unmount()
  })

  it('свёрнутое запоминается после перезагрузки страницы', async () => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(['avatar_frame:common', 'themes:legendary']))
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="rarity-avatar_frame:common"]').attributes('data-collapsed')).toBe('true')
    expect(w.find('[data-testid="rarity-themes:legendary"]').attributes('data-collapsed')).toBe('true')
    expect(w.find('[data-testid="rarity-themes:common"]').attributes('data-collapsed')).toBe('false')
    w.unmount()
  })

  it('свёрнутая группа не теряет кнопки: карточки остаются в DOM, «Применить» работает после разворота', async () => {
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="rarity-themes:common"] [data-testid="rarity-toggle"]').trigger('click')
    expect(w.find('[data-testid="theme-light"] [data-testid="apply"]').exists()).toBe(true)
    await w.find('[data-testid="rarity-themes:common"] [data-testid="rarity-toggle"]').trigger('click')
    await w.find('[data-testid="theme-light"] [data-testid="apply"]').trigger('click')
    expect(document.documentElement.classList.contains('theme-light')).toBe(true)
    w.unmount()
  })

  it('покупка рамки обновляет счётчик «открыто» в её группе', async () => {
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="item-frame_neon"] [data-testid="buy"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="rarity-avatar_frame:common"] [data-testid="rarity-count"]').text()).toBe('1/4')
    w.unmount()
  })

  it('мусор в localStorage не ломает страницу: всё развёрнуто', async () => {
    for (const bad of ['не json', '{"a":1}', '[1,null,"themes:epic",{}]']) {
      localStorage.setItem(COLLAPSED_KEY, bad)
      expect(() => readCollapsed()).not.toThrow()
    }
    localStorage.setItem(COLLAPSED_KEY, 'не json')
    const w = mount(App)
    await flushPromises()
    expect(w.findAll('[data-collapsed="true"]')).toHaveLength(0)
    localStorage.setItem(COLLAPSED_KEY, '[1,null,"themes:epic",{}]')
    expect(readCollapsed()).toEqual(['themes:epic'])
    w.unmount()
  })
})

describe('рамки-награды лесенок «Достижений» (BACKLOG 37, шаг 2)', () => {
  const LADDER_STATIC = ['frame_ink', 'frame_neuron', 'frame_target', 'frame_gear', 'frame_bookmark', 'frame_steel', 'frame_cup', 'frame_beacon']
  const LADDER_RARE = ['frame_rare_challenges', 'frame_rare_milestones']
  it('восемь рамок 3-й ступени — редкие, две «редкие анимированные» 4-й ступени — эпические', () => {
    for (const k of LADDER_STATIC) expect(rarityOfItem(k), k).toBe('rare')
    for (const k of LADDER_RARE) expect(rarityOfItem(k), k).toBe('epic')
  })
  it('все десять — награды за достижения (не продаются), есть в реестре', () => {
    for (const k of [...LADDER_STATIC, ...LADDER_RARE]) {
      const it = ITEMS.find((i) => i.key === k)
      expect(it, k).toBeTruthy()
      expect(it!.source, k).toBe('achievement')
      expect(it!.achievement, k).toBeTruthy()
    }
  })
  it('на странице они лежат в своих группах редкости и закрыты до получения достижения', async () => {
    const w = mount(App)
    await flushPromises()
    for (const k of LADDER_STATIC) {
      expect(w.find(`[data-testid="rarity-avatar_frame:rare"] [data-testid="item-${k}"]`).exists(), k).toBe(true)
      expect(w.find(`[data-testid="item-${k}"]`).attributes('data-status'), k).toBe('locked')
    }
    for (const k of LADDER_RARE) expect(w.find(`[data-testid="rarity-avatar_frame:epic"] [data-testid="item-${k}"]`).exists(), k).toBe(true)
    w.unmount()
  })
})
