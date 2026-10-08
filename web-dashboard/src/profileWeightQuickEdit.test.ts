import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// BACKLOG 46.1 (апд45): вес меняется прямо из блока «Профиль» — карандаш, ввод за сегодня, Enter/Esc, без дублей за день.
const h = vi.hoisted(() => ({
  saveBodyValue: vi.fn(),
  params: [] as any[],
  stats: [] as any[],
}))
vi.mock('./lib/useProfile', () => ({
  useProfile: () => ({
    profile: ref({ avatar_url: null, birthdate: null, goal_type: null }),
    params: ref(h.params),
    stats: computed(() => h.stats),
    balance: ref(1),
    loaded: ref(true),
    error: ref(null),
    init: vi.fn(),
    uploadAvatar: vi.fn(),
    saveBirthdate: vi.fn(),
    addParam: vi.fn(),
    updateParam: vi.fn(),
    deleteParam: vi.fn(),
    saveBodyValue: h.saveBodyValue,
    refreshValues: vi.fn(),
  }),
}))
vi.mock('./lib/usePointsLog', () => ({ usePointsLog: () => ({ log: ref(null), error: ref(null), loading: ref(false), load: vi.fn() }) }))

import ProfileSection from './components/ProfileSection.vue'
import ParamQuickEdit from './components/ParamQuickEdit.vue'
import { parseBodyValue, bodyValueInput } from './lib/quickBodyValue'
import { ICON_PATHS } from './lib/icons'
import { todayStr } from './lib/date'
import source from './components/ProfileSection.vue?raw'

const weight = { id: 'p-weight', name: 'Вес', icon: 'scale', unit: 'кг', position: 0 }
const height = { id: 'p-height', name: 'Рост', icon: 'ruler', unit: 'см', position: 1 }
const stat = (param: any, latest: number) => ({ param, latest, sinceFirst: -1.5, sincePrev: -0.2, tone: 'neutral' })

const mk = () => mount(ProfileSection, { props: { userId: 'u1' }, attachTo: document.body })
const input = (w: ReturnType<typeof mk>) => w.find('[data-test="param-quick-input"]')

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.saveBodyValue.mockReset()
  h.params = [weight, height]
  h.stats = [stat(weight, 72.5), stat(height, 180)]
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('parseBodyValue / bodyValueInput', () => {
  it('запятая и точка, пробелы, округление до сотых', () => {
    expect(parseBodyValue('72,5')).toBe(72.5)
    expect(parseBodyValue('72.5')).toBe(72.5)
    expect(parseBodyValue('  7 2,5 ')).toBe(72.5) // пробелы внутри числа убираются
    expect(parseBodyValue('1 072,5')).toBeNull() // больше границы 1000 — не вес
    expect(parseBodyValue('72,456')).toBe(72.46)
    expect(parseBodyValue('70')).toBe(70)
  })
  it('мусор, ноль, минус, пусто, слишком большое — null', () => {
    for (const bad of ['', ' ', 'abc', '0', '0,00', '-5', '7,2,1', '72кг', '1e3', '1000,01', '5000', 'NaN', '∞']) expect(parseBodyValue(bad), bad).toBeNull()
    expect(parseBodyValue('1000')).toBe(1000)
  })
  it('значение для поля: целое без «.0», дробное с запятой; пустое — пустая строка', () => {
    expect(bodyValueInput(72.5)).toBe('72,5')
    expect(bodyValueInput(70)).toBe('70')
    expect(bodyValueInput(null)).toBe('')
    expect(bodyValueInput(undefined)).toBe('')
    expect(parseBodyValue(bodyValueInput(72.55))).toBe(72.55) // круг: вывод → разбор без потерь
  })
})

