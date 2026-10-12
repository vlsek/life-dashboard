import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'

// «Страж» (BACKLOG 576, аудит оформления): собственный класс `ring` у SVG-кольца совпал с утилитой Tailwind `ring` и рисовал вокруг кольца чёрную
// рамку (box-shadow 0 0 0 1px) — нашли скриншотом страницы «Языки». Класс-«одиночка» из имён утилит Tailwind в разметке компонентов запрещён.
const ROOT = '..'
const FORBIDDEN = ['ring', 'shadow', 'border', 'outline', 'blur', 'filter', 'transition', 'container', 'grid', 'flex', 'hidden', 'invisible', 'visible', 'static', 'fixed', 'absolute', 'relative', 'sticky', 'truncate', 'underline', 'italic', 'uppercase', 'lowercase', 'capitalize', 'rounded', 'transform']
function vueFiles(dir: string): string[] {
  const out: string[] = []
  for (const n of readdirSync(dir) as string[]) {
    const p = `${dir}/${n}`
    if (statSync(p).isDirectory()) out.push(...vueFiles(p))
    else if (n.endsWith('.vue')) out.push(p)
  }
  return out
}
// классы, которые разметка объявляет СВОИМИ: в scoped/обычных <style> блоках компонента (.name {...}) — если имя совпало с утилитой Tailwind, это ловушка
describe('свои классы не совпадают с утилитами Tailwind', () => {
  const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && existsSync(`${ROOT}/${d}/src`))
  it('в <style> компонентов нет селекторов вида .ring / .shadow / .border … (имя утилиты Tailwind)', () => {
    const bad: string[] = []
    for (const d of pilots) {
      for (const f of vueFiles(`${ROOT}/${d}/src`)) {
        const src = readFileSync(f, 'utf-8') as string
        for (const st of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
          for (const m of st[1].matchAll(/(?:^|[\s,}>+~])\.([a-z][a-z0-9-]*)\s*(?=[{,:.\[\s>+~])/g)) {
            if (FORBIDDEN.includes(m[1])) bad.push(`${f}: .${m[1]}`)
          }
        }
      }
    }
    expect(bad).toEqual([])
  })
  it('кольцо прогресса «Языков» и «Челленджей» не называется ring', () => {
    for (const d of ['web-languages', 'web-challenges']) {
      const s = readFileSync(`${ROOT}/${d}/src/components/ProgressRing.vue`, 'utf-8') as string
      expect(s, d).not.toMatch(/class="ring"/)
      expect(s, d).toContain('class="pct-ring"')
    }
  })
})
