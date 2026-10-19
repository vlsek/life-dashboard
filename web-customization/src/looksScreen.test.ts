import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 64.1, срез 5b: «Образы» — сохранить текущий вид, надеть, переименовать, удалить; сообщение после перезагрузки.
const h = vi.hoisted(() => ({ total: 250, owned: [] as any[], ach: [] as { key: string }[], updates: [] as any[], fail: false }))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, customization: {} } : null, error: null }),
      insert: () => Promise.resolve({ error: null }),
      upsert: () => Promise.resolve({ error: null }),
      update: (p: unknown) => ({ eq: () => { h.updates.push({ table, p }); return Promise.resolve({ error: h.fail ? { message: 'boom' } : null }) } }),
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
import { ITEMS } from './lib/customization'
import { useCustomization } from './lib/useCustomization'
import { MAX_LOOKS, lookKey } from './lib/looks'

const frames = ITEMS.filter((i) => i.category === 'avatar_frame')
const ownedFrame = frames.find((i) => i.source === 'points')!
const otherFrame = frames.find((i) => i.source === 'points' && i.key !== ownedFrame.key)!
const reload = vi.fn()

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('site_theme', 'dark')
  document.documentElement.className = 'theme-dark'
  history.replaceState(null, '', location.pathname)
  h.total = 100000
  h.owned = [{ item_key: ownedFrame.key }]
  h.ach = []
  h.updates = []
  h.fail = false
  reload.mockClear()
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload, hash: '', pathname: '/customization/', search: '' } })
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function openLooks() {
  window.location.hash = '#slot=looks'
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const store = (id: string, o: object) => localStorage.setItem(lookKey(id), JSON.stringify(o))

describe('образы: сохранение, список, правка', () => {
  it('на витрине есть ячейка «Образы» (пока нет — «Пока нет»), слот открывает панель с подсказкой и пустым списком', async () => {
    window.location.hash = ''
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    const cell = w.find('[data-testid="slot-cell-looks"]')
    expect(cell.exists()).toBe(true)
    expect(cell.find('[data-testid="slot-value"]').text()).toBe('Пока нет')
    expect(cell.find('[data-testid="slot-count"]').text()).toBe('0/' + MAX_LOOKS)
    w.unmount()
    const w2 = await openLooks()
    expect(w2.find('[data-testid="looks-panel"]').exists()).toBe(true)
    expect(w2.find('[data-testid="look-empty"]').exists()).toBe(true)
    w2.unmount()
  })
  it('«Сохранить текущий вид» записывает образ с именем, темой и выбором пикеров; он появляется в списке', async () => {
    localStorage.setItem('splash_variant', 'orbit')
    const w = await openLooks()
    await w.find('[data-testid="look-name"]').setValue('Осень')
    await w.find('[data-testid="look-save"]').trigger('click')
    await flushPromises()
    const saved = JSON.parse(localStorage.getItem(lookKey('l1'))!)
    expect(saved.n).toBe('Осень')
    expect(saved.p.splash_variant).toBe('orbit')
    expect(w.find('[data-testid="look-l1"] [data-testid="look-title"]').text()).toBe('Осень')
    expect(w.find('[data-testid="look-empty"]').exists()).toBe(false)
    expect((w.find('[data-testid="look-name"]').element as HTMLInputElement).value).toBe('')
    w.unmount()
  })
  it('переименование и удаление (удаление — в два нажатия)', async () => {
    store('l1', { n: 'Старое', t: null, s: {}, p: {} })
    const w = await openLooks()
    await w.find('[data-testid="look-rename"]').trigger('click')
    await w.find('[data-testid="look-rename-input"]').setValue('Новое')
    await w.find('[data-testid="look-rename-ok"]').trigger('click')
    expect(JSON.parse(localStorage.getItem(lookKey('l1'))!).n).toBe('Новое')
    expect(w.find('[data-testid="look-title"]').text()).toBe('Новое')
    await w.find('[data-testid="look-delete"]').trigger('click')
    expect(localStorage.getItem(lookKey('l1'))).not.toBeNull() // первое нажатие только спрашивает
    expect(w.find('[data-testid="look-delete"]').text()).toBe('Точно?')
    await w.find('[data-testid="look-delete"]').trigger('click')
    expect(localStorage.getItem(lookKey('l1'))).toBeNull()
    expect(w.find('[data-testid="look-empty"]').exists()).toBe(true)
    w.unmount()
  })
  it('пять образов — предел: поле и «Сохранить» недоступны, есть пояснение', async () => {
    for (let i = 1; i <= MAX_LOOKS; i++) store('l' + i, { n: 'О' + i, t: null, s: {}, p: {} })
    const w = await openLooks()
    expect(w.find('[data-testid="look-full"]').exists()).toBe(true)
    expect(w.find('[data-testid="look-save"]').attributes('disabled')).toBeDefined()
    expect(w.findAll('[data-testid^="look-l"]').length).toBeGreaterThanOrEqual(MAX_LOOKS)
    w.unmount()
  })
})

describe('образы: надеть', () => {
  it('выбор каталога пишется одним запросом (чужое пропущено), ключи пикеров ставятся/сбрасываются, страница перезагружается, сообщение сохранено', async () => {
    store('l1', { n: 'Тест', t: null, s: { avatar_frame: ownedFrame.key, collapse_style: 'нет_такого' }, p: { splash_variant: 'orbit' } })
    localStorage.setItem('chart_line', 'smooth') // в образе нет — вернётся «по умолчанию»
    const w = await openLooks()
    await w.find('[data-testid="look-wear"]').trigger('click')
    await flushPromises()
    const upd = h.updates.filter((u: any) => u.table === 'profiles')
    expect(upd).toHaveLength(1)
    expect(upd[0].p).toEqual({ customization: { avatar_frame: ownedFrame.key } })
    expect(localStorage.getItem('splash_variant')).toBe('orbit')
    expect(localStorage.getItem('chart_line')).toBeNull()
    expect(JSON.parse(sessionStorage.getItem('cust_look_note')!)).toEqual({ name: 'Тест', skipped: 1 })
    expect(reload).toHaveBeenCalledTimes(1)
    w.unmount()
  })
  it('предмет, которого нет у человека, не надевается даже если он в образе', async () => {
    store('l1', { n: 'Чужой', t: null, s: { avatar_frame: otherFrame.key }, p: {} })
    const w = await openLooks()
    await w.find('[data-testid="look-wear"]').trigger('click')
    await flushPromises()
    expect((h.updates.find((u: any) => u.table === 'profiles') as any).p).toEqual({ customization: {} })
    w.unmount()
  })
  it('ошибка записи: страница не перезагружается, ключи пикеров не тронуты, видно сообщение', async () => {
    h.fail = true
    store('l1', { n: 'Тест', t: null, s: {}, p: { splash_variant: 'orbit' } })
    const w = await openLooks()
    await w.find('[data-testid="look-wear"]').trigger('click')
    await flushPromises()
    expect(reload).not.toHaveBeenCalled()
    expect(localStorage.getItem('splash_variant')).toBeNull()
    expect(w.find('[data-testid="look-error"]').exists()).toBe(true)
    w.unmount()
  })
  it('после перезагрузки сообщение «Образ надет» (и сколько пропущено) показывается один раз', async () => {
    sessionStorage.setItem('cust_look_note', JSON.stringify({ name: 'Осень', skipped: 2 }))
    const w = await openLooks()
    const note = w.find('[data-testid="look-note"]').text()
    expect(note).toContain('Осень')
    expect(note).toContain('2')
    expect(sessionStorage.getItem('cust_look_note')).toBeNull()
    w.unmount()
  })
})

describe('applyAll — своя защита (вторая линия после плана)', () => {
  it('закрытое, чужой категории и мусор отбрасываются; применённое считается; ошибка — null', async () => {
    const c = useCustomization()
    await c.init()
    const n = await c.applyAll({ avatar_frame: otherFrame.key, collapse_style: ownedFrame.key, day_gauge: 'мусор', water_glass: null })
    expect(n).toBe(0) // otherFrame закрыт; ownedFrame лежит не в своей категории; мусор
    expect((h.updates.at(-1) as any).p).toEqual({ customization: {} })
    expect(await c.applyAll({ avatar_frame: ownedFrame.key })).toBe(1)
    expect(c.selected.value).toEqual({ avatar_frame: ownedFrame.key })
    h.fail = true
    expect(await c.applyAll({ avatar_frame: ownedFrame.key })).toBeNull()
    expect(c.actionError.value).toBeTruthy()
  })
})

