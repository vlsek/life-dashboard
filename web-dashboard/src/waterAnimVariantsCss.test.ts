import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { readFileSync } from 'node:fs'

// «Страж» (BACKLOG 59.4): у КАЖДОГО платного вида анимации воды есть CSS в трёх местах — шапка (`web-header/src/header.css`) и компонент
// `WaterSavedAnim.vue` в Дашборде и в «Кастомизации» (превью) — и свои ключевые кадры `water-saved-<вид>`. Иначе предмет можно купить и
// выбрать, а анимации не будет (или превью покажет не то, что играет в шапке). Реестр видов — `PAID_WATER_ANIMS` в `lib/waterAnim.ts`.
const ROOT = '..'
const read = (p: string): string => readFileSync(`${ROOT}/${p}`, 'utf-8')

const registry = read('web-dashboard/src/lib/waterAnim.ts')
const variants: string[] = [...((/PAID_WATER_ANIMS = \[([^\]]*)\]/.exec(registry)?.[1] ?? '').matchAll(/'(\w+)'/g) as Iterable<RegExpMatchArray>)].map((m) => m[1])
const targets: Record<string, string> = {
  'шапка (header.css)': 'web-header/src/header.css',
  'Дашборд (WaterSavedAnim.vue)': 'web-dashboard/src/components/WaterSavedAnim.vue',
  'Кастомизация (WaterSavedAnim.vue)': 'web-customization/src/components/WaterSavedAnim.vue',
}

// Имя @keyframes равно виду, кроме исторического «sparkle» → water-saved-spark.
const keyframesName = (v: string): string => `water-saved-${v === 'sparkle' ? 'spark' : v}`

describe('виды анимации воды: CSS есть везде', () => {
  it('реестр видов прочитан и содержит новые «Прыжок» и «Пульс»', () => {
    expect(variants.length).toBeGreaterThanOrEqual(7)
    expect(variants).toContain('bounce')
    expect(variants).toContain('pulse')
  })

  for (const [name, path] of Object.entries(targets)) {
    it(`${name}: правило data-variant и @keyframes у каждого вида`, () => {
      const css = read(path)
      for (const v of variants) {
        expect(css, `${path}: нет правила для вида «${v}»`).toMatch(new RegExp(`data-variant=['"]${v}['"]`))
        expect(css, `${path}: нет @keyframes ${keyframesName(v)}`).toContain(`@keyframes ${keyframesName(v)} {`)
      }
    })
  }

  it('копии реестра lib/waterAnim.ts одинаковы в трёх пилотах', () => {
    const a = read('web-dashboard/src/lib/waterAnim.ts')
    expect(read('web-header/src/lib/waterAnim.ts')).toBe(a)
    expect(read('web-customization/src/lib/waterAnim.ts')).toBe(a)
  })
})
