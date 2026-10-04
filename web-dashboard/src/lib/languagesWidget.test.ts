import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Виджет «Изучение языков» на главной (BACKLOG 390, владелец 2026-10-03: 5 слов перед глазами, со скроллером)
const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  selectError: null as unknown,
  updateError: null as unknown,
  updates: [] as { patch: unknown; id: unknown }[],
}))
vi.mock('./supabase', () => ({
  sb: {
    from: () => {
      const ctx: { upd?: unknown; id?: unknown } = {}
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => {
        if (col === 'id') ctx.id = val
        return chain
      }
      chain.order = () => chain
      chain.update = (patch: unknown) => {
        ctx.upd = patch
        return chain
      }
      chain.limit = () => Promise.resolve({ data: db.rows, error: db.selectError })
      chain.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
        if (ctx.upd !== undefined) db.updates.push({ patch: ctx.upd, id: ctx.id })
        return Promise.resolve({ error: db.updateError }).then(ok, bad)
      }
      return chain
    },
  },
}))

import LanguagesWidget from '../components/LanguagesWidget.vue'
import WidgetsSection from '../components/WidgetsSection.vue'
import { loadLangOptions, orderQueue, pickWords, readKnown, writeKnown, type LangWord } from './useLanguagesWidget'

const row = (id: string, word: string, over: Record<string, unknown> = {}) => ({ id, word, translation: word + '-tr', example: null, lang: 'en', learned: false, created_at: '2026-10-01', ...over })
const w = (id: string): LangWord => ({ id, word: id, translation: null, example: null, lang: 'en', created_at: '' })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.rows = [row('a', 'apple'), row('b', 'book'), row('c', 'cat'), row('d', 'dog'), row('e', 'egg'), row('f', 'fish'), row('g', 'Haus', { lang: 'de' })]
  db.selectError = null
  db.updateError = null
  db.updates = []
})

describe('очередь слов', () => {
  it('orderQueue: не отмеченные «знаю» сверху в исходном порядке, отмеченные ниже — давнее «знаю» раньше', () => {
    const q = orderQueue([w('a'), w('b'), w('c'), w('d')], { a: 300, c: 100 })
    expect(q.map((x) => x.id)).toEqual(['b', 'd', 'c', 'a'])
  })
  it('pickWords: только невыученные нужного языка; пустой lang = английский; all — любые', () => {
    const rows = [row('1', 'x'), row('2', 'y', { learned: true }), row('3', 'z', { lang: null }), row('4', 'w', { lang: 'de' })]
    expect(pickWords(rows, 'en', {}).map((x) => x.id)).toEqual(['1', '3'])
    expect(pickWords(rows, 'de', {}).map((x) => x.id)).toEqual(['4'])
    expect(pickWords(rows, 'all', {}).map((x) => x.id)).toEqual(['1', '3', '4'])
  })
  it('readKnown/writeKnown: хранит отметки, мусор в localStorage → пусто, лишние старые отбрасываются', () => {
    localStorage.setItem('dash_lang_known', '[1,2]')
    expect(readKnown()).toEqual({})
    localStorage.setItem('dash_lang_known', '{"a":5,"b":"x"}')
    expect(readKnown()).toEqual({ a: 5 })
    const many: Record<string, number> = {}
    for (let i = 0; i < 520; i++) many['id' + i] = i
    writeKnown(many)
    const kept = readKnown()
    expect(Object.keys(kept)).toHaveLength(500)
    expect(kept.id519).toBe(519)
    expect(kept.id0).toBeUndefined()
  })
})

describe('loadLangOptions', () => {
  it('языки с невыученными словами, больше слов — выше; пустой lang считается английским', async () => {
    db.rows = [{ lang: 'de' }, { lang: null }, { lang: 'en' }, { lang: 'en' }]
    expect(await loadLangOptions('u1')).toEqual([
      { code: 'en', name: 'English', count: 3 },
      { code: 'de', name: 'Deutsch', count: 1 },
    ])
  })
})

