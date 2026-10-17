import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartLinePicker from './components/ChartLinePicker.vue'
import { CHART_LINES, readChartLine } from './lib/chartLine'

// BACKLOG 55.2 срез 7г: «Ступени» и «Неон» в разделе «Стиль линии» (было 3 варианта — меньше всех).
describe('Стиль линии: новые карточки', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  it('пять карточек; подписи RU/EN; у «Ступеней» предпросмотр из прямых углов, у «Неона» — двойник со свечением', () => {
    expect([...CHART_LINES]).toEqual(['line', 'smooth', 'area', 'steps', 'glow'])
    const w = mount(ChartLinePicker)
    expect(w.findAll('[data-testid^="line-"][data-active]')).toHaveLength(5)
    for (const label of ['Обычная', 'Плавная', 'Ступени', 'Неон']) expect(w.text()).toContain(label)
    expect(w.find('[data-testid="line-steps"] svg').html()).toMatch(/d="M[\d.]+ [\d.]+H[\d.]+V/)
    expect(w.find('[data-testid="line-glow"] svg').html()).toContain('blur')
    localStorage.setItem('site_lang', 'en')
    const en = mount(ChartLinePicker)
    for (const label of ['Steps', 'Neon glow']) expect(en.text()).toContain(label)
  })
  it.each(['steps', 'glow'] as const)('«Выбрать» для «%s» пишет chart_line, не трогая остальные настройки', async (v) => {
    const w = mount(ChartLinePicker)
    await w.find(`[data-testid="line-${v}"] button`).trigger('click')
    expect(localStorage.getItem('chart_line')).toBe(v)
    expect(readChartLine()).toBe(v)
    expect(w.find(`[data-testid="line-${v}"]`).attributes('data-active')).toBe('true')
    for (const k of ['chart_kind', 'chart_marker', 'chart_anim', 'chart_forecast']) expect(localStorage.getItem(k), k).toBeNull()
  })
  it('подсказка раздела объясняет новые стили и сохраняет обещание про честность значений', () => {
    const txt = mount(ChartLinePicker).text()
    expect(txt).toContain('ступени (значение держится до следующего замера)')
    expect(txt).toContain('неоновым свечением')
    expect(txt).toContain('никогда не выходят выше или ниже реальных значений')
  })
})
