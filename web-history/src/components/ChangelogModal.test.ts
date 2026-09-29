import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const originalFetch = globalThis.fetch

// lib/version.ts кэширует ответ в переменной модуля (чтобы ChangelogModal не дёргал fetch
// повторно при каждом открытии) — между тестами модуль нужно перезагружать, иначе кэш одного
// теста протекает в следующий.
describe('ChangelogModal', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('запрашивает /version.json и показывает записи выбранного языка', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          version: '1.09',
          en: [{ version: '1.09', date: '2026-09-29', changes: ['English change'] }],
          ru: [{ version: '1.09', date: '2026-09-29', changes: ['Русское изменение'] }],
        }),
      ),
    ) as unknown as typeof fetch
    const { setLang } = await import('../lib/i18n')
    const { default: ChangelogModal } = await import('./ChangelogModal.vue')
    setLang('ru')
    const w = mount(ChangelogModal)
    await flushPromises()
    expect(fetch).toHaveBeenCalledWith('/version.json')
    expect(w.text()).toContain('v1.09')
    expect(w.text()).toContain('Русское изменение')
    expect(w.text()).not.toContain('English change')
  })

  it('переключение языка меняет показанные записи (без повторного fetch — кэш из lib/version.ts)', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ version: '1.09', en: [{ version: '1.09', date: '', changes: ['EN'] }], ru: [{ version: '1.09', date: '', changes: ['RU'] }] })),
    ) as unknown as typeof fetch
    const { setLang } = await import('../lib/i18n')
    const { default: ChangelogModal } = await import('./ChangelogModal.vue')
    setLang('en')
    const w = mount(ChangelogModal)
    await flushPromises()
    expect(w.text()).toContain('EN')
    setLang('ru')
    const w2 = mount(ChangelogModal)
    await flushPromises()
    expect(w2.text()).toContain('RU')
    expect(fetch).toHaveBeenCalledTimes(1) // второй монтаж взял данные из кэша loadVersionInfo()
  })

  it('пустая история — подсказка вместо списка', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '0.01', en: [], ru: [] }))) as unknown as typeof fetch
    const { default: ChangelogModal } = await import('./ChangelogModal.vue')
    const w = mount(ChangelogModal)
    await flushPromises()
    expect(w.find('.dim').exists()).toBe(true)
  })

  it('ошибка сети — подсказка вместо падения', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    const { default: ChangelogModal } = await import('./ChangelogModal.vue')
    const w = mount(ChangelogModal)
    await flushPromises()
    expect(w.find('.dim').exists()).toBe(true)
  })

  it('клик по фону и по кнопке закрытия эмитят close', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1', en: [], ru: [] }))) as unknown as typeof fetch
    const { default: ChangelogModal } = await import('./ChangelogModal.vue')
    const w = mount(ChangelogModal, { attachTo: document.body })
    await flushPromises()
    await w.find('.modal-backdrop').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
    await w.find('.modal-actions button').trigger('click')
    expect(w.emitted('close')).toHaveLength(2)
    w.unmount()
  })
})
