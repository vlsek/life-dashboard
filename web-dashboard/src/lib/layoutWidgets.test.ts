import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LayoutModal from '../components/LayoutModal.vue'
import { defaultLayout, withSavingsWidget, type LayoutItem } from './layout'
import { CARD_STEP, reorderVisible, useBlockDrag } from './blockDrag'
import { vi } from 'vitest'

// Окно раскладки: выбор виджета «Коплю на товар» галочкой (решение владельца 2026-10-03), «Виджеты» в перетаскивании
const shop = [
  { id: 'a', name: 'Наушники', cost: 100, link: null },
  { id: 'b', name: 'Книга', cost: 40, link: null },
]
const savedWidgets = (w: ReturnType<typeof mount>): LayoutItem | undefined => (w.emitted('save')![0][0] as LayoutItem[]).find((i) => i.key === 'widgets')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('LayoutModal: виджеты на главной', () => {
  it('есть строка блока «Виджеты» и настройка с галочкой «Коплю на товар»', () => {
    const w = mount(LayoutModal, { props: { initial: defaultLayout(), shopItems: shop } })
    expect(w.findAll('[data-test="layout-row"]')).toHaveLength(4)
    expect(w.text()).toContain('Виджеты')
    expect(w.find('[data-test="savings-toggle"]').exists()).toBe(true)
    expect((w.find('[data-test="savings-toggle"]').element as HTMLInputElement).checked).toBe(false)
    expect(w.find('[data-test="savings-pick"]').exists()).toBe(false)
    w.unmount()
  })

  it('галочка включает виджет и выбирает первый товар; «Сохранить» отдаёт раскладку с widgets.savings', async () => {
    const w = mount(LayoutModal, { props: { initial: defaultLayout(), shopItems: shop } })
    await w.find('[data-test="savings-toggle"]').setValue(true)
    expect((w.find('[data-test="savings-pick"]').element as HTMLSelectElement).value).toBe('a')
    await w.find('[data-test="save"]').trigger('click')
    expect(savedWidgets(w)).toEqual({ key: 'widgets', visible: true, widgets: { savings: 'a' } })
    w.unmount()
  })

  it('выбор другого товара меняет id; снятие галочки убирает виджет', async () => {
    const w = mount(LayoutModal, { props: { initial: withSavingsWidget(defaultLayout(), 'a'), shopItems: shop } })
    expect((w.find('[data-test="savings-toggle"]').element as HTMLInputElement).checked).toBe(true)
    await w.find('[data-test="savings-pick"]').setValue('b')
    await w.find('[data-test="save"]').trigger('click')
    expect(savedWidgets(w)!.widgets).toEqual({ savings: 'b' })
    await w.find('[data-test="savings-toggle"]').setValue(false)
    await w.find('[data-test="save"]').trigger('click')
    const second = (w.emitted('save')![1][0] as LayoutItem[]).find((i) => i.key === 'widgets')!
    expect(second).toEqual({ key: 'widgets', visible: true })
    expect(w.find('[data-test="savings-pick"]').exists()).toBe(false)
    w.unmount()
  })

  it('в магазине нет товаров — галочка отключена, подсказка со ссылкой в магазин', () => {
    const w = mount(LayoutModal, { props: { initial: defaultLayout(), shopItems: [] } })
    expect((w.find('[data-test="savings-toggle"]').element as HTMLInputElement).disabled).toBe(true)
    expect(w.find('[data-test="savings-none"]').text()).toContain('нет товаров')
    expect(w.find('[data-test="savings-none"] a').attributes('href')).toBe('/shop/')
    w.unmount()
  })

  it('выбранный товар уже куплен/удалён (нет в списке): галочка стоит, в выборе «— выберите товар —»', () => {
    const w = mount(LayoutModal, { props: { initial: withSavingsWidget(defaultLayout(), 'gone'), shopItems: shop } })
    expect((w.find('[data-test="savings-toggle"]').element as HTMLInputElement).checked).toBe(true)
    expect(w.find('[data-test="savings-pick"]').text()).toContain('выберите товар')
    w.unmount()
  })

  it('галочка не сбивает остальную раскладку: порядок и скрытые блоки сохраняются', async () => {
    const initial: LayoutItem[] = [
      { key: 'daily', visible: true },
      { key: 'profile', visible: false },
      { key: 'charts', visible: true },
      { key: 'widgets', visible: true },
    ]
    const w = mount(LayoutModal, { props: { initial, shopItems: shop } })
    await w.find('[data-test="savings-toggle"]').setValue(true)
    await w.find('[data-test="save"]').trigger('click')
    const out = w.emitted('save')![0][0] as LayoutItem[]
    expect(out.map((i) => [i.key, i.visible])).toEqual([['daily', true], ['profile', false], ['charts', true], ['widgets', true]])
    w.unmount()
  })
})

describe('перетаскивание с блоком «Виджеты»', () => {
  const ev = (y: number) => ({ clientY: y, button: 0, pointerId: 1, currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() } }) as unknown as PointerEvent
  const withWidget = (): LayoutItem[] => withSavingsWidget(defaultLayout(), 'a')
  const shown = (i: LayoutItem) => i.visible && (i.key !== 'widgets' || !!i.widgets)

  it('пустой блок «Виджеты» в перетаскивании не участвует (isShown), заполненный — участвует', () => {
    const commitEmpty = vi.fn()
    const g = useBlockDrag(() => defaultLayout(), commitEmpty, () => 800, shown)
    g.onDown(ev(100), 'profile')
    expect(g.drag.value!.mids).toHaveLength(3) // profile, charts, daily
    g.onCancel()
    const g2 = useBlockDrag(() => withWidget(), vi.fn(), () => 800, shown)
    g2.onDown(ev(100), 'profile')
    expect(g2.drag.value!.mids).toHaveLength(4)
    g2.onCancel()
  })

  it('перенос блока «Виджеты» наверх сохраняет его конфиг и порядок остальных', () => {
    const commit = vi.fn()
    const g = useBlockDrag(() => withWidget(), commit, () => 800, shown)
    g.onDown(ev(400), 'widgets')
    g.onMove(ev(400 - 3 * CARD_STEP - 1))
    g.onUp()
    const out = commit.mock.calls[0][0] as LayoutItem[]
    expect(out.map((i) => i.key)).toEqual(['widgets', 'profile', 'charts', 'daily'])
    expect(out[0].widgets).toEqual({ savings: 'a' })
  })

  it('reorderVisible с пустым блоком «Виджеты» ставит скрытый по условию блок на его же место', () => {
    const l = defaultLayout() // widgets без конфига — «не показан»
    const out = reorderVisible(l, 0, 2, shown)
    expect(out.map((i) => i.key)).toEqual(['charts', 'daily', 'profile', 'widgets'])
  })
})
