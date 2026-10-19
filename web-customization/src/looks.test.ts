import { beforeEach, describe, expect, it } from 'vitest'
import { CATEGORY_ORDER } from './lib/customization'
import { MAX_LEN, MAX_LOOKS, NAME_MAX, PREF_KEYS, captureLook, deleteLook, freeLookId, loadLooks, lookKey, parseLook, planApply, renameLook, saveLook, serializeLook, type Look, type LookStore } from './lib/looks'

// BACKLOG 64.1, срез 5: «Образы» — сохранённое сочетание оформления. Логика без интерфейса.
const mem = (): LookStore & { data: Record<string, string> } => {
  const data: Record<string, string> = {}
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] }
}
const cat0 = CATEGORY_ORDER[0]
const cat1 = CATEGORY_ORDER[1]
const sample = (id = 'l1'): Look => ({ id, name: 'Осень', theme: 'mocha', selected: { [cat0]: 'item_a', [cat1]: 'item_b' }, prefs: { splash_variant: 'orbit', chart_line: 'smooth' } })

describe('снимок образа', () => {
  it('берёт тему, выбор каталога и ключи пикеров; пустое и не-строки отбрасывает', () => {
    const ls: Record<string, string | null> = { splash_variant: 'orbit', chart_marker: '', streak_flame_variant: null }
    const l = captureLook('l2', '  Мой   образ  ', { theme: 'nord', selected: { [cat0]: 'x', [cat1]: null } }, (k) => ls[k] ?? null)
    expect(l).toEqual({ id: 'l2', name: 'Мой образ', theme: 'nord', selected: { [cat0]: 'x' }, prefs: { splash_variant: 'orbit' } })
  })
  it('пустое имя → имя ячейки; длинное имя обрезается', () => {
    expect(captureLook('l3', '   ', { theme: null, selected: {} }, () => null).name).toBe('l3')
    expect(captureLook('l1', 'я'.repeat(80), { theme: null, selected: {} }, () => null).name).toHaveLength(NAME_MAX)
  })
  it('в образ входят все ключи пикеров с выбором пользователя', () => {
    for (const k of ['splash_variant', 'streak_flame_variant', 'water_saved_anim', 'chart_marker', 'chart_line', 'workouts_body_model']) expect(PREF_KEYS, k).toContain(k)
    expect(new Set(PREF_KEYS).size).toBe(PREF_KEYS.length)
  })
})

describe('хранение', () => {
  it('сохранить → загрузить: тот же образ; ключ cust_look_<id>', () => {
    const st = mem()
    expect(saveLook(st, sample('l2'))).toBe(true)
    expect(Object.keys(st.data)).toEqual(['cust_look_l2'])
    expect(loadLooks(st)).toEqual([sample('l2')])
  })
  it('мусор, чужие ключи и неверные типы не ломают загрузку', () => {
    const st = mem()
    st.data[lookKey('l1')] = '{'
    st.data[lookKey('l2')] = JSON.stringify({ n: 'Ок', t: 5, s: { [cat0]: 'a', zzz: 'b', [cat1]: 7 }, p: { splash_variant: 'x', evil: 'y', chart_line: 1 } })
    st.data[lookKey('l3')] = JSON.stringify({ n: '   ' })
    st.data[lookKey('l4')] = '[1]'
    st.data['cust_look_l9'] = JSON.stringify({ n: 'за пределами' })
    expect(loadLooks(st)).toEqual([{ id: 'l2', name: 'Ок', theme: null, selected: { [cat0]: 'a' }, prefs: { splash_variant: 'x' } }])
    expect(parseLook('l9', JSON.stringify({ n: 'x' }))).toBeNull()
  })
  it('пять ячеек: первая свободная, затем null; удаление освобождает', () => {
    const st = mem()
    for (let i = 1; i <= MAX_LOOKS; i++) {
      expect(freeLookId(loadLooks(st))).toBe('l' + i)
      saveLook(st, sample('l' + i))
    }
    expect(freeLookId(loadLooks(st))).toBeNull()
    deleteLook(st, 'l3')
    expect(freeLookId(loadLooks(st))).toBe('l3')
  })
  it('образ длиннее лимита синхронизации не сохраняется', () => {
    const big: Look = { ...sample(), selected: { [cat0]: 'я'.repeat(MAX_LEN) } }
    expect(serializeLook(big)).toBeNull()
    const st = mem()
    expect(saveLook(st, big)).toBe(false)
    expect(Object.keys(st.data)).toEqual([])
  })
  it('переименование: сохраняет всё остальное; пустое имя и неизвестный образ — отказ', () => {
    const st = mem()
    saveLook(st, sample('l1'))
    expect(renameLook(st, 'l1', '  Зима ')).toBe(true)
    expect(loadLooks(st)[0]).toEqual({ ...sample('l1'), name: 'Зима' })
    expect(renameLook(st, 'l1', '   ')).toBe(false)
    expect(renameLook(st, 'l2', 'x')).toBe(false)
  })
})

describe('план применения', () => {
  const all = () => true
  it('доступное применяется, недоступное пропускается и считается; чего нет в образе — снимается/сбрасывается', () => {
    const p = planApply(sample(), (c, k) => !(c === cat1 && k === 'item_b'), (t) => t === 'mocha')
    expect(p.theme).toBe('mocha')
    expect(p.selected[cat0]).toBe('item_a')
    expect(p.selected[cat1]).toBeNull()
    expect(p.skipped).toBe(1)
    expect(p.prefsSet).toEqual({ splash_variant: 'orbit', chart_line: 'smooth' })
    expect(p.prefsRemove).toContain('streak_flame_variant')
    expect(p.prefsRemove).not.toContain('splash_variant')
    for (const c of CATEGORY_ORDER) expect(c in p.selected, c).toBe(true)
  })
  it('закрытая тема пропускается (тема не меняется), и это тоже считается', () => {
    const p = planApply(sample(), all, () => false)
    expect(p.theme).toBeNull()
    expect(p.skipped).toBe(1)
  })
  it('образ без темы и без предметов снимает выбор целиком', () => {
    const p = planApply({ id: 'l1', name: 'Пусто', theme: null, selected: {}, prefs: {} }, all, all)
    expect(p.theme).toBeNull()
    expect(Object.values(p.selected).every((v) => v === null)).toBe(true)
    expect(p.prefsRemove).toEqual([...PREF_KEYS])
    expect(p.skipped).toBe(0)
  })
})

beforeEach(() => localStorage.clear())
