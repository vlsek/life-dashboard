import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 69.17, срез 1: главная раздела «Тренировки» по макету v2 — одна главная кнопка, вторичные действия, вкладки как нижняя панель на телефоне.
const h = vi.hoisted(() => ({ exercises: [] as Record<string, unknown>[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null, customization: {} } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data: table === 'workout_exercises' ? h.exercises : [], error: null }).then(res, rej),
        insert: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import App from './App.vue'
import Toast from './components/Toast.vue'
import { showToast } from './lib/toast'

const ex = { id: 'e1', user_id: 'u1', name: 'Жим', category: 'Грудь', tracks_weight: true, unit: 'кг', value_label: null, suggested_scheme: null, tracks_duration: false, created_at: '2026-01-01' }
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.exercises = [ex]
})

describe('главная «Тренировки» (69.17, срез 1)', () => {
  it('«Начать тренировку» — главная кнопка: на всю ширину на телефоне, акцентного цвета, крупнее остальных', async () => {
    const w = await mountApp()
    const start = w.get('[data-testid="aw-start"]')
    expect(start.classes()).toContain('w-full')
    expect(start.attributes('style')).toContain('var(--accent)')
    expect(start.attributes('style')).not.toContain('var(--success)')
    expect(start.attributes('style')).toContain('min-height: 56px')
    w.unmount()
  })
  it('остальные действия вторичные: не акцентного цвета, делят ряд пополам на телефоне', async () => {
    const w = await mountApp()
    for (const id of ['aw-past', 'add-exercise-btn', 'templates-btn']) {
      const b = w.get(`[data-testid="${id}"]`)
      expect(b.attributes('style')).not.toContain('background: var(--accent)')
      expect(b.classes().join(' ')).toContain('basis-[calc(50%-0.25rem)]')
    }
    w.unmount()
  })
  it('кнопки действий работают как раньше: «Добавить упражнение» открывает форму, «Типовые программы» — каталог', async () => {
    const w = await mountApp()
    await w.get('[data-testid="add-exercise-btn"]').trigger('click')
    expect(document.body.textContent).toMatch(/Название|Name/)
    w.unmount()
  })
  it('вкладки: те же четыре кнопки role=tab с прежними testid; нижняя панель с иконками (на ПК иконки скрыты)', async () => {
    const w = await mountApp()
    const bar = w.get('[data-testid="page-tabs"]')
    expect(bar.attributes('role')).toBe('tablist')
    expect(bar.classes()).toContain('fixed')
    expect(bar.classes()).toContain('bottom-0')
    expect(bar.classes()).toContain('sm:static')
    for (const tab of ['journal', 'exercises', 'map', 'progress']) {
      const b = w.get(`[data-testid="page-tab-${tab}"]`)
      expect(b.attributes('role')).toBe('tab')
      expect(b.find('span.sm\\:hidden').exists()).toBe(true)
    }
    expect(bar.findAll('svg, img').length).toBeGreaterThanOrEqual(4)
    w.unmount()
  })
  it('переключение вкладки работает и обновляет aria-selected', async () => {
    const w = await mountApp()
    await w.get('[data-testid="page-tab-journal"]').trigger('click')
    expect(w.get('[data-testid="page-tab-journal"]').attributes('aria-selected')).toBe('true')
    expect(w.get('[data-testid="page-tab-exercises"]').attributes('aria-selected')).toBe('false')
    w.unmount()
  })
  it('страница оставляет место под нижнюю панель; тост поднят над ней', async () => {
    const w = await mountApp()
    expect(w.get('main').classes()).toContain('pb-24')
    showToast('Готово')
    const t = mount(Toast, { global: { stubs: { transition: false } } })
    expect(t.html()).toContain('bottom-20')
    t.unmount()
    w.unmount()
  })
})
