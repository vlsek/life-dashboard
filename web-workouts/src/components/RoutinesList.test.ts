import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 69.17, срез 3: рутины — горизонтальная карусель карточек (макет v2); логика старта, копирования и удаления прежняя
const dlg = vi.hoisted(() => ({ answer: true, asked: [] as string[] }))
vi.mock('../lib/confirmDialog', () => ({ confirmDialog: (msg: string) => { dlg.asked.push(msg); return Promise.resolve(dlg.answer) } }))
import RoutinesList from './RoutinesList.vue'
import { useRoutines } from '../lib/useRoutines'
import type { Exercise } from '../lib/types'

const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: 'кг', suggested_scheme: null, created_at: '2026-01-01' })
const exercises = [ex('e1', 'Жим лёжа'), ex('e2', 'Тяга штанги'), ex('e3', 'Приседания'), ex('e4', 'Подтягивания')]
const routine = (id: string, name: string, ids: string[]) => ({ id, name, updated_at: '2026-01-01T00:00:00Z', items: ids.map((exercise_id) => ({ exercise_id, target_sets: 3, superset_group: null })) })
const mk = (disabled = false) => mount(RoutinesList, { props: { exercises, disabled } })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  dlg.answer = true
  dlg.asked = []
  useRoutines().routines.value = []
})

describe('RoutinesList: карусель (69.17, срез 3)', () => {
  it('нет рутин — блока нет', () => {
    expect(mk().find('[data-testid="routines"]').exists()).toBe(false)
  })
  it('каждая рутина — карточка в горизонтальной прокрутке; видны название, число упражнений и состав (до трёх)', () => {
    useRoutines().routines.value = [routine('r1', 'Верх A', ['e1', 'e2', 'e3', 'e4']), routine('r2', 'Ноги', ['e3'])]
    const w = mk()
    const strip = w.get('[data-testid="routines-carousel"]')
    expect(strip.classes()).toContain('overflow-x-auto')
    expect(strip.classes()).toContain('snap-x')
    const c1 = w.get('[data-testid="routine-r1"]')
    expect(c1.text()).toContain('Верх A')
    expect(c1.text()).toContain('4')
    const brief = c1.get('[data-testid="routine-brief"]').text()
    expect(brief).toBe('Жим лёжа · Тяга штанги · Приседания')
    expect(brief).not.toContain('Подтягивания')
    expect(w.findAll('[data-testid^="routine-start-"]')).toHaveLength(2)
  })
  it('«Начать» — главная акцентная кнопка карточки и отдаёт именно эту рутину; при активной тренировке выключена', async () => {
    useRoutines().routines.value = [routine('r1', 'Верх A', ['e1']), routine('r2', 'Ноги', ['e3'])]
    const w = mk()
    const start = w.get('[data-testid="routine-start-r2"]')
    expect(start.attributes('style')).toContain('var(--accent)')
    await start.trigger('click')
    expect((w.emitted('start')![0][0] as { id: string }).id).toBe('r2')
    const off = mk(true)
    expect(off.get('[data-testid="routine-start-r1"]').attributes('disabled')).toBeDefined()
  })
  it('копирование добавляет карточку «… (копия)»', async () => {
    useRoutines().routines.value = [routine('r1', 'Верх A', ['e1'])]
    const w = mk()
    await w.get('[data-testid="routine-dup-r1"]').trigger('click')
    expect(w.findAll('[data-testid^="routine-start-"]')).toHaveLength(2)
    expect(w.get('[data-testid="routines"]').text()).toMatch(/Верх A \((копия|copy)\)/)
  })
  it('удаление спрашивает подтверждение: «нет» — рутина остаётся, «да» — исчезает', async () => {
    useRoutines().routines.value = [routine('r1', 'Верх A', ['e1'])]
    const w = mk()
    dlg.answer = false
    await w.get('[data-testid="routine-del-r1"]').trigger('click')
    await flushPromises()
    expect(dlg.asked).toHaveLength(1)
    expect(dlg.asked[0]).toContain('Верх A')
    expect(w.find('[data-testid="routine-r1"]').exists()).toBe(true)
    dlg.answer = true
    await w.get('[data-testid="routine-del-r1"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="routine-r1"]').exists()).toBe(false)
  })
})

