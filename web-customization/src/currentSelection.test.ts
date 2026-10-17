import { describe, expect, it } from 'vitest'

import { customCount, selectionRows, type SelectionReaders } from './lib/currentSelection'
import { groupCounts } from './lib/pageTabs'

const base: SelectionReaders = { theme: 'dark', selected: {}, splash: 'auto', streakFlame: 'flame', waterAnim: 'auto', bodyModel: null, chartMarker: 'flat', chart: { kind: 'line', line: 'line', anim: 'none', forecast: 'off', goalZone: 'off', sparks: 'off' } }
const byId = (rows: ReturnType<typeof selectionRows>, id: string) => rows.find((r) => (r.key ?? r.section) === id)!

describe('selectionRows (61.6 срез 1)', () => {
  it('по умолчанию всё «базовое»: ни одной подсвеченной строки', () => {
    const rows = selectionRows(base)
    expect(customCount(rows)).toBe(0)
    expect(byId(rows, 'avatar_frame').valueKey).toBe('cust_now_default')
    expect(byId(rows, 'splash').valueKey).toBe('cust_splash_auto')
  })

  it('выбранный предмет и свои значения помечаются и получают названия из словаря', () => {
    const rows = selectionRows({ ...base, theme: 'monet', selected: { avatar_frame: 'frame_neon' }, splash: 'orbit', bodyModel: 'chibi', chartMarker: 'glass', streakFlame: 'tongues', waterAnim: 'drops' })
    expect(byId(rows, 'themes')).toMatchObject({ valueKey: 'theme_monet', custom: true })
    expect(byId(rows, 'avatar_frame')).toMatchObject({ valueKey: 'cust_item_frame_neon', custom: true })
    expect(byId(rows, 'splash').valueKey).toBe('splash_variant_orbit')
    expect(byId(rows, 'bodymodel').valueKey).toBe('cust_body_chibi')
    expect(byId(rows, 'chart-markers').valueKey).toBe('chart_marker_glass')
    expect(byId(rows, 'streakflame').valueKey).toBe('cust_streakflame_tongues')
    expect(byId(rows, 'wateranim').valueKey).toBe('cust_wateranim_drops')
    expect(customCount(rows)).toBe(7)
  })

  it('у каждой строки есть раздел, заголовок и значение — все ключи есть в словаре RU и EN', async () => {
    const { t, setLang } = await import('./lib/i18n')
    const rows = selectionRows({ ...base, theme: 'monet', selected: { avatar_frame: 'frame_neon', water_glass: 'glass_mug' }, splash: 'orbit', bodyModel: 'stocky', waterAnim: 'wave' })
    for (const lang of ['ru', 'en'] as const) {
      setLang(lang)
      for (const r of rows) {
        expect(t(r.titleKey as never), `${lang} ${r.titleKey}`).not.toBe(r.titleKey)
        expect(t(r.valueKey as never), `${lang} ${r.valueKey}`).not.toBe(r.valueKey)
      }
    }
    setLang('ru')
  })
})

describe('строка «Линия графика» (61.6 срез 2)', () => {
  const chart = (o: Partial<SelectionReaders['chart']>) => byId(selectionRows({ ...base, chart: { ...base.chart, ...o } }), 'chart-line')
  it('по умолчанию — «Обычная», не подсвечена; раздел тот же, что у маркеров', () => {
    const r = chart({})
    expect(r).toMatchObject({ section: 'chart-markers', valueKey: 'chart_line_line', custom: false })
    expect(r.extraKeys).toEqual([])
  })
  it('стиль линии, столбцы и дополнения собираются в одну строку и подсвечиваются', () => {
    expect(chart({ line: 'area' })).toMatchObject({ valueKey: 'chart_line_area', custom: true })
    expect(chart({ kind: 'bars', line: 'area' }).valueKey).toBe('chart_kind_bars')
    expect(chart({ forecast: 'trend', goalZone: 'on', anim: 'draw' }).extraKeys).toEqual(['cust_now_chart_anim', 'cust_now_chart_forecast', 'cust_now_chart_goalzone'])
    expect(chart({ goalZone: 'on' }).custom).toBe(true)
    expect(chart({ sparks: 'on' })).toMatchObject({ extraKeys: ['cust_now_chart_sparks'], custom: true })
  })
})

describe('groupCounts (счётчики вкладок)', () => {
  it('суммирует «открыто/всего» по разделам группы', () => {
    const c = groupCounts([
      { id: 'themes', owned: 10, total: 35 },
      { id: 'avatar_frame', owned: 2, total: 19 },
      { id: 'splash', owned: 4, total: 4 },
    ])
    expect(c.look).toEqual({ owned: 12, total: 54 })
    expect(c.loading).toEqual({ owned: 4, total: 4 })
  })
})
