import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DayModal from './components/DayModal.vue'
import type { PlannedItem } from './lib/types'

// 🐞 BACKLOG раздел 35: «когда план в календаре пишешь и жмёшь сохранить, он не добавляется, только на +».
const mountModal = (initial: PlannedItem[] = []) => mount(DayModal, { props: { dateStr: '2026-10-10', initial } })
const saveBtn = (w: ReturnType<typeof mountModal>) => w.find('.modal-actions button:not(.secondary)')
const saved = (w: ReturnType<typeof mountModal>) => w.emitted('save')![0][0] as PlannedItem[]

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('окно дня календаря: «Сохранить» учитывает текст в поле', () => {
  it('текст в поле без нажатия «+» при «Сохранить» добавляется пунктом плана', async () => {
    const w = mountModal()
    await w.find('input[type="text"]').setValue('Купить подарок')
    await saveBtn(w).trigger('click')
    expect(saved(w)).toEqual([{ type: 'custom', text: 'Купить подарок', done: false }])
    w.unmount()
  })

  it('к уже добавленным пунктам дописывается и недописанный', async () => {
    const w = mountModal([{ type: 'custom', text: 'Старый', done: true }])
    await w.find('input[type="text"]').setValue('  Новый  ')
    await saveBtn(w).trigger('click')
    expect(saved(w).map((p) => p.text)).toEqual(['Старый', 'Новый'])
    expect(saved(w)[0].done).toBe(true)
    w.unmount()
  })

  it('«+» по-прежнему работает: пункт добавлен и поле очищено, повторное сохранение не дублирует', async () => {
    const w = mountModal()
    const input = w.find('input[type="text"]')
    await input.setValue('Через плюс')
    await w.find('button.secondary:not(.modal-actions button)').trigger('click')
    expect((input.element as HTMLInputElement).value).toBe('')
    await saveBtn(w).trigger('click')
    expect(saved(w)).toHaveLength(1)
    w.unmount()
  })

  it('Enter в поле добавляет пункт, «Сохранить» после него ничего лишнего не добавляет', async () => {
    const w = mountModal()
    const input = w.find('input[type="text"]')
    await input.setValue('Enter-план')
    await input.trigger('keydown.enter')
    await saveBtn(w).trigger('click')
    expect(saved(w).map((p) => p.text)).toEqual(['Enter-план'])
    w.unmount()
  })

  it('поле пустое или из пробелов — пустой пункт не создаётся', async () => {
    const w = mountModal([{ type: 'custom', text: 'Один', done: false }])
    await w.find('input[type="text"]').setValue('   ')
    await saveBtn(w).trigger('click')
    expect(saved(w).map((p) => p.text)).toEqual(['Один'])
    w.unmount()
  })

  it('«Отмена» ничего не сохраняет, даже если в поле есть текст', async () => {
    const w = mountModal()
    await w.find('input[type="text"]').setValue('Не нужно')
    await w.find('.modal-actions button.secondary').trigger('click')
    expect(w.emitted('save')).toBeUndefined()
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })
})
