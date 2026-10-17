import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartLinePicker from './components/ChartLinePicker.vue'
import { CHART_KINDS, readChartKind } from './lib/chartLine'

async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG 55.2 срез 7в: «Точки» и «Леденцы» в разделе «Вид графика» (было 2 варианта — меньше, чем в любом другом разделе).
describe('Вид графика: новые карточки', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('четыре карточки; подписи по-русски и по-английски; предпросмотр каждой своим рисунком', () => {
    expect([...CHART_KINDS]).toEqual(['line', 'bars', 'dots', 'lollipop'])
    const w = mount(ChartLinePicker)
    expect(w.findAll('[data-testid^="kind-"][data-active]')).toHaveLength(4)
    for (const label of ['Линия', 'Столбцы', 'Точки', 'Леденцы']) expect(w.text()).toContain(label)
    expect(w.find('[data-testid="kind-dots"] svg').findAll('circle')).toHaveLength(6)
    expect(w.find('[data-testid="kind-dots"] svg').findAll('line')).toHaveLength(0)
    expect(w.find('[data-testid="kind-lollipop"] svg').findAll('circle')).toHaveLength(6)
    expect(w.find('[data-testid="kind-lollipop"] svg').findAll('line')).toHaveLength(7) // 6 стеблей + нулевая линия
    localStorage.setItem('site_lang', 'en')
    const en = mount(ChartLinePicker)
    for (const label of ['Dots', 'Lollipops']) expect(en.text()).toContain(label)
  })

  it.each(['dots', 'lollipop'] as const)('«Выбрать» для «%s» пишет chart_kind и не трогает остальные настройки графиков', async (k) => {
    const w = mount(ChartLinePicker)
    await w.find(`[data-testid="kind-${k}"] [data-testid="kind-choose"]`).trigger('click')
    expect(localStorage.getItem('chart_kind')).toBe(k)
    expect(readChartKind()).toBe(k)
    expect(w.find(`[data-testid="kind-${k}"]`).attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="kind-line"]').attributes('data-active')).toBe('false')
    for (const key of ['chart_line', 'chart_marker', 'chart_anim', 'chart_forecast']) expect(localStorage.getItem(key), key).toBeNull()
  })

  it('подсказка раздела объясняет новые виды и что у них нет стилей линии и прогноза', () => {
    const txt = mount(ChartLinePicker).text()
    expect(txt).toContain('Точки — только маркеры')
    expect(txt).toContain('Леденцы — тонкий стебель от нуля')
    expect(txt).toContain('У столбцов, точек и леденцов нет стилей линии и прогноза')
  })

  it('КОПИЯ chartLine.ts в web-dashboard совпадает с этой (страж)', async () => {
    expect(await readSrc('../../web-dashboard/src/lib/chartLine.ts')).toBe(await readSrc('./lib/chartLine.ts'))
  })
})
