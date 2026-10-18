import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartMarkerPicker from './components/ChartMarkerPicker.vue'
import { CHART_MARKERS, readChartMarker } from './lib/chartMarker'
import { freeTotal } from './lib/slots'

async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG 55.2 срез 7е: «Кольцо» и «Мишень» в разделе маркеров-диаграмм (было 4 — меньше всех бесплатных; параллельно агент 5 добавил «Наклейку» и «Неон» — итого 8).
describe('Маркеры: новые карточки', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  it('реестр из восьми (вместе с «Наклейкой» и «Неоном» агента 5); счётчик слота «n/m» витрины берётся из него же, а не вписан числом', () => {
    expect([...CHART_MARKERS]).toEqual(['flat', 'glass', 'drop', 'outline', 'sticker', 'neon', 'ring', 'target'])
    expect(freeTotal('chart-markers')).toBe(CHART_MARKERS.length)
    expect(freeTotal('chart-markers')).toBe(8)
  })
  it('у «Кольца» в предпросмотре отверстие цвета карточки, у «Мишени» — масштабированная группа; подписи RU/EN', () => {
    const w = mount(ChartMarkerPicker)
    expect(w.find('[data-testid="marker-ring"] svg').html()).toContain('fill="var(--bg-card)"')
    expect(w.find('[data-testid="marker-target"] svg').html()).toContain('scale(.62)')
    expect(w.find('[data-testid="marker-ring"]').text()).toContain('Кольцо')
    expect(w.find('[data-testid="marker-target"]').text()).toContain('Мишень')
    localStorage.setItem('site_lang', 'en')
    const en = mount(ChartMarkerPicker)
    expect(en.find('[data-testid="marker-ring"]').text()).toContain('Ring')
    expect(en.find('[data-testid="marker-target"]').text()).toContain('Target')
  })
  it.each(['ring', 'target'] as const)('«Выбрать» для «%s» пишет chart_marker, не трогая остальные настройки графиков', async (v) => {
    const w = mount(ChartMarkerPicker)
    await w.find(`[data-testid="marker-${v}"] [data-testid="marker-choose"]`).trigger('click')
    expect(localStorage.getItem('chart_marker')).toBe(v)
    expect(readChartMarker()).toBe(v)
    expect(w.find(`[data-testid="marker-${v}"]`).attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="marker-flat"]').attributes('data-active')).toBe('false')
    for (const k of ['chart_kind', 'chart_line', 'chart_anim', 'chart_forecast', 'chart_sparks', 'chart_spark_style']) expect(localStorage.getItem(k), k).toBeNull()
  })
  it('подсказка раздела не называет число стилей (оно устаревало: «все пять» при четырёх)', () => {
    const ru = mount(ChartMarkerPicker).text()
    expect(ru).toContain('Все стили бесплатные')
    expect(ru).not.toMatch(/Все (четыре|пять|шесть)/)
    localStorage.setItem('site_lang', 'en')
    const en = mount(ChartMarkerPicker).text()
    expect(en).toContain('All styles are free')
    expect(en).not.toMatch(/All (four|five|six)/)
  })
  it('КОПИЯ chartMarker.ts в web-dashboard совпадает с этой (страж)', async () => {
    expect(await readSrc('../../web-dashboard/src/lib/chartMarker.ts')).toBe(await readSrc('./lib/chartMarker.ts'))
  })
})
