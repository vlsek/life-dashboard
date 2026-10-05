import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// 🐞 BACKLOG раздел 35: «кнопка добавить цель не работает». Проходим весь путь: кнопка → форма → название → «Сохранить» → цель добавлена, форма закрыта.
// И пути, где «Сохранить» молчал: пустое название и ошибка записи в БД — пользователь должен видеть, что произошло.
const api = vi.hoisted(() => ({ addGoal: vi.fn() }))

vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'a@b.c' }),
    items: ref([]),
    error: ref(null),
    init: () => {},
    addGoal: api.addGoal,
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    toggleGoal: vi.fn(),
    stepGoal: vi.fn(),
    setStage: vi.fn(),
  }),
}))

import App from './App.vue'

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  api.addGoal.mockReset()
  api.addGoal.mockResolvedValue(undefined)
})

const addBtn = (w: ReturnType<typeof mount>) => w.find('[data-test="goal-add"]')
const saveBtn = (w: ReturnType<typeof mount>) => w.find('[data-test="goal-form-save"]')

describe('добавление цели', () => {
  it('кнопка «Добавить» открывает форму; «Сохранить» добавляет цель и закрывает форму', async () => {
    const w = mount(App, { attachTo: document.body })
    expect(w.find('.modal-backdrop').exists()).toBe(false)
    await addBtn(w).trigger('click')
    expect(w.find('.modal-backdrop').exists()).toBe(true)
    await w.find('input[type="text"]').setValue('Выучить 500 слов')
    await saveBtn(w).trigger('click')
    await flushPromises()
    expect(api.addGoal).toHaveBeenCalledTimes(1)
    const [userId, res] = api.addGoal.mock.calls[0]
    expect(userId).toBe('u1')
    expect(res).toMatchObject({ name: 'Выучить 500 слов', points: 5, stages: 1 })
    expect(w.find('.modal-backdrop').exists()).toBe(false)
    w.unmount()
  })

  it('пустое название: «Сохранить» не молчит — под полем подсказка, форма остаётся, цель не добавляется', async () => {
    const w = mount(App, { attachTo: document.body })
    await addBtn(w).trigger('click')
    await saveBtn(w).trigger('click')
    await flushPromises()
    expect(api.addGoal).not.toHaveBeenCalled()
    expect(w.find('.modal-backdrop').exists()).toBe(true)
    expect(w.find('[data-test="goal-form-error"]').text()).toContain('название')
    w.unmount()
  })

  it('ошибка записи (например, база недоступна): форма остаётся открытой и показывает понятный текст, без технических подробностей', async () => {
    api.addGoal.mockRejectedValue({ message: 'TypeError: Failed to fetch (https://abc123.supabase.co/rest/v1/goals)' })
    const w = mount(App, { attachTo: document.body })
    await addBtn(w).trigger('click')
    await w.find('input[type="text"]').setValue('Цель')
    await saveBtn(w).trigger('click')
    await flushPromises()
    expect(w.find('.modal-backdrop').exists()).toBe(true) // введённое не пропало
    const msg = w.find('[data-test="goal-form-error"]').text()
    expect(msg.length).toBeGreaterThan(5)
    expect(msg).not.toContain('supabase')
    expect(msg).not.toContain('https://')
    // и повторная попытка работает
    api.addGoal.mockResolvedValue(undefined)
    await saveBtn(w).trigger('click')
    await flushPromises()
    expect(api.addGoal).toHaveBeenCalledTimes(2)
    expect(w.find('.modal-backdrop').exists()).toBe(false)
    w.unmount()
  })

  it('пока идёт запись, повторное нажатие «Сохранить» не создаёт вторую цель', async () => {
    let release: () => void = () => {}
    api.addGoal.mockReturnValue(new Promise<void>((r) => (release = r)))
    const w = mount(App, { attachTo: document.body })
    await addBtn(w).trigger('click')
    await w.find('input[type="text"]').setValue('Цель')
    await saveBtn(w).trigger('click')
    await saveBtn(w).trigger('click')
    expect(api.addGoal).toHaveBeenCalledTimes(1)
    release()
    await flushPromises()
    w.unmount()
  })
})
