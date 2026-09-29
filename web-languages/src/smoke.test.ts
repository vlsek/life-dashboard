import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppShell from './components/AppShell.vue'
import WordForm from './components/WordForm.vue'

describe('AppShell (languages pilot)', () => {
  it('renders without throwing and links to itself at /languages/', () => {
    const wrapper = mount(AppShell, { props: { userEmail: null } })
    expect(wrapper.html()).toContain('/languages/')
    wrapper.unmount()
  })
})

describe('WordForm.vue', () => {
  const blankInitial = { word: '', translation: null, example: null, lang: 'en', translateTo: 'ru' }

  it('does not emit save when the word field is empty', async () => {
    const wrapper = mount(WordForm, { props: { isEdit: false, initial: blankInitial } })
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })

  it('emits save with the entered fields', async () => {
    const wrapper = mount(WordForm, { props: { isEdit: false, initial: blankInitial } })
    await wrapper.find('input[type="text"]').setValue('Hallo')
    await wrapper.find('form').trigger('submit.prevent')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { word: string }
    expect(saved.word).toBe('Hallo')
    wrapper.unmount()
  })

  it('emits close on cancel', async () => {
    const wrapper = mount(WordForm, { props: { isEdit: false, initial: blankInitial } })
    const buttons = wrapper.findAll('button[type="button"]')
    await buttons[buttons.length - 1].trigger('click') // cancel is last; first is the translate button
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })
})