describe('RoutinesList: папки и архив (69.7)', () => {
  it('папка: форма → группа с заголовком; рутина без папки остаётся без заголовка', async () => {
    useRoutines().routines.value = [routine('r1', 'Верх', ['e1']), routine('r2', 'Ноги', ['e3'])]
    const w = mk()
    await w.find('[data-testid="routine-folder-r1"]').trigger('click')
    await w.find('[data-testid="routine-folder-input-r1"]').setValue('Сплит')
    await w.find('[data-testid="routine-folder-input-r1"]').trigger('submit')
    await flushPromises()
    expect(useRoutines().routines.value.find((r) => r.id === 'r1')?.folder).toBe('Сплит')
    expect(w.find('[data-testid="routine-group-Сплит"]').text()).toContain('Верх')
    expect(w.find('[data-testid="routine-group-none"]').text()).toContain('Ноги')
  })
  it('в архив: карточка исчезает, попадает в «Архив», «Вернуть» возвращает', async () => {
    useRoutines().routines.value = [routine('r1', 'Верх', ['e1']), routine('r2', 'Ноги', ['e3'])]
    const w = mk()
    await w.find('[data-testid="routine-archive-r1"]').trigger('click')
    expect(w.find('[data-testid="routine-r1"]').exists()).toBe(false)
    expect(w.find('[data-testid="routine-r2"]').exists()).toBe(true)
    await w.find('[data-testid="routines-archive-toggle"]').trigger('click')
    expect(w.find('[data-testid="routine-archived-r1"]').exists()).toBe(true)
    await w.find('[data-testid="routine-restore-r1"]').trigger('click')
    expect(w.find('[data-testid="routine-r1"]').exists()).toBe(true)
    expect(w.find('[data-testid="routines-archive"]').exists()).toBe(false)
  })
})

describe('RoutinesList: меню «⋯» (69.17, срез 7)', () => {
  const shown = (w: ReturnType<typeof mk>, id: string) => (w.get(`[data-testid="routine-menu-items-${id}"]`).element as HTMLElement).style.display !== 'none'
  const one = () => {
    useRoutines().routines.value = [routine('r1', 'Верх A', ['e1']), routine('r2', 'Ноги', ['e3'])]
    return mk()
  }
  it('по умолчанию меню закрыто: рядом с «Начать» только «⋯»; кнопка меню отражает состояние', async () => {
    const w = one()
    expect(shown(w, 'r1')).toBe(false)
    const btn = w.get('[data-testid="routine-menu-r1"]')
    expect(btn.attributes('aria-expanded')).toBe('false')
    await btn.trigger('click')
    expect(shown(w, 'r1')).toBe(true)
    expect(shown(w, 'r2')).toBe(false) // у другой карточки меню не открылось
    expect(w.get('[data-testid="routine-menu-r1"]').attributes('aria-expanded')).toBe('true')
    await btn.trigger('click')
    expect(shown(w, 'r1')).toBe(false)
  })
  it('в меню четыре действия, они не стоят в одном ряду с «Начать»', async () => {
    const w = one()
    const menu = w.get('[data-testid="routine-menu-items-r1"]')
    for (const k of ['dup', 'folder', 'archive', 'del']) expect(menu.find(`[data-testid="routine-${k}-r1"]`).exists()).toBe(true)
    const startRow = w.get('[data-testid="routine-start-r1"]').element.parentElement as HTMLElement
    for (const k of ['dup', 'folder', 'archive', 'del']) expect(startRow.querySelector(`[data-testid="routine-${k}-r1"]`)).toBeNull()
    expect(startRow.querySelector('[data-testid="routine-menu-r1"]')).not.toBeNull()
  })
  it('Esc закрывает меню; действие (копирование) закрывает меню', async () => {
    const w = one()
    await w.get('[data-testid="routine-menu-r1"]').trigger('click')
    await w.get('[data-testid="routine-r1"]').trigger('keydown', { key: 'Escape' })
    expect(shown(w, 'r1')).toBe(false)
    await w.get('[data-testid="routine-menu-r1"]').trigger('click')
    await w.get('[data-testid="routine-dup-r1"]').trigger('click')
    expect(shown(w, 'r1')).toBe(false)
    expect(w.findAll('[data-testid^="routine-start-"]')).toHaveLength(3)
  })
  it('удаление из меню закрывает меню и по-прежнему спрашивает подтверждение', async () => {
    const w = one()
    dlg.answer = false
    await w.get('[data-testid="routine-menu-r1"]').trigger('click')
    await w.get('[data-testid="routine-del-r1"]').trigger('click')
    await flushPromises()
    expect(dlg.asked).toHaveLength(1)
    expect(shown(w, 'r1')).toBe(false)
    expect(w.find('[data-testid="routine-r1"]').exists()).toBe(true)
  })
})
