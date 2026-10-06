import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в calendarSwipe.test.ts).
import { readFileSync } from 'node:fs'

// v3.42: «История» живёт внутри календаря, и сборка календаря не должна импортировать соседний пилот (web-history/), поэтому код истории СКОПИРОВАН
// в календарь с переименованием модулей (`stats` → `historyStats` и т. д.). Оригиналы остались в web-history/ вместе со своими тестами (статистика дня,
// метрики, цель по воде), у копий тестов нет — эта сверка гарантирует, что копия равна проверенному оригиналу. Менять ВМЕСТЕ.
const read = (p: string): string => readFileSync(p, 'utf-8')

// Оригинал → копия, после замены путей импортов на переименованные.
const RENAMES: [string, string][] = [
  ["'./types'", "'./historyTypes'"],
  ["'./stats'", "'./historyStats'"],
  ["'./metrics'", "'./historyMetrics'"],
  ["'./waterGoal'", "'./historyWaterGoal'"],
  ["'./errMsg'", "'./historyErrMsg'"],
  ["'../lib/types'", "'../lib/historyTypes'"],
  ["'../lib/stats'", "'../lib/historyStats'"],
  ["'../lib/metrics'", "'../lib/historyMetrics'"],
]
const renamed = (src: string): string => RENAMES.reduce((s, [from, to]) => s.split(from).join(to), src)

const LIB: [string, string][] = [
  ['errMsg.ts', 'historyErrMsg.ts'],
  ['metrics.ts', 'historyMetrics.ts'],
  ['stats.ts', 'historyStats.ts'],
  ['types.ts', 'historyTypes.ts'],
  ['waterGoal.ts', 'historyWaterGoal.ts'],
  ['useHistoryData.ts', 'useHistoryData.ts'],
]
const COMPONENTS = ['DayDetailModal.vue', 'MetricIcon.vue']

describe('копия кода истории в календаре совпадает с оригиналом в web-history', () => {
  it.each(LIB)('lib/%s → lib/%s', (orig: string, copy: string) => {
    expect(read(`src/lib/${copy}`)).toBe(renamed(read(`../web-history/src/lib/${orig}`)))
  })
  it.each(COMPONENTS)('components/%s', (name: string) => {
    expect(read(`src/components/${name}`)).toBe(renamed(read(`../web-history/src/components/${name}`)))
  })
})
