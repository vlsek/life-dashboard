// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в tourTexts.test.ts)
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 935/49.5, заход 2 (владелец одобрил docs/TEXT_SHORTENING.md): подсказки Дашборда, воды и шапки короче и на «ты».
// Страж: каждая строка существует в RU и EN, укладывается в лимит, без «вы»-форм; тексты воды в Дашборде и шапке — копии (совпадают); плейсхолдеры целы.
const read = (f: string): string => readFileSync(`../${f}`, 'utf-8')
const FILES = { dash: 'web-dashboard/src/lib/i18n.ts', head: 'web-header/src/lib/i18n.ts' }
const SRC = { dash: read(FILES.dash), head: read(FILES.head) }

// ключ → в каких словарях живёт, максимум знаков в RU (предложение из списка + запас на «Пусто — как раньше.» у п. 3)
const KEYS: Record<string, { in: ('dash' | 'head')[]; max: number }> = {
  dash_metric_planned_sets_hint: { in: ['dash'], max: 290 },
  dash_water_info_auto_body: { in: ['dash', 'head'], max: 165 },
  dash_water_info_manual: { in: ['dash', 'head'], max: 165 },
  dash_water_info_auto_weight: { in: ['dash', 'head'], max: 150 },
  dash_water_info_food: { in: ['dash', 'head'], max: 105 },
  dash_widget_lang_hint: { in: ['dash'], max: 120 },
  dash_charts_period_hint: { in: ['dash'], max: 100 },
  plan_notify_hint: { in: ['dash'], max: 105 },
  motion_off_setting_hint: { in: ['head'], max: 110 },
  water_reminders_setting_hint: { in: ['head'], max: 105 },
  records_setting_metrics_hint: { in: ['dash'], max: 90 },
  dash_points_skills_note: { in: ['dash'], max: 95 },
  dash_reorder_hint: { in: ['dash'], max: 105 },
  dash_planned_done_already_title: { in: ['dash'], max: 105 },
}

// значения по порядку в файле: сначала EN-словарь, затем RU (так устроены все словари пилотов)
function values(src: string, key: string): string[] {
  const re = new RegExp(`^\\s+${key}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"),\\s*$`, 'gm')
  const out: string[] = []
  for (const m of src.matchAll(re)) out.push((m[1] ?? m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"'))
  return out
}

describe('сокращение текстов, заход 2: Дашборд, вода, шапка', () => {
  for (const [key, spec] of Object.entries(KEYS)) {
    it(`${key}: есть RU и EN, RU ≤ ${spec.max} знаков, на «ты»`, () => {
      for (const d of spec.in) {
        const v = values(SRC[d], key)
        expect(v, `${d}: ожидаем пару EN+RU`).toHaveLength(2)
        const [en, ru] = v
        expect(en.length).toBeGreaterThan(20)
        expect(ru.length, `${d} RU: ${ru.length}`).toBeLessThanOrEqual(spec.max)
        expect(ru).not.toMatch(/(^|[^а-яё])(вы|вам|вас|ваш[а-яё]*|нажмите|укажите|перетащите|включите|используйте)([^а-яё]|$)/i)
      }
    })
  }
  it('тексты воды в Дашборде и шапке — копии: совпадают дословно (RU и EN)', () => {
    for (const k of ['dash_water_info_auto_body', 'dash_water_info_manual', 'dash_water_info_auto_weight', 'dash_water_info_food']) {
      expect(values(SRC.head, k), k).toEqual(values(SRC.dash, k))
    }
  })
  it('плейсхолдеры расчёта нормы целы: вес, рост, площадь, итог — в RU и EN', () => {
    for (const d of ['dash', 'head'] as const) {
      for (const v of values(SRC[d], 'dash_water_info_auto_body')) for (const p of ['{weight}', '{height}', '{bsa}', '{norm}']) expect(v).toContain(p)
      for (const v of values(SRC[d], 'dash_water_info_auto_weight')) for (const p of ['{weight}', '{norm}']) expect(v).toContain(p)
    }
  })
  it('мысль про «20% воды из еды» осталась один раз в расчёте нормы, а не повторяется в каждом окне (находка E)', () => {
    const ru = values(SRC.dash, 'dash_water_info_food')[1]
    expect(ru).not.toMatch(/20\s?%/)
  })
})
