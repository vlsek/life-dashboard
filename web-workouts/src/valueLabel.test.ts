import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { t } from './lib/i18n'
import { VALUE_LABEL_PRESET_KEYS, valueLabelOptions, valueLabelPresets } from './lib/valueLabels'
import ExerciseForm from './components/ExerciseForm.vue'
import type { Exercise, ExerciseFormInput } from './lib/types'

const ex = (o: Partial<Exercise>): Exercise => ({ id: 'e1', user_id: 'u', name: 'Run', category: 'upper', tracks_weight: false, unit: '', value_label: 'Км', tracks_duration: true, bilateral: false, created_at: '', ...o }) as unknown as Exercise
const saved = (w: ReturnType<typeof mount>) => w.emitted('save')?.[0]?.[0] as ExerciseFormInput
const find = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-testid="${id}"]`)
const submit = (w: ReturnType<typeof mount>) => w.find('form').trigger('submit')

describe('valueLabels: список «Что считаем»', () => {
  it('шесть готовых вариантов, по умолчанию «Повторения» среди них, повторов нет', () => {
    const p = valueLabelPresets()
    expect(p).toHaveLength(VALUE_LABEL_PRESET_KEYS.length)
    expect(new Set(p).size).toBe(p.length)
    expect(p).toContain(t('workouts_default_value_label'))
  })
  it('своё прежнее значение добавляется отдельным пунктом, а готовое — не дублируется', () => {
    expect(valueLabelOptions('Подтягивания')).toContain('Подтягивания')
    expect(valueLabelOptions('Подтягивания')).toHaveLength(valueLabelPresets().length + 1)
    expect(valueLabelOptions(t('workouts_value_preset_km'))).toHaveLength(valueLabelPresets().length)
    expect(valueLabelOptions(null)).toHaveLength(valueLabelPresets().length)
    expect(valueLabelOptions('  ')).toHaveLength(valueLabelPresets().length)
  })
})

describe('ExerciseForm: «Что считаем» — выпадающий список (BACKLOG 18)', () => {
  it('новое упражнение: выбран «Повторения», это список, а не поле для ручного ввода', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    const select = find(w, 'value-label-select')
    expect(select.element.tagName).toBe('SELECT')
    expect((select.element as HTMLSelectElement).value).toBe(t('workouts_default_value_label'))
    expect(find(w, 'value-label-custom').exists()).toBe(false)
    await w.find('input[type="text"]').setValue('Squat')
    await submit(w)
    expect(saved(w).value_label).toBe(t('workouts_default_value_label'))
    w.unmount()
  })

  it('выбор «Секунды» уходит в value_label как текст (формат хранения прежний)', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Plank')
    await find(w, 'value-label-select').setValue(t('workouts_value_preset_seconds'))
    await submit(w)
    expect(saved(w).value_label).toBe(t('workouts_value_preset_seconds'))
    w.unmount()
  })

  it('«Другое…» открывает поле для своего слова; пустое — возвращается к «Повторения»', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Jumps')
    await find(w, 'value-label-select').setValue('__other__')
    await find(w, 'value-label-custom').setValue('Прыжки')
    await submit(w)
    expect(saved(w).value_label).toBe('Прыжки')
    w.unmount()

    const empty = mount(ExerciseForm, { props: { existing: null } })
    await empty.find('input[type="text"]').setValue('Jumps')
    await find(empty, 'value-label-select').setValue('__other__')
    await submit(empty)
    expect(saved(empty).value_label).toBe(t('workouts_default_value_label'))
    empty.unmount()
  })

  it('упражнение со своим старым значением открывается с ним и не теряет его', async () => {
    const w = mount(ExerciseForm, { props: { existing: ex({ value_label: 'Подтягивания' }) } })
    expect((find(w, 'value-label-select').element as HTMLSelectElement).value).toBe('Подтягивания')
    await submit(w)
    expect(saved(w).value_label).toBe('Подтягивания')
    w.unmount()
  })

  it('упражнение с готовым значением («Км») открывается с ним — важно для подписи темпа «Км/ч»', async () => {
    const w = mount(ExerciseForm, { props: { existing: ex({ value_label: t('workouts_value_preset_km') }) } })
    expect((find(w, 'value-label-select').element as HTMLSelectElement).value).toBe(t('workouts_value_preset_km'))
    await submit(w)
    expect(saved(w).value_label).toBe(t('workouts_value_preset_km'))
    w.unmount()
  })
})
