import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DictionaryTabs from './DictionaryTabs.vue'

const tabs = [
  { code: 'en', label: 'English', count: 4 },
  { code: 'de', label: 'Deutsch', count: 0 },
]
const base = { tabs, active: 'en', totalCount: 4, addable: [['fr', 'Français'], ['es', 'Español']] as [string, string][] }

describe('DictionaryTabs', () => {
  it('shows an "All" tab only when there are several dictionaries, plus one tab per language with its count', () => {
    const w = mount(DictionaryTabs, { props: base })
    expect(w.find('[data-test="tab-all"]').exists()).toBe(true)
    expect(w.find('[data-test="tab-en"]').text()).toContain('English · 4')
    expect(w.find('[data-test="tab-de"]').text()).toContain('Deutsch · 0')
    const single = mount(DictionaryTabs, { props: { ...base, tabs: [tabs[0]] } })
    expect(single.find('[data-test="tab-all"]').exists()).toBe(false)
    w.unmount()
    single.unmount()
  })

  it('marks the active tab and emits select on click', async () => {
    const w = mount(DictionaryTabs, { props: base })
    expect(w.find('[data-test="tab-en"]').attributes('aria-selected')).toBe('true')
    expect(w.find('[data-test="tab-de"]').attributes('aria-selected')).toBe('false')
    await w.find('[data-test="tab-de"]').trigger('click')
    await w.find('[data-test="tab-all"]').trigger('click')
    expect(w.emitted('select')).toEqual([['de'], ['all']])
    w.unmount()
  })

  it('creates a new dictionary through the picker (defaults to the first free language)', async () => {
    const w = mount(DictionaryTabs, { props: base })
    expect(w.find('[data-test="tab-picker"]').exists()).toBe(false)
    await w.find('[data-test="tab-add"]').trigger('click')
    expect((w.find('[data-test="tab-picker-select"]').element as HTMLSelectElement).value).toBe('fr')
    await w.find('[data-test="tab-picker-select"]').setValue('es')
    await w.find('[data-test="tab-picker"]').trigger('submit.prevent')
    expect(w.emitted('add')).toEqual([['es']])
    expect(w.find('[data-test="tab-picker"]').exists()).toBe(false)
    w.unmount()
  })

  it('hides the "+" button when every language already has a dictionary', () => {
    const w = mount(DictionaryTabs, { props: { ...base, addable: [] } })
    expect(w.find('[data-test="tab-add"]').exists()).toBe(false)
    w.unmount()
  })

  it('offers to remove a dictionary only while it is empty', async () => {
    const full = mount(DictionaryTabs, { props: base })
    expect(full.find('[data-test="tab-remove"]').exists()).toBe(false)
    const empty = mount(DictionaryTabs, { props: { ...base, active: 'de' } })
    await empty.find('[data-test="tab-remove"]').trigger('click')
    expect(empty.emitted('remove')).toEqual([['de']])
    full.unmount()
    empty.unmount()
  })
})
