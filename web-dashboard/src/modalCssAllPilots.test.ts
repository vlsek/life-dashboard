import { describe, expect, it } from 'vitest'
// @ts-ignore — node-модули нужны только тесту (vue-tsc сборки их типов не знает)
import { existsSync, readFileSync, readdirSync } from 'node:fs'
// @ts-ignore
import { join } from 'node:path'
declare const __dirname: string

// «Журнал изменений» («Что нового») открывался на части страниц не окном, а как будто новой страницей: в style.css четырёх пилотов
// (account, history, languages, workouts) не было правил `.modal-backdrop` / `.modal`. Страж: если в пилоте есть компонент с этими классами —
// в его style.css обязаны быть фиксированная подложка и сама карточка окна.
const root = join(__dirname, '..', '..')
const pilots: string[] = readdirSync(root).filter((d: string) => d.startsWith('web-') && existsSync(join(root, d, 'src', 'style.css')))

function usesModalClasses(dir: string): boolean {
  const comps = join(dir, 'src', 'components')
  if (!existsSync(comps)) return false
  return readdirSync(comps).some((f: string) => f.endsWith('.vue') && /class="modal(-backdrop)?"/.test(readFileSync(join(comps, f), 'utf-8')))
}
function rule(css: string, selector: string): string {
  const m = css.match(new RegExp('(^|\\n)' + selector.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}'))
  return m ? m[2] : ''
}

describe('окна .modal-backdrop/.modal описаны в style.css каждого пилота, который их использует', () => {
  it('пилоты найдены', () => expect(pilots.length).toBeGreaterThan(10))
  for (const p of pilots) {
    const dir = join(root, p)
    if (!usesModalClasses(dir)) continue
    it(p, () => {
      const css = readFileSync(join(dir, 'src', 'style.css'), 'utf-8')
      const back = rule(css, '.modal-backdrop')
      expect(back, 'нет .modal-backdrop').toMatch(/position:\s*fixed/)
      expect(back).toMatch(/inset:\s*0|top:\s*0/)
      expect(rule(css, '.modal'), 'нет .modal').toMatch(/max-width/)
    })
  }
})