describe('ProfileSection: быстрая правка веса', () => {
  it('карандаш только у веса, у остальных параметров его нет; иконка существует', () => {
    const w = mk()
    const rows = w.findAll('[data-test="param-stat"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].find('[data-test="weight-edit-btn"]').exists()).toBe(true)
    expect(rows[1].find('[data-test="weight-edit-btn"]').exists()).toBe(false)
    expect(ICON_PATHS).toHaveProperty('edit') // имя иконки на кнопке реально есть, а не пустая кнопка
    expect(rows[0].find('[data-test="weight-edit-btn"] svg').exists()).toBe(true)
    w.unmount()
  })

  it('открывает поле с текущим весом; Esc отменяет без записи и возвращает число', async () => {
    const w = mk()
    await w.find('[data-test="weight-edit-btn"]').trigger('click')
    await flushPromises()
    expect((input(w).element as HTMLInputElement).value).toBe('72,5')
    expect(document.activeElement).toBe(input(w).element)
    await input(w).setValue('99')
    await input(w).trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-test="param-quick-edit"]').exists()).toBe(false)
    expect(h.saveBodyValue).not.toHaveBeenCalled()
    expect(w.text()).toContain('Вес: 72.5')
    w.unmount()
  })

  it('Enter сохраняет за СЕГОДНЯ тем же saveBodyValue; поле закрывается и показывается «сохранено»', async () => {
    h.saveBodyValue.mockResolvedValue(null)
    const w = mk()
    await w.find('[data-test="weight-edit-btn"]').trigger('click')
    await input(w).setValue('71,8')
    await input(w).trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(h.saveBodyValue).toHaveBeenCalledTimes(1)
    expect(h.saveBodyValue).toHaveBeenCalledWith('p-weight', todayStr(), 71.8)
    expect(w.find('[data-test="param-quick-edit"]').exists()).toBe(false)
    expect(w.find('[data-test="saved-tick"]').exists()).toBe(true)
    w.unmount()
  })

  it('кнопка ✓ делает то же, ✕ — отмена; точка вместо запятой принимается', async () => {
    h.saveBodyValue.mockResolvedValue(null)
    const w = mk()
    await w.find('[data-test="weight-edit-btn"]').trigger('click')
    await w.find('[data-test="param-quick-cancel"]').trigger('click')
    expect(w.find('[data-test="param-quick-edit"]').exists()).toBe(false)
    await w.find('[data-test="weight-edit-btn"]').trigger('click')
    await input(w).setValue('70.25')
    await w.find('[data-test="param-quick-save"]').trigger('click')
    await flushPromises()
    expect(h.saveBodyValue).toHaveBeenCalledWith('p-weight', todayStr(), 70.25)
    w.unmount()
  })

  it('неверный ввод не пишет в базу, остаётся в поле с подсказкой; правка снимает подсказку', async () => {
    const w = mk()
    await w.find('[data-test="weight-edit-btn"]').trigger('click')
    for (const bad of ['', 'abc', '0', '-3', '12kg']) {
      await input(w).setValue(bad)
      await input(w).trigger('keydown', { key: 'Enter' })
      expect(w.find('[data-test="param-quick-invalid"]').exists(), bad).toBe(true)
    }
    expect(h.saveBodyValue).not.toHaveBeenCalled()
    expect(w.find('[data-test="param-quick-edit"]').exists()).toBe(true)
    await input(w).setValue('7')
    expect(w.find('[data-test="param-quick-invalid"]').exists()).toBe(false)
    w.unmount()
  })

  it('ошибка записи: поле остаётся открытым, видна понятная фраза, «сохранено» нет', async () => {
    h.saveBodyValue.mockResolvedValue('Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
    const w = mk()
    await w.find('[data-test="weight-edit-btn"]').trigger('click')
    await input(w).setValue('71')
    await input(w).trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.find('[data-test="param-quick-error"]').text()).toContain('Нет связи')
    expect(w.find('[data-test="param-quick-edit"]').exists()).toBe(true)
    expect(w.find('[data-test="saved-tick"]').exists()).toBe(false)
    w.unmount()
  })

  it('повторный Enter, пока идёт запись, второй записи не создаёт', async () => {
    let done: (v: null) => void = () => {}
    h.saveBodyValue.mockReturnValue(new Promise<null>((r) => (done = r)))
    const w = mk()
    await w.find('[data-test="weight-edit-btn"]').trigger('click')
    await input(w).setValue('71')
    await input(w).trigger('keydown', { key: 'Enter' })
    await input(w).trigger('keydown', { key: 'Enter' })
    await w.find('[data-test="param-quick-save"]').trigger('click')
    expect(h.saveBodyValue).toHaveBeenCalledTimes(1)
    done(null)
    await flushPromises()
    w.unmount()
  })

  it('параметр «вес» заведён, но значений нет: можно внести первое прямо здесь', async () => {
    h.stats = [stat(height, 180)]
    h.saveBodyValue.mockResolvedValue(null)
    const w = mk()
    expect(w.find('[data-test="weight-empty"]').exists()).toBe(true)
    await w.find('[data-test="weight-empty"] [data-test="weight-edit-btn"]').trigger('click')
    expect((input(w).element as HTMLInputElement).value).toBe('')
    await input(w).setValue('68')
    await input(w).trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(h.saveBodyValue).toHaveBeenCalledWith('p-weight', todayStr(), 68)
    w.unmount()
  })

  it('параметра «вес» нет вообще — ни карандаша, ни пустой строки', () => {
    h.params = [height]
    h.stats = [stat(height, 180)]
    const w = mk()
    expect(w.find('[data-test="weight-edit-btn"]').exists()).toBe(false)
    expect(w.find('[data-test="weight-empty"]').exists()).toBe(false)
    w.unmount()
  })

  it('окно «Параметры тела» (линейка) работает как раньше', () => {
    const w = mk()
    expect(w.find('[data-test="params-btn"]').exists()).toBe(true)
    w.unmount()
  })

  it('проводка: запись только через saveBodyValue за todayStr(), без прямых обращений к БД', () => {
    expect(source).toMatch(/saveBodyValue\(p\.id, todayStr\(\), value\)/)
    expect(source).not.toMatch(/sb\.from\(/)
  })
})

describe('<ParamQuickEdit>', () => {
  it('единица показывается рядом с полем; нет единицы — нет подписи', () => {
    expect(mount(ParamQuickEdit, { props: { initial: 5, unit: 'кг' } }).text()).toContain('кг')
    expect(mount(ParamQuickEdit, { props: { initial: 5, unit: null } }).text()).not.toContain('кг')
  })
  it('во время записи кнопка ✓ заблокирована', () => {
    const w = mount(ParamQuickEdit, { props: { initial: 5, saving: true } })
    expect(w.find('[data-test="param-quick-save"]').attributes('disabled')).toBeDefined()
  })
})
