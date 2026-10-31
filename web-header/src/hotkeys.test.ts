import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { HOTKEY_PAGES, SEQUENCE_MS, createHotkeyHandler, hotkeysEnabled, hotkeysHelpOpen, setHotkeysEnabled } from './lib/hotkeys'
import HotkeysModal from './components/HotkeysModal.vue'

// BACKLOG 79.8, срез 1: «g» + буква — переход, «?» — шпаргалка; не мешают вводу и окнам
let nav: ReturnType<typeof vi.fn>
let clock: number
const mk = (over: { enabled?: () => boolean } = {}) => createHotkeyHandler({ navigate: nav as unknown as (h: string) => void, now: () => clock, ...over })
const key = (k: string, init: KeyboardEventInit = {}, target?: Element) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })
  if (target) Object.defineProperty(ev, 'target', { value: target })
  return ev
}

beforeEach(() => {
  nav = vi.fn()
  clock = 1000
  hotkeysHelpOpen.value = false
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('горячие клавиши шапки', () => {
  it('буквы уникальны, адреса — страницы приложения', () => {
    const l = HOTKEY_PAGES.map((p) => p.letter)
    expect(new Set(l).size).toBe(l.length)
    expect(l).not.toContain('?')
    for (const p of HOTKEY_PAGES) expect(p.href).toMatch(/^\/[a-z]+\/$/)
  })
  it('g d → Дашборд, g g → Цели', () => {
    const h = mk()
    h(key('g')); h(key('d'))
    expect(nav).toHaveBeenLastCalledWith('/dashboard/')
    h(key('g')); h(key('g'))
    expect(nav).toHaveBeenLastCalledWith('/goals/')
  })
  it('вторая клавиша без «g» ничего не делает; по таймауту «g» протухает', () => {
    const h = mk()
    h(key('d'))
    expect(nav).not.toHaveBeenCalled()
    h(key('g')); clock += SEQUENCE_MS + 1; h(key('d'))
    expect(nav).not.toHaveBeenCalled()
  })
  it('неизвестная буква после «g» сбрасывает последовательность', () => {
    const h = mk()
    h(key('g')); h(key('z')); h(key('d'))
    expect(nav).not.toHaveBeenCalled()
  })
  it('не срабатывает в поле ввода, с Ctrl/Cmd/Alt и при повторе удержания', () => {
    const h = mk()
    const input = document.createElement('input'); document.body.appendChild(input)
    h(key('g', {}, input)); h(key('d', {}, input))
    h(key('g', { ctrlKey: true })); h(key('d', { ctrlKey: true }))
    h(key('g', { metaKey: true })); h(key('d', { metaKey: true }))
    h(key('g', { repeat: true })); h(key('d'))
    expect(nav).not.toHaveBeenCalled()
  })
  it('не срабатывает при открытом окне', () => {
    const h = mk()
    const m = document.createElement('div'); m.className = 'modal-backdrop'; document.body.appendChild(m)
    h(key('g')); h(key('d'))
    expect(nav).not.toHaveBeenCalled()
  })
  it('выключенные в настройках не срабатывают; выбор запоминается', () => {
    expect(hotkeysEnabled()).toBe(true)
    setHotkeysEnabled(false)
    expect(localStorage.getItem('hotkeys_off')).toBe('1')
    const h = mk({ enabled: hotkeysEnabled })
    h(key('g')); h(key('d')); h(key('?'))
    expect(nav).not.toHaveBeenCalled()
    expect(hotkeysHelpOpen.value).toBe(false)
    setHotkeysEnabled(true)
    expect(localStorage.getItem('hotkeys_off')).toBeNull()
  })
  it('«?» открывает и закрывает шпаргалку, Esc закрывает', () => {
    const h = mk()
    h(key('?', { shiftKey: true }))
    expect(hotkeysHelpOpen.value).toBe(true)
    h(key('?', { shiftKey: true }))
    expect(hotkeysHelpOpen.value).toBe(false)
    h(key('?')); h(key('Escape'))
    expect(hotkeysHelpOpen.value).toBe(false)
  })
  it('при открытой шпаргалке переходы по «g» не работают', async () => {
    const h = mk()
    const w = mount(HotkeysModal, { attachTo: document.body })
    h(key('?'))
    await w.vm.$nextTick()
    h(key('g')); h(key('d'))
    expect(nav).not.toHaveBeenCalled()
    w.unmount()
  })
})

describe('HotkeysModal', () => {
  it('показывает все страницы и закрывается крестиком', async () => {
    hotkeysHelpOpen.value = true
    const w = mount(HotkeysModal)
    expect(w.findAll('[data-test="hotkeys-row"]')).toHaveLength(HOTKEY_PAGES.length)
    await w.find('[data-test="hotkeys-close"]').trigger('click')
    expect(hotkeysHelpOpen.value).toBe(false)
    expect(w.find('[data-test="hotkeys-modal"]').exists()).toBe(false)
  })
})
