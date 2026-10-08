import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExerciseForm from './components/ExerciseForm.vue'
import { VARIANT_BASES, TYPICAL_DEFAULTS, baseName, typicalDefaults, variantFlags } from './lib/exerciseVariants'
import { ruleForExercise } from './lib/muscles'
import type { Exercise } from './lib/types'

// BACKLOG 1046: при выборе типового упражнения остальные поля формы заполняются автоматически (только в новом, только не тронутые руками).
const base = (id: string) => VARIANT_BASES.find((b) => b.id === id)!
const idx = (id: string, ru: string) => base(id).variants.findIndex((v) => v.ru === ru)

describe('значения по умолчанию типовых упражнений (страж)', () => {
  it('у каждого типового упражнения каталога есть значения, и нет значений для несуществующих', () => {
    expect(VARIANT_BASES.filter((b) => !TYPICAL_DEFAULTS[b.id]).map((b) => b.id)).toEqual([])
    expect(Object.keys(TYPICAL_DEFAULTS).filter((k) => !VARIANT_BASES.some((b) => b.id === k))).toEqual([])
  })
  it('значения допустимы: категория из трёх, «что считаем» — повторения или секунды', () => {
    for (const [id, d] of Object.entries(TYPICAL_DEFAULTS)) {
      expect(['upper', 'lower', 'fullbody'], id).toContain(d.category)
      expect(['reps', 'seconds'], id).toContain(d.label)
    }
  })
  it('разумные значения: планка — секунды без веса; штанга и гантели — с весом; отжимания и подтягивания — на своём весе', () => {
    expect(TYPICAL_DEFAULTS.plank).toMatchObject({ label: 'seconds', tracksWeight: false })
    for (const id of ['bench', 'deadlift', 'squat', 'lunge', 'biceps_curl']) expect(TYPICAL_DEFAULTS[id].tracksWeight, id).toBe(true)
    for (const id of ['pushup', 'pullup', 'dips', 'crunch']) expect(TYPICAL_DEFAULTS[id].tracksWeight, id).toBe(false)
    expect(TYPICAL_DEFAULTS.squat.category).toBe('lower')
    expect(TYPICAL_DEFAULTS.bench.category).toBe('upper')
  })
  it('мышцы подбираются картой по названию для каждого типового упражнения (RU и EN) — подставлять руками не нужно', () => {
    for (const b of VARIANT_BASES) {
      expect(ruleForExercise(b.ru), b.id + ' ru').not.toBeNull()
      expect(ruleForExercise(b.en), b.id + ' en').not.toBeNull()
    }
  })
})

describe('разновидности меняют поля', () => {
  it('признаки: отягощение/штанга/гантели/гиря — «с весом»; на одной руке/ноге — Л/П', () => {
    expect(variantFlags(base('pushup').variants[idx('pushup', 'с отягощением')])).toEqual({ weighted: true, oneSided: false })
    expect(variantFlags(base('pushup').variants[idx('pushup', 'на одной руке')])).toEqual({ weighted: false, oneSided: true })
    expect(variantFlags(base('squat').variants[idx('squat', 'со штангой')]).weighted).toBe(true)
    expect(variantFlags(base('squat').variants[idx('squat', 'кубковые')]).weighted).toBe(true)
    expect(variantFlags(base('squat').variants[idx('squat', 'на одной ноге')]).oneSided).toBe(true)
    expect(variantFlags(base('pushup').variants[idx('pushup', 'алмазные')])).toEqual({ weighted: false, oneSided: false })
    expect(variantFlags(undefined)).toEqual({ weighted: false, oneSided: false })
  })
  it('typicalDefaults: без разновидности — базовые; с отягощением — вес включается; базовая таблица не портится', () => {
    expect(typicalDefaults(base('pushup'), -1).tracksWeight).toBe(false)
    expect(typicalDefaults(base('pushup'), idx('pushup', 'с отягощением')).tracksWeight).toBe(true)
    expect(typicalDefaults(base('pushup'), idx('pushup', 'на одной руке')).bilateral).toBe(true)
    expect(TYPICAL_DEFAULTS.pushup.tracksWeight).toBe(false)
    expect(typicalDefaults(base('bench'), -1).tracksWeight).toBe(true) // у штанги вес остаётся и без разновидности
  })
  it('у каждой разновидности каждого упражнения значения полные', () => {
    for (const b of VARIANT_BASES) for (let i = -1; i < b.variants.length; i++) expect(Object.keys(typicalDefaults(b, i)).sort(), b.id + i).toEqual(['bilateral', 'category', 'label', 'tracksDuration', 'tracksWeight'])
  })
})

