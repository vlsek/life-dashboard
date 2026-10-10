import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExerciseForm from './components/ExerciseForm.vue'
import ExerciseCard from './components/ExerciseCard.vue'
import type { Exercise } from './lib/types'

// BACKLOG 54.4: названия упражнений — с заглавной буквы и при сохранении, и при показе (старые записи с маленькой буквы).
const ex = (name: string): Exercise =>
  ({ id: 'e1', user_id: 'u', name, category: 'upper', tracks_weight: false, unit: null, value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false }) as unknown as Exercise

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('регистр названия упражнения', () => {
  it('форма сохраняет название с заглавной буквы', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('жим гантелей на наклонной')
    await w.find('form').trigger('submit')
    expect((w.emitted('save')![0][0] as { name: string }).name).toBe('Жим гантелей на наклонной')
    w.unmount()
  })
  it('карточка показывает старое название с маленькой буквы с заглавной', () => {
    const w = mount(ExerciseCard, { props: { exercise: ex('подтягивания'), entries: [] } })
    expect(w.find('h3').text()).toBe('Подтягивания')
    w.unmount()
  })
})
