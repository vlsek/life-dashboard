import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UsefulTodayList from './components/UsefulTodayList.vue'
import rawSource from './components/DailyMetricsSection.vue?raw'

// только разметка: в скрипте и комментариях те же имена компонентов тоже встречаются
const sectionSource = rawSource.slice(rawSource.indexOf('<template>'))

// BACKLOG 23:00: «Что полезного сделал за день» — свёрнутым по умолчанию, раскрываемым, в самом низу блока ежедневных метрик.
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

const body = (w: ReturnType<typeof mount>) => w.find('[data-test="useful-body"]').element as HTMLElement

describe('UsefulTodayList: сворачивание', () => {
  it('по умолчанию свёрнут: заголовок и число пунктов видны, тело скрыто', () => {
    const w = mount(UsefulTodayList, { props: { items: ['a', 'b', 'c'] } })
    expect(w.find('[data-test="useful-toggle"]').attributes('aria-expanded')).toBe('false')
    expect(w.find('[data-test="useful-count"]').text()).toBe('(3)')
    expect(body(w).style.display).toBe('none')
  })

  it('без пунктов счётчика нет', () => {
    const w = mount(UsefulTodayList, { props: { items: [] } })
    expect(w.find('[data-test="useful-count"]').exists()).toBe(false)
  })

  it('клик и клавиши Enter/Space раскрывают и сворачивают, выбор запоминается', async () => {
    const w = mount(UsefulTodayList, { props: { items: ['a'] } })
    const head = w.find('[data-test="useful-toggle"]')
    await head.trigger('click')
    expect(head.attributes('aria-expanded')).toBe('true')
    expect(body(w).style.display).not.toBe('none')
    expect(localStorage.getItem('dash_collapsed:useful_today')).toBe('0')
    await head.trigger('keydown', { key: 'Enter' })
    expect(head.attributes('aria-expanded')).toBe('false')
    expect(localStorage.getItem('dash_collapsed:useful_today')).toBe('1')
    await head.trigger('keydown', { key: ' ' })
    expect(head.attributes('aria-expanded')).toBe('true')
  })

  it('явный выбор «развёрнуто» с прошлого раза сильнее «свёрнуто по умолчанию»', () => {
    localStorage.setItem('dash_collapsed:useful_today', '0')
    const w = mount(UsefulTodayList, { props: { items: [] } })
    expect(w.find('[data-test="useful-toggle"]').attributes('aria-expanded')).toBe('true')
  })

  it('добавление (Enter и кнопка) и удаление работают как раньше, пустая строка игнорируется', async () => {
    localStorage.setItem('dash_collapsed:useful_today', '0')
    const w = mount(UsefulTodayList, { props: { items: ['x', 'y'] } })
    const input = w.find('input')
    await input.setValue('  сделал зарядку  ')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('add')?.[0]).toEqual(['сделал зарядку'])
    expect((input.element as HTMLInputElement).value).toBe('')
    await input.setValue('   ')
    await w.find('.add-row button').trigger('click')
    expect(w.emitted('add')).toHaveLength(1)
    await w.findAll('.item button')[1].trigger('click')
    expect(w.emitted('remove')?.[0]).toEqual([1])
  })
})

describe('DailyMetricsSection: место блока', () => {
  it('«Что полезного» стоит после «Подходов» — в самом низу блока, и до «Запланированного»', () => {
    const iSets = sectionSource.indexOf('<SetsSection')
    const iUseful = sectionSource.indexOf('<UsefulTodayList')
    const iPlanned = sectionSource.indexOf('<PlannedSection')
    expect(iSets).toBeGreaterThan(0)
    expect(iUseful).toBeGreaterThan(iSets)
    expect(iPlanned).toBeGreaterThan(iUseful)
  })

  it('внутри карточки с метриками блока больше нет, рядом с кнопкой «Сохранить день» его тоже нет', () => {
    const card = sectionSource.slice(sectionSource.indexOf('<div class="card">'), sectionSource.indexOf('<SetsSection'))
    expect(card).not.toContain('UsefulTodayList')
  })

  it('блок показывается только после загрузки дня (v-if="loaded")', () => {
    expect(sectionSource).toMatch(/<UsefulTodayList v-if="loaded"/)
  })
})
