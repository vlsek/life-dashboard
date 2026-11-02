import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { PALETTE_ITEMS, availableItems, filterPalette, norm } from './lib/palette'
import { createHotkeyHandler, hotkeysHelpOpen, paletteOpen } from './lib/hotkeys'
import CommandPalette from './components/CommandPalette.vue'

// BACKLOG 79.1, срез 1: командная палитра по страницам и действиям шапки
const ids = (q: string) => filterPalette(PALETTE_ITEMS, q).map((i) => i.id)
const key = (k: string, init: KeyboardEventInit = {}, target?: Element) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })
  if (target) Object.defineProperty(ev, 'target', { value: target })
  return ev
}

beforeEach(() => {
  paletteOpen.value = false
  hotkeysHelpOpen.value = false
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('поиск в палитре', () => {
  it('пустой запрос — всё в исходном порядке; id уникальны', () => {
    expect(ids('')).toEqual(PALETTE_ITEMS.map((i) => i.id))
    expect(new Set(ids('')).size).toBe(PALETTE_ITEMS.length)
  })
  it('по началу названия, регистр и ё не важны', () => {
    expect(ids('цел')[0]).toBe('page:g')
    expect(ids('ЦЕЛИ')[0]).toBe('page:g')
    expect(norm('Ёлка')).toBe('елка')
  })
  it('ищет и по английскому названию в русском интерфейсе', () => {
    expect(ids('shop')).toEqual(['page:h'])
    expect(ids('goals')).toEqual(['page:g'])
  })
  it('начало названия выше середины; несколько слов — все должны найтись', () => {
    expect(ids('настр')).toEqual(['action:settings'])
    expect(ids('глоб наст')).toEqual(['action:settings'])
    expect(ids('глоб навык')).toEqual([])
    expect(ids('клавиш')).toEqual(['action:hotkeys'])
  })
  it('ранжирование: начало названия выше начала слова выше середины, при равенстве — исходный порядок', () => {
    const mk = (id: string, ru: string) => ({ id, kind: 'page' as const, ru, en: ru })
    const items = [mk('mid', 'кальфа'), mk('word', 'бета альфа'), mk('start', 'альфа'), mk('start2', 'альфа два')]
    expect(filterPalette(items, 'альф').map((i) => i.id)).toEqual(['start', 'start2', 'word', 'mid'])
  })
  it('нет совпадений — пусто', () => expect(ids('zzzzz')).toEqual([]))
})

describe('сочетания Ctrl/Cmd+K и /', () => {
  const mk = (extra = {}) => createHotkeyHandler({ navigate: vi.fn(), now: () => 0, ...extra })
  it('Ctrl+K и Cmd+K открывают и закрывают палитру, даже из поля ввода', () => {
    const h = mk()
    const input = document.createElement('input'); document.body.appendChild(input)
    h(key('k', { ctrlKey: true }, input))
    expect(paletteOpen.value).toBe(true)
    h(key('k', { metaKey: true }, input))
    expect(paletteOpen.value).toBe(false)
  })
  it('«/» открывает палитру, но не в поле ввода и не при открытом окне', () => {
    const h = mk()
    const input = document.createElement('input'); document.body.appendChild(input)
    h(key('/', {}, input))
    expect(paletteOpen.value).toBe(false)
    const m = document.createElement('div'); m.className = 'modal-backdrop'; document.body.appendChild(m)
    h(key('/'))
    expect(paletteOpen.value).toBe(false)
    m.remove()
    h(key('/'))
    expect(paletteOpen.value).toBe(true)
  })
  it('выключенные горячие клавиши палитру не открывают; Ctrl+Shift+K и Ctrl+Alt+K — тоже нет', () => {
    const off = mk({ enabled: () => false })
    off(key('k', { ctrlKey: true })); off(key('/'))
    expect(paletteOpen.value).toBe(false)
    const h = mk()
    h(key('k', { ctrlKey: true, shiftKey: true })); h(key('k', { ctrlKey: true, altKey: true }))
    expect(paletteOpen.value).toBe(false)
  })
})

describe('CommandPalette', () => {
  it('показывает все пункты; набор букв сужает список; Enter отдаёт выбранный', async () => {
    const w = mount(CommandPalette, { attachTo: document.body })
    expect(w.findAll('[data-test="palette-item"]')).toHaveLength(availableItems(PALETTE_ITEMS, { water: false }).length) // «Вода» без учёта воды не показывается
    await w.find('[data-test="palette-input"]').setValue('цел')
    expect(w.findAll('[data-test="palette-item"]')[0].text()).toMatch(/Цели|Goals/)
    await w.find('[data-test="palette-input"]').trigger('keydown', { key: 'Enter' })
    expect((w.emitted('pick')![0][0] as { id: string }).id).toBe('page:g')
    w.unmount()
  })
  it('стрелки двигают выбор по кругу; клик по пункту отдаёт его; Esc и фон закрывают', async () => {
    const w = mount(CommandPalette, { attachTo: document.body })
    const input = w.find('[data-test="palette-input"]')
    await input.trigger('keydown', { key: 'ArrowUp' }) // с первого — на последний
    await input.trigger('keydown', { key: 'Enter' })
    expect((w.emitted('pick')![0][0] as { id: string }).id).toBe(PALETTE_ITEMS[PALETTE_ITEMS.length - 1].id)
    await w.findAll('[data-test="palette-item"]')[1].trigger('click')
    expect((w.emitted('pick')![1][0] as { id: string }).id).toBe(PALETTE_ITEMS[1].id)
    await input.trigger('keydown', { key: 'Escape' })
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })
  it('пустой результат — подсказка, Enter ничего не отдаёт', async () => {
    const w = mount(CommandPalette, { attachTo: document.body })
    await w.find('[data-test="palette-input"]').setValue('zzzzz')
    expect(w.find('[data-test="palette-empty"]').exists()).toBe(true)
    await w.find('[data-test="palette-input"]').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('pick')).toBeUndefined()
    w.unmount()
  })
})
