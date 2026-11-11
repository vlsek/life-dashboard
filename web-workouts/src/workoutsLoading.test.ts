import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 74.3/73.5 срез 6: «Пока нет упражнений» не мелькает, пока данные грузятся; ошибка загрузки — не сырой текст базы под подписью
// «Не удалось сохранить:», а понятный «Не удалось загрузить» с кнопкой «Повторить» (и подсказкой про «попробуй позже»).
const h = vi.hoisted(() => ({ gate: null as null | Promise<void>, release: null as null | (() => void), fail: false, exercises: [] as Record<string, unknown>[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          const wait = table === 'workout_exercises' && h.gate ? h.gate : Promise.resolve()
          return wait
            .then(() => (table === 'workout_exercises' && h.fail ? { data: null, error: { message: 'relation "workout_exercises" does not exist (SQLSTATE 42P01)' } } : { data: table === 'workout_exercises' ? h.exercises : [], error: null }))
            .then(res, rej)
        },
        insert: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }), match: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }), match: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import App from './App.vue'
import { t } from './lib/i18n'

const exercise = { id: 'e1', user_id: 'u1', name: 'Подтягивания', category: 'upper', tracks_weight: false, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-10-01', muscles: null }
const settle = async () => { for (let i = 0; i < 10; i++) await flushPromises() }

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  h.fail = false
  h.exercises = []
  h.gate = new Promise<void>((r) => (h.release = r))
})

describe('Тренировки: загрузка, пустота и ошибка', () => {
  it('пока упражнения грузятся — «Загрузка…», а не «Пока нет упражнений»; подсказки про пустые вкладки тоже не мелькают', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    expect(w.find('[data-testid="loading-exercises"]').text()).toBe('Загрузка…')
    expect(w.text()).not.toContain(t('workouts_empty'))
    expect(w.find('[data-testid="muscles-empty-hint"]').exists()).toBe(false)
    expect(w.find('[data-testid="progress-empty-hint"]').exists()).toBe(false)
    w.unmount()
  })

  it('упражнения пришли — «Загрузка…» ушла, карточки на месте', async () => {
    h.exercises = [exercise]
    const w = mount(App, { attachTo: document.body })
    await settle()
    h.release!()
    await settle()
    expect(w.find('[data-testid="loading-exercises"]').exists()).toBe(false)
    expect(w.text()).toContain('Подтягивания')
    expect(w.text()).not.toContain(t('workouts_empty'))
    w.unmount()
  })

  it('упражнений правда нет — пустота показывается только после ответа', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    h.release!()
    await settle()
    expect(w.find('[data-testid="loading-exercises"]').exists()).toBe(false)
    expect(w.text()).toContain(t('workouts_empty'))
    await w.find('[data-test="workouts-empty-add"]').trigger('click')
    await settle()
    expect(document.body.querySelector('.modal, [role="dialog"]')).not.toBeNull()
    w.unmount()
  })

  it('сбой загрузки: «Не удалось загрузить», без сырого текста базы и без «сохранить», «Повторить» возвращает данные', async () => {
    h.fail = true
    h.exercises = [exercise]
    const w = mount(App, { attachTo: document.body })
    await settle()
    h.release!()
    await settle()
    const box = w.find('[data-testid="load-error"]')
    expect(box.exists()).toBe(true)
    expect(box.attributes('role')).toBe('alert')
    expect(box.text()).toContain('Не удалось загрузить')
    expect(box.text()).toContain(t('workouts_migration_hint'))
    expect(box.text()).not.toContain('SQLSTATE')
    expect(box.text()).not.toContain('relation')
    expect(w.find('[data-testid="loading-exercises"]').exists()).toBe(false)
    expect(w.text()).not.toContain(t('workouts_empty'))
    h.fail = false
    h.gate = null
    await w.find('[data-testid="load-retry"]').trigger('click')
    await settle()
    expect(w.find('[data-testid="load-error"]').exists()).toBe(false)
    expect(w.text()).toContain('Подтягивания')
    w.unmount()
  })
})
