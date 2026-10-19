// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в tourTexts.test.ts)
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 935/49.5, блок B: пользователь не видит «примени миграцию NNN в Supabase (SQL editor)». Тексты — нейтральные («пока недоступно, попробуй позже»),
// техническая подсказка уходит разработчику в console.warn/error на месте показа. Исключения — служебные экраны владельца: админка.
const ROOT = '..'
const pilots: string[] = readdirSync(ROOT).filter((d: string) => d.startsWith('web-') && d !== 'web-admin')
const TECH = /миграц|migration|supabase|sql\b|\.sql/i

function dictValues(file: string): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = []
  for (const l of readFileSync(file, 'utf-8').split('\n')) {
    const m = /^\s*['"]?([\w.]+)['"]?\s*:\s*(['"])(.*)\2,?\s*$/.exec(l)
    if (m) out.push({ key: m[1], text: m[3] })
  }
  return out
}
const read = (f: string): string => readFileSync(`${ROOT}/${f}`, 'utf-8')

describe('техподсказки про миграции — только в консоли, не в интерфейсе', () => {
  for (const p of pilots) {
    it(`${p}: в словарях нет «миграции», Supabase и SQL`, () => {
      const bad = dictValues(`${ROOT}/${p}/src/lib/i18n.ts`).filter(({ key, text }) => TECH.test(text) && !key.startsWith('admin_')).map((x) => x.key)
      expect(bad).toEqual([])
    })
  }
  const SITES: [string, RegExp][] = [
    ['web-dashboard/src/lib/useMetricsManager.ts', /console\.warn\([^)]*миграци/],
    ['web-dashboard/src/lib/useCharts.ts', /console\.warn\([^)]*004_leaderboard_privacy/],
    ['web-dashboard/src/components/PlannedNewGoalModal.vue', /console\.warn\([^)]*086/],
    ['web-goals/src/components/GoalForm.vue', /console\.warn\([^)]*086/],
    ['web-languages/src/App.vue', /console\.warn\([^)]*024/],
    ['web-milestones/src/App.vue', /console\.warn\([^)]*022/],
    ['web-workouts/src/App.vue', /console\.warn\([^)]*013_workouts|console\.warn\([^)]*миграци/],
    ['web-workouts/src/components/MetricLinkModal.vue', /console\.warn\([^)]*054/],
    ['web-challenges/src/App.vue', /console\.warn\([^)]*019_challenges/],
    ['web-achievements/src/lib/useAchievements.ts', /console\.warn\([^)]*039/],
    ['web-customization/src/lib/useCustomization.ts', /console\.error\([^)]*048/],
  ]
  for (const [file, re] of SITES) it(`${file}: подсказка про миграцию — в консоль`, () => expect(read(file)).toMatch(re))
})
