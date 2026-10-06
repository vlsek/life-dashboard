import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartsConfigModal from './components/ChartsConfigModal.vue'
import modalSource from './components/ChartsConfigModal.vue?raw'
import listSource from './components/BlockOrderList.vue?raw'
import type { ChartSeries } from './lib/chartSeries'

// BACKLOG «Дашборд, раздел «Графики»: стрелки порядка — в новом дизайне; добавить перетаскивание»: в окне настройки графиков у строки есть
// ручка ☰ (жест общий с «Раскладкой» — lib/useRowDrag) и кнопки ↑/↓ в том же оформлении; любой способ меняет один список и уходит в «Сохранить».
const series: Record<string, ChartSeries> = {
  'body:w': { label: 'Вес', unit: ' кг', color: 'var(--accent)', points: [] },
  points: { label: 'Баллы', unit: '', color: 'var(--danger)', points: [] },
  'metric:water': { label: 'Вода', unit: ' мл', color: 'var(--accent)', points: [], defaultGoal: 2000 },
}
const PERIOD = { range: 'days10' as const, from: null, to: null }
const entries = () => [
  { key: 'body:w', goal: null as number | null },
  { key: 'points', goal: 7 as number | null },
  { key: 'metric:water', goal: null as number | null },
]

// jsdom не считает раскладку — подсовываем строкам геометрию: высота 50, зазор 8 (как gap-2). Вызывать после каждого удаления/добавления строки.
function giveGeometry(w: ReturnType<typeof mount>) {
  w.findAll('[data-test="entry"]').forEach((row, i) => {
    ;(row.element as HTMLElement).getBoundingClientRect = () => ({ top: i * 58, bottom: i * 58 + 50, height: 50, left: 0, right: 300, width: 300, x: 0, y: i * 58, toJSON: () => ({}) }) as DOMRect
  })
}
function mountModal(list = entries()) {
  const w = mount(ChartsConfigModal, { props: { series, entries: list, period: PERIOD }, attachTo: document.body })
  giveGeometry(w)
  return w
}
const ptr = (type: string, y: number) => new MouseEvent(type, { clientY: y, bubbles: true, button: 0 })
const keys = (w: ReturnType<typeof mount>) => (w.emitted('save')![0] as any)[0].map((e: any) => e.key)
async function save(w: ReturnType<typeof mount>) {
  await w.find('[data-test="save"]').trigger('click')
}
async function drag(w: ReturnType<typeof mount>, row: number, fromY: number, toY: number) {
  const handle = w.findAll('[data-test="drag-handle"]')[row]
  handle.element.dispatchEvent(ptr('pointerdown', fromY))
  handle.element.dispatchEvent(ptr('pointermove', toY))
  await w.vm.$nextTick()
  handle.element.dispatchEvent(ptr('pointerup', toY))
  await w.vm.$nextTick()
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('ChartsConfigModal: порядок графиков', () => {
  it('у каждой строки есть ручка-SVG и стрелки в оформлении «Раскладки»; на краях стрелка недоступна', () => {
    const w = mountModal()
    const rows = w.findAll('[data-test="entry"]')
    expect(rows).toHaveLength(3)
    for (const r of rows) {
      expect(r.find('[data-test="drag-handle"] svg').exists()).toBe(true)
      for (const sel of ['up', 'down']) {
        const b = r.find(`[data-test="${sel}"]`)
        expect(b.classes()).toContain('border') // как у BlockOrderList, не старая кнопка .secondary
        expect(b.classes()).not.toContain('secondary')
        expect(b.attributes('aria-label')).toBe(sel === 'up' ? 'Выше' : 'Ниже')
      }
    }
    expect(rows[0].find('[data-test="up"]').attributes('disabled')).toBeDefined()
    expect(rows[0].find('[data-test="down"]').attributes('disabled')).toBeUndefined()
    expect(rows[2].find('[data-test="down"]').attributes('disabled')).toBeDefined()
    expect(rows[2].find('[data-test="up"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })

  it('перетаскивание ручкой вниз через соседа меняет порядок; цели переезжают вместе со строкой', async () => {
    const w = mountModal()
    await drag(w, 0, 25, 25 + 70) // центр 95 — за серединой второй строки (83)
    await save(w)
    expect(keys(w)).toEqual(['points', 'body:w', 'metric:water'])
    expect((w.emitted('save')![0] as any)[0][0]).toEqual({ key: 'points', goal: 7 })
    w.unmount()
  })

  it('перетаскивание вверх, до самого верха', async () => {
    const w = mountModal()
    await drag(w, 2, 2 * 58 + 25, 2 * 58 + 25 - 130) // центр третьей (141) уходит выше середины первой (25)
    await save(w)
    expect(keys(w)).toEqual(['metric:water', 'body:w', 'points'])
    w.unmount()
  })

  it('короткое движение и отмена жеста порядок не меняют', async () => {
    const w = mountModal()
    await drag(w, 0, 25, 25 + 10)
    const handle = w.findAll('[data-test="drag-handle"]')[1]
    handle.element.dispatchEvent(ptr('pointerdown', 83))
    handle.element.dispatchEvent(ptr('pointermove', 83 + 80))
    await w.vm.$nextTick()
    handle.element.dispatchEvent(ptr('pointercancel', 163))
    await w.vm.$nextTick()
    await save(w)
    expect(keys(w)).toEqual(['body:w', 'points', 'metric:water'])
    w.unmount()
  })

  it('пока строку тянут, остальные расступаются, а после жеста сдвиги снимаются', async () => {
    const w = mountModal()
    const handle = w.findAll('[data-test="drag-handle"]')[0]
    handle.element.dispatchEvent(ptr('pointerdown', 25))
    handle.element.dispatchEvent(ptr('pointermove', 25 + 70))
    await w.vm.$nextTick()
    const rows = w.findAll('[data-test="entry"]')
    expect(rows[0].classes()).toContain('is-dragging')
    expect((rows[0].element as HTMLElement).style.transform).toBe('translateY(70px)')
    expect((rows[1].element as HTMLElement).style.transform).toBe('translateY(-58px)') // уступила место на высоту строки с зазором
    handle.element.dispatchEvent(ptr('pointerup', 95))
    await w.vm.$nextTick()
    for (const r of w.findAll('[data-test="entry"]')) expect((r.element as HTMLElement).style.transform).toBe('')
    w.unmount()
  })

  it('клавиатура на ручке: стрелки двигают на одну позицию', async () => {
    const w = mountModal()
    await w.findAll('[data-test="drag-handle"]')[0].trigger('keydown', { key: 'ArrowDown' })
    await w.findAll('[data-test="drag-handle"]')[1].trigger('keydown', { key: 'ArrowDown' })
    await w.findAll('[data-test="drag-handle"]')[0].trigger('keydown', { key: 'ArrowUp' }) // у первой строки вверх некуда — без изменений
    await save(w)
    expect(keys(w)).toEqual(['points', 'metric:water', 'body:w'])
    w.unmount()
  })

  it('стрелки ↑/↓ работают как раньше и меняют тот же список, что и перетаскивание', async () => {
    const w = mountModal()
    await w.findAll('[data-test="down"]')[0].trigger('click') // Баллы, Вес, Вода
    giveGeometry(w)
    await drag(w, 2, 2 * 58 + 25, 2 * 58 + 25 - 70) // Вода выше Веса: Баллы, Вода, Вес
    await save(w)
    expect(keys(w)).toEqual(['points', 'metric:water', 'body:w'])
    w.unmount()
  })

  it('после удаления строки перетаскивание считает по оставшимся строкам (а не по протухшим ссылкам)', async () => {
    const w = mountModal()
    await w.findAll('[data-test="remove"]')[0].trigger('click') // остались Баллы, Вода
    expect(w.findAll('[data-test="entry"]')).toHaveLength(2)
    giveGeometry(w)
    await drag(w, 0, 25, 25 + 70)
    await save(w)
    expect(keys(w)).toEqual(['metric:water', 'points'])
    w.unmount()
  })

  it('после добавления графика он тоже перетаскивается', async () => {
    const w = mountModal([{ key: 'body:w', goal: null }, { key: 'points', goal: null }])
    await w.find('[data-test="add-select"]').setValue('metric:water')
    await w.find('[data-test="add"]').trigger('click')
    giveGeometry(w)
    await drag(w, 2, 2 * 58 + 25, 2 * 58 + 25 - 130)
    await save(w)
    expect(keys(w)).toEqual(['metric:water', 'body:w', 'points'])
    w.unmount()
  })

  it('один график: перетаскивание ничего не ломает, порядок прежний', async () => {
    const w = mountModal([{ key: 'points', goal: null }])
    await drag(w, 0, 25, 25 + 80)
    await save(w)
    expect(keys(w)).toEqual(['points'])
    w.unmount()
  })

  it('подсказка в окне говорит про перетаскивание (RU и EN)', () => {
    const w = mountModal()
    expect(w.text()).toContain('перетаскиванием за ручку или стрелками')
    localStorage.setItem('site_lang', 'en')
    const e = mountModal()
    expect(e.text()).toContain('Drag a chart by its handle')
    w.unmount()
    e.unmount()
  })

  it('жест общий с «Раскладкой»: оба компонента берут его из lib/useRowDrag, своей копии в окне графиков нет', () => {
    expect(modalSource).toContain("from '../lib/useRowDrag'")
    expect(listSource).toContain("from '../lib/useRowDrag'")
    expect(modalSource).not.toContain('setPointerCapture')
  })
})
