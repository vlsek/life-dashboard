import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 74.3 (срез 5): ошибка ЗАГРУЗКИ «Кастомизации» раньше называлась «Не удалось сохранить выбор» и прятала всю страницу без повтора.
// Теперь — «Не удалось загрузить» + «Повторить»; повтор перезагружает данные и возвращает страницу.
const h = vi.hoisted(() => ({ fail: true }))
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
      // сбой сети на одной из загрузок: запрос выбрасывает, а не возвращает {error}
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        (h.fail && table === 'user_achievements' ? Promise.reject(new TypeError('Failed to fetch https://xyz.supabase.co/rest/v1/user_achievements')) : Promise.resolve({ data: [], error: null })).then(res, rej),
    }
    return c
  }
  return {
    sb: {
      auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
      from: chain,
      rpc: (name: string) => Promise.resolve(name === 'buy_customization' || name === 'claim_achievement_items' ? { data: null, error: { code: 'PGRST202', message: 'no fn' } } : { data: [{ user_id: 'u1', total_points: 250 }], error: null }),
    },
    logout: vi.fn(),
  }
})
import App from './App.vue'
import { t } from './lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('cust_tab', 'all')
  location.hash = '#slot=all'
  h.fail = true
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('Кастомизация: ошибка загрузки', () => {
  it('понятный текст «загрузить» (не «сохранить выбор»), без адреса Supabase, с кнопкой «Повторить»; содержимое страницы не показывается', async () => {
    const w = mount(App)
    for (let i = 0; i < 10; i++) await flushPromises()
    const box = w.find('[data-testid="load-error"]')
    expect(box.exists()).toBe(true)
    expect(box.attributes('role')).toBe('alert')
    expect(box.text()).toContain('Не удалось загрузить')
    expect(box.text()).not.toContain(t('cust_select_error').trim())
    expect(box.text()).not.toContain('supabase')
    expect(w.find('[data-testid="balance"]').exists()).toBe(false)
    w.unmount()
  })

  it('«Повторить» после восстановления сети — страница возвращается, ошибки нет', async () => {
    const w = mount(App)
    for (let i = 0; i < 10; i++) await flushPromises()
    h.fail = false
    await w.find('[data-testid="load-retry"]').trigger('click')
    for (let i = 0; i < 10; i++) await flushPromises()
    expect(w.find('[data-testid="load-error"]').exists()).toBe(false)
    expect(w.find('[data-testid="balance"]').exists()).toBe(true)
    w.unmount()
  })

  it('повтор снова не удался — ошибка и кнопка остаются, кнопка доступна', async () => {
    const w = mount(App)
    for (let i = 0; i < 10; i++) await flushPromises()
    await w.find('[data-testid="load-retry"]').trigger('click')
    for (let i = 0; i < 10; i++) await flushPromises()
    expect(w.find('[data-testid="load-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="load-retry"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })
})
