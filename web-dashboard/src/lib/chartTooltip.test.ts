import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartBlock from '../components/ChartBlock.vue'

const plain = [
  { date: '2026-10-01', y: 10 },
  { date: '2026-10-02', y: 14 },
  { date: '2026-10-03', y: null },
  { date: '2026-10-04', y: 8 },
]
const withShares = [
  { date: '2026-10-01', y: 10, shares: [{ label: null, reps: 6 }, { label: 'алмазные', reps: 4 }] },
  { date: '2026-10-02', y: 12, shares: [{ label: 'алмазные', reps: 12 }] },
]
function mountChart(points = plain, extra: Record<string, unknown> = {}) {
  const w = mount(ChartBlock, { props: { title: 'Отжимания', points, unit: ' раз', variations: ['алмазные'], ...extra }, attachTo: document.body })
  const svg = w.find('[data-test="chart-svg"]').element as SVGSVGElement
  // jsdom не раскладывает: график занимает 620 px от x=0, так что clientX == координата viewBox
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 620, height: 160, right: 620, bottom: 160, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  return w
}

describe('ChartBlock: подсказка с перекрестием (BACKLOG 55.2 срез 2)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    vi.useRealTimers()
  })

  it('по умолчанию подсказки нет; график доступен с клавиатуры и имеет подпись', () => {
    const w = mountChart()
    expect(w.find('[data-test="chart-tip"]').exists()).toBe(false)
    expect(w.find('[data-test="chart-cross"]').exists()).toBe(false)
    const svg = w.find('[data-test="chart-svg"]')
    expect(svg.attributes('tabindex')).toBe('0')
    expect(svg.attributes('aria-label')).toContain('Отжимания')
  })

  it('наведение выбирает ближайшую точку: дата, значение и единицы; пропуски пропускаются', async () => {
    const w = mountChart()
    await w.find('[data-test="chart-svg"]').trigger('pointermove', { clientX: 40, pointerType: 'mouse' })
    expect(w.find('[data-test="chart-tip"]').text()).toBe('01.10: 10 раз')
    expect(w.find('[data-test="chart-cross"]').exists()).toBe(true)
    // третья точка — пропуск (y=null): курсор над ней выбирает соседнюю с данными, а не пустоту
    await w.find('[data-test="chart-svg"]').trigger('pointermove', { clientX: 413, pointerType: 'mouse' })
    expect(w.find('[data-test="chart-tip"]').text()).toMatch(/: (14|8) раз$/)
  })

  it('мышь ушла — подсказка скрыта; у касания остаётся и исчезает по таймеру', async () => {
    const w = mountChart()
    const svg = w.find('[data-test="chart-svg"]')
    await svg.trigger('pointermove', { clientX: 40, pointerType: 'mouse' })
    await svg.trigger('pointerleave', { pointerType: 'mouse' })
    expect(w.find('[data-test="chart-tip"]').exists()).toBe(false)
    vi.useFakeTimers()
    await svg.trigger('pointerdown', { clientX: 40, pointerType: 'touch' })
    await svg.trigger('pointerleave', { pointerType: 'touch' })
    expect(w.find('[data-test="chart-tip"]').exists()).toBe(true)
    vi.advanceTimersByTime(3600)
    await w.vm.$nextTick()
    expect(w.find('[data-test="chart-tip"]').exists()).toBe(false)
  })

  it('клавиатура: стрелки листают точки с данными, Home/End, Escape скрывает', async () => {
    const w = mountChart()
    const svg = w.find('[data-test="chart-svg"]')
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain('01.10')
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain('02.10: 14')
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain('04.10: 8') // пропуск 03.10 перепрыгнут
    await svg.trigger('keydown', { key: 'Home' })
    expect(w.find('[data-test="chart-tip"]').text()).toContain('01.10')
    await svg.trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-test="chart-tip"]').exists()).toBe(false)
  })

  it('метрика с «особенностями»: в подсказке — разбивка по ним', async () => {
    const w = mountChart(withShares)
    await w.find('[data-test="chart-svg"]').trigger('pointermove', { clientX: 40, pointerType: 'mouse' })
    const tip = w.find('[data-test="chart-tip"]').text()
    expect(tip).toContain('01.10: 10 раз')
    expect(tip).toContain('алмазные')
  })

  it('текст подсказки не разбирается как HTML', async () => {
    const w = mountChart([{ date: '2026-10-01', y: 5 }, { date: '2026-10-02', y: 6 }], { unit: '<b>x</b>' })
    await w.find('[data-test="chart-svg"]').trigger('pointermove', { clientX: 40, pointerType: 'mouse' })
    expect(w.find('[data-test="chart-tip"] b').exists()).toBe(false)
    expect(w.find('[data-test="chart-tip"]').text()).toContain('<b>x</b>')
  })
})
