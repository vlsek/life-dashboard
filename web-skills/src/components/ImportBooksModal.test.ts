import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ImportBooksModal from './ImportBooksModal.vue'

const CSV = 'Title,Author,Exclusive Shelf,Date Read\nDune,Frank Herbert,read,2024/03/15\nEmma,Austen,to-read,\nOld,Me,read,2020/01/01\n'

function pick(w: ReturnType<typeof mount>, text: string) {
  const input = w.get('[data-test="gr-file"]').element as HTMLInputElement
  const file = new File([text], 'goodreads.csv', { type: 'text/csv' })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  return w.get('[data-test="gr-file"]').trigger('change')
}

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('ImportBooksModal (77.9)', () => {
  it('без файла кнопка «Импортировать» недоступна', () => {
    const w = mount(ImportBooksModal, { props: { existing: [], busy: false, error: '' } })
    expect((w.get('[data-test="gr-confirm"]').element as HTMLButtonElement).disabled).toBe(true)
  })
  it('показывает, что будет добавлено, и пропускает дубли; подтверждение отдаёт только новые книги', async () => {
    const w = mount(ImportBooksModal, { props: { existing: [{ title: 'old', author: 'me' }], busy: false, error: '' } })
    await pick(w, CSV)
    await flushPromises()
    const plan = w.get('[data-test="gr-plan"]').text()
    expect(plan).toContain('2') // Dune и Emma
    expect(plan).toContain('Уже есть')
    await w.get('[data-test="gr-confirm"]').trigger('click')
    const out = w.emitted('confirm')![0][0] as { title: string }[]
    expect(out.map((b) => b.title)).toEqual(['Dune', 'Emma'])
  })
  it('чужой файл — понятная ошибка, импортировать нельзя', async () => {
    const w = mount(ImportBooksModal, { props: { existing: [], busy: false, error: '' } })
    await pick(w, 'a,b\n1,2\n')
    await flushPromises()
    expect(w.get('[data-test="gr-file-error"]').text()).toContain('Title')
    expect((w.get('[data-test="gr-confirm"]').element as HTMLButtonElement).disabled).toBe(true)
  })
  it('ошибка сохранения от родителя показывается', () => {
    const w = mount(ImportBooksModal, { props: { existing: [], busy: false, error: 'Не удалось импортировать: x' } })
    expect(w.get('[data-test="gr-error"]').text()).toContain('x')
  })
})
