// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в themes.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 61.5: в теме «Бизнес-стекло» липкая шапка (`.sticky`, inline-фон `var(--bg-card)`) получала `backdrop-filter` от стеклянного правила, а
// `backdrop-filter` делает элемент контейнером для `position: fixed` потомков. В шапке лежат правая панель (`.gh-panel`) и слой `.gh-pf-layer`,
// поэтому панель вместо всего экрана занимала высоту шапки (60 px) — «правый блок не работает». Шапку из стекла исключаем (`:not(.sticky)`).
// Источник правды — scripts/themes_data.py; здесь проверяем результат раскатки во всех пилотах и в корневом style.css.
const read = (path: string): string => readFileSync(path, 'utf-8')
const files: string[] = [
  ...readdirSync('..')
    .filter((d: string) => d.startsWith('web-') && existsSync(`../${d}/src/style.css`))
    .map((d: string) => `../${d}/src/style.css`),
  '../style.css',
]

/** Все правила `html.theme-glass … { … backdrop-filter … }` как пары «селектор → тело». */
function glassBackdropRules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = []
  for (const m of css.matchAll(/([^{}\n]*html\.theme-glass[^{}]*)\{([^{}]*backdrop-filter[^{}]*)\}/g)) out.push({ selector: m[1].trim(), body: m[2] })
  return out
}

describe('Бизнес-стекло: backdrop-filter не запирает fixed-слои шапки (61.5)', () => {
  it('нашлись файлы стилей (сборка стража не пустая)', () => {
    expect(files.length).toBeGreaterThanOrEqual(15)
  })

  for (const f of files) {
    it(`${f}: стекло есть, но шапка (.sticky) исключена`, () => {
      const rules = glassBackdropRules(read(f)).filter((r) => /blur-glass/.test(r.body))
      expect(rules.length, 'правило стекла не найдено').toBeGreaterThan(0)
      for (const r of rules) {
        // каждый селектор по inline-фону обязан исключать шапку
        for (const sel of r.selector.split(',').map((s) => s.trim())) {
          if (sel.includes('[style*="var(--bg-card)"]')) expect(sel, sel).toContain(':not(.sticky)')
        }
        // и никакое стеклянное правило не вешает фильтр на шапку напрямую
        expect(r.selector).not.toMatch(/\.sticky(?!\))/)
      }
    })
  }
})
