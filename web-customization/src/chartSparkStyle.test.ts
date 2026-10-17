import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartLinePicker from './components/ChartLinePicker.vue'
import { CHART_SPARK_STYLES, readChartSparkStyle } from './lib/chartLine'

async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG 55.2 срез 7д: вид мини-графиков (спарклайнов) в «Кастомизации» → графики.
describe('Мини-графики: вид', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  it('четыре карточки, по умолчанию «Линия»; у каждой свой предпросмотр', () => {
    expect([...CHART_SPARK_STYLES]).toEqual(['line', 'area', 'bars', 'dots'])
    const w = mount(ChartLinePicker)
    expect(w.findAll('[data-testid^="sparkstyle-"][data-active]')).toHaveLength(4)
    expect(w.find('[data-testid="sparkstyle-line"]').attributes('data-active')).toBe('true')
    for (const label of ['Линия', 'Область', 'Столбики', 'Точки']) expect(w.find('[data-testid="sparkstyle-' + { Линия: 'line', Область: 'area', Столбики: 'bars', Точки: 'dots' }[label] + '"]').text()).toContain(label)
    expect(w.find('[data-testid="sparkstyle-bars"] svg').findAll('rect').length).toBeGreaterThanOrEqual(7)
    expect(w.find('[data-testid="sparkstyle-dots"] svg').findAll('circle').length).toBeGreaterThanOrEqual(7)
    expect(w.find('[data-testid="sparkstyle-dots"] svg').findAll('path')).toHaveLength(0)
    expect(w.find('[data-testid="sparkstyle-area"] svg').html()).toContain('opacity="0.18"')
  })
  it.each(['area', 'bars', 'dots'] as const)('«Выбрать» для «%s» пишет chart_spark_style, не трогая остальные настройки графиков', async (v) => {
    const w = mount(ChartLinePicker)
    await w.find(`[data-testid="sparkstyle-${v}"] [data-testid="sparkstyle-choose"]`).trigger('click')
    expect(localStorage.getItem('chart_spark_style')).toBe(v)
    expect(readChartSparkStyle()).toBe(v)
    expect(w.find(`[data-testid="sparkstyle-${v}"]`).attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="sparkstyle-line"]').attributes('data-active')).toBe('false')
    for (const k of ['chart_kind', 'chart_line', 'chart_marker', 'chart_anim', 'chart_forecast', 'chart_sparks']) expect(localStorage.getItem(k), k).toBeNull()
  })
  it('подписи и подсказка по-русски и по-английски; подсказка честно говорит, что график виден только при включённых «Мини-графиках»', () => {
    const ru = mount(ChartLinePicker).text()
    expect(ru).toContain('Столбики растут от нуля')
    expect(ru).toContain('Виден, только пока ниже включены «Мини-графики»')
    localStorage.setItem('site_lang', 'en')
    const en = mount(ChartLinePicker).text()
    for (const label of ['Mini-charts', 'Bars', 'Area']) expect(en).toContain(label)
  })
  it('КОПИИ chartLine.ts и sparkline.ts в web-dashboard совпадают с этими (страж)', async () => {
    expect(await readSrc('../../web-dashboard/src/lib/chartLine.ts')).toBe(await readSrc('./lib/chartLine.ts'))
    expect(await readSrc('../../web-dashboard/src/lib/sparkline.ts')).toBe(await readSrc('./lib/sparkline.ts'))
  })
})