describe('LanguagesWidget', () => {
  const mountW = (lang = 'all') => mount(LanguagesWidget, { props: { userId: 'u1', lang } })

  it('список невыученных слов со скроллером на 5 строк, счётчик, ссылка на раздел; готовность наверх', async () => {
    const c = mountW('en')
    await flushPromises()
    expect(c.findAll('[data-test="lang-item"]')).toHaveLength(6)
    expect(c.find('[data-test="lang-list"]').attributes('style')).toContain('max-height: 260px')
    expect(c.find('[data-test="lang-count"]').text()).toBe('к изучению: 6')
    expect(c.find('[data-test="lang-link"]').attributes('href')).toBe('/languages/')
    expect(c.find('[data-test="lang-tag"]').exists()).toBe(false)
    expect(c.emitted('state')!.map((e) => e[0])).toEqual(['loading', 'ready'])
    c.unmount()
  })

  it('«Все языки»: у каждого слова подпись языка', async () => {
    const c = mountW('all')
    await flushPromises()
    expect(c.findAll('[data-test="lang-item"]')).toHaveLength(7)
    expect(c.findAll('[data-test="lang-tag"]').map((x) => x.text())).toContain('Deutsch')
    c.unmount()
  })

  it('тап по слову показывает перевод (и пример), второй тап скрывает; нет перевода — подсказка', async () => {
    db.rows = [row('a', 'apple', { example: 'An apple a day' }), row('b', 'book', { translation: null })]
    const c = mountW('en')
    await flushPromises()
    expect(c.find('[data-test="lang-detail"]').exists()).toBe(false)
    const words = c.findAll('[data-test="lang-word"]')
    await words[0].trigger('click')
    expect(c.find('[data-test="lang-translation"]').text()).toBe('apple-tr')
    expect(c.find('[data-test="lang-example"]').text()).toBe('An apple a day')
    await words[0].trigger('click')
    expect(c.find('[data-test="lang-detail"]').exists()).toBe(false)
    await words[1].trigger('click')
    expect(c.find('[data-test="lang-translation"]').text()).toBe('перевода пока нет')
    c.unmount()
  })

  it('«Знаю» уводит слово вниз очереди, слово остаётся невыученным, запись в БД не идёт, отметка запоминается', async () => {
    const c = mountW('en')
    await flushPromises()
    const names = () => c.findAll('[data-test="lang-word"]').map((x) => x.text())
    expect(names()[0]).toBe('apple')
    await c.findAll('[data-test="lang-know"]')[0].trigger('click')
    expect(names()).toEqual(['book', 'cat', 'dog', 'egg', 'fish', 'apple'])
    expect(db.updates).toEqual([])
    expect(Object.keys(readKnown())).toEqual(['a'])
    c.unmount()
    const again = mountW('en') // после перезагрузки порядок тот же
    await flushPromises()
    expect(again.findAll('[data-test="lang-word"]')[0].text()).toBe('book')
    again.unmount()
  })

  it('«Выучил»: слово уходит из очереди, в БД learned = true; последнее слово — виджета нет (empty)', async () => {
    db.rows = [row('a', 'apple'), row('b', 'book')]
    const c = mountW('en')
    await flushPromises()
    await c.findAll('[data-test="lang-learned"]')[0].trigger('click')
    await flushPromises()
    expect(db.updates).toEqual([{ patch: { learned: true }, id: 'a' }])
    expect(c.findAll('[data-test="lang-item"]')).toHaveLength(1)
    await c.find('[data-test="lang-learned"]').trigger('click')
    await flushPromises()
    expect(c.find('[data-test="lang-widget"]').exists()).toBe(false)
    expect(c.emitted('state')!.map((e) => e[0]).pop()).toBe('empty')
    c.unmount()
  })

  it('сбой записи «Выучил» — слово возвращается, показана ошибка', async () => {
    db.updateError = { message: 'rls' }
    const c = mountW('en')
    await flushPromises()
    await c.findAll('[data-test="lang-learned"]')[0].trigger('click')
    await flushPromises()
    expect(c.findAll('[data-test="lang-item"]')).toHaveLength(6)
    expect(c.find('[data-test="lang-error"]').text()).toContain('Не удалось сохранить: rls')
    c.unmount()
  })

  it('нет слов выбранного языка — empty и ничего не рисуется; ошибка загрузки — error', async () => {
    let c = mountW('ja')
    await flushPromises()
    expect(c.find('[data-test="lang-widget"]').exists()).toBe(false)
    expect(c.emitted('state')!.map((e) => e[0]).pop()).toBe('empty')
    c.unmount()
    db.selectError = { message: 'boom' }
    c = mountW('en')
    await flushPromises()
    expect(c.emitted('state')!.map((e) => e[0]).pop()).toBe('error')
    c.unmount()
  })
})

describe('WidgetsSection: языки', () => {
  it('блок виден, когда готов виджет языков; слов нет — блока нет', async () => {
    const s = mount(WidgetsSection, { props: { userId: 'u1', config: { languages: 'en' } } })
    await flushPromises()
    expect(s.find('[data-test="lang-widget"]').exists()).toBe(true)
    expect(s.emitted('shown')!.map((e) => e[0]).pop()).toBe(true)
    s.unmount()
    db.rows = []
    const empty = mount(WidgetsSection, { props: { userId: 'u1', config: { languages: 'en' } } })
    await flushPromises()
    expect(empty.find('[data-test="widgets-section"]').attributes('style')).toContain('display: none')
    expect(empty.emitted('shown')!.map((e) => e[0]).pop()).toBe(false)
    empty.unmount()
  })
})