describe('ExerciseForm: автозаполнение при выборе типового', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  const form = () => mount(ExerciseForm, { props: { existing: null } })
  const val = (w: ReturnType<typeof form>, tid: string) => (w.find(`[data-testid="${tid}"]`).element as HTMLSelectElement).value
  const chk = (w: ReturnType<typeof form>, tid: string) => (w.find(`[data-testid="${tid}"]`).element as HTMLInputElement).checked
  const pick = (w: ReturnType<typeof form>, id: string) => w.find('[data-testid="typical-select"]').setValue(id)
  const saved = (w: ReturnType<typeof form>) => w.emitted('save')![0][0] as Record<string, unknown>

  it('приседания: категория «низ», с весом, повторения; подсказка «заполнено по типовому»', async () => {
    const w = form()
    expect(w.find('[data-testid="typical-autofill-hint"]').exists()).toBe(false)
    await pick(w, 'squat')
    expect(val(w, 'category-select')).toBe('lower')
    expect(val(w, 'tracks-weight-select')).toBe('yes')
    expect(val(w, 'value-label-select')).toBe('Повторения')
    expect(w.find('[data-testid="typical-autofill-hint"]').text()).toContain('заполнены по типовому')
    w.unmount()
  })

  it('планка: фулбади, без веса, «Секунды»', async () => {
    const w = form()
    await pick(w, 'plank')
    expect(val(w, 'category-select')).toBe('fullbody')
    expect(val(w, 'tracks-weight-select')).toBe('no')
    expect(val(w, 'value-label-select')).toBe('Секунды')
    w.unmount()
  })

  it('все типовые упражнения заполняют форму по таблице (категория, вес, подпись)', async () => {
    for (const b of VARIANT_BASES) {
      const w = form()
      await pick(w, b.id)
      const d = TYPICAL_DEFAULTS[b.id]
      expect(val(w, 'category-select'), b.id).toBe(d.category)
      expect(val(w, 'tracks-weight-select'), b.id).toBe(d.tracksWeight ? 'yes' : 'no')
      expect(val(w, 'value-label-select'), b.id).toBe(d.label === 'seconds' ? 'Секунды' : 'Повторения')
      expect((w.find('input[type="text"]').element as HTMLInputElement).value, b.id).toBe(baseName(b))
      w.unmount()
    }
  })

  it('что человек уже менял сам — не перезаписывается; остальное заполняется', async () => {
    const w = form()
    await w.find('[data-testid="category-select"]').setValue('custom') // руками выбрал категорию
    await w.find('[data-testid="value-label-select"]').setValue('Минуты') // и «что считаем»
    await pick(w, 'squat')
    expect(val(w, 'category-select')).toBe('custom') // не тронуто
    expect(val(w, 'value-label-select')).toBe('Минуты') // не тронуто
    expect(val(w, 'tracks-weight-select')).toBe('yes') // не менял — заполнилось
    w.unmount()
  })

  it('после автозаполнения любое поле можно изменить, и повторный выбор разновидности его уже не трогает', async () => {
    const w = form()
    await pick(w, 'pushup')
    expect(val(w, 'tracks-weight-select')).toBe('no')
    await w.find('[data-testid="tracks-weight-select"]').setValue('yes') // передумал: хочу вес
    const opts = w.findAll('[data-testid="variant-select"] option')
    await w.find('[data-testid="variant-select"]').setValue(opts.find((o) => o.text() === 'алмазные')!.attributes('value'))
    expect(val(w, 'tracks-weight-select')).toBe('yes') // осталось по его выбору
    w.unmount()
  })

  it('разновидность «с отягощением» включает вес, а «на одной руке» — Л/П; сняли разновидность — вернулось', async () => {
    const w = form()
    await pick(w, 'pushup')
    const opt = (ru: string) => w.findAll('[data-testid="variant-select"] option').find((o) => o.text() === ru)!.attributes('value')
    await w.find('[data-testid="variant-select"]').setValue(opt('с отягощением'))
    expect(val(w, 'tracks-weight-select')).toBe('yes')
    await w.find('[data-testid="variant-select"]').setValue('')
    expect(val(w, 'tracks-weight-select')).toBe('no')
    await w.find('[data-testid="variant-select"]').setValue(opt('на одной руке'))
    expect(chk(w, 'bilateral')).toBe(true)
    w.unmount()
  })

  it('«Сохранить» отдаёт подставленные значения', async () => {
    const w = form()
    await pick(w, 'bench')
    await w.find('form').trigger('submit')
    expect(saved(w)).toMatchObject({ name: 'Жим лёжа', category: 'upper', tracks_weight: 'yes', value_label: 'Повторения', tracks_duration: false, bilateral: false })
    w.unmount()
  })

  it('существующее упражнение: ничего не подставляется (правка не меняет сохранённое молча)', async () => {
    const ex = { id: 'e1', user_id: 'u', name: 'Отжимания', category: 'upper', tracks_weight: false, unit: null, value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false } as unknown as Exercise
    const w = mount(ExerciseForm, { props: { existing: ex } })
    const opts = w.findAll('[data-testid="variant-select"] option')
    await w.find('[data-testid="variant-select"]').setValue(opts.find((o) => o.text() === 'с отягощением')!.attributes('value'))
    expect((w.find('[data-testid="tracks-weight-select"]').element as HTMLSelectElement).value).toBe('no') // не включилось
    expect(w.find('[data-testid="typical-autofill-hint"]').exists()).toBe(false)
    w.unmount()
  })
})
