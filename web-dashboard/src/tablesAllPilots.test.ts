import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'

// «Страж» (BACKLOG 567, таблицы на телефоне): каждая <table> в .vue любой страницы пилота лежит в обёртке с
// `overflow-x-auto` (в пределах 3 строк выше) — широкая таблица скроллится внутри себя, а не раздвигает страницу.
const ROOT = '..'
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && existsSync(`${ROOT}/${d}/src`))

function vueFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir) as string[]) {
    const p = `${dir}/${name}`
    if (statSync(p).isDirectory()) out.push(...vueFiles(p))
    else if (name.endsWith('.vue')) out.push(p)
  }
  return out
}

describe('таблицы во всех пилотах скроллятся внутри обёртки', () => {
  const tables: { file: string; line: number; ok: boolean }[] = []
  for (const d of pilots) {
    for (const f of vueFiles(`${ROOT}/${d}/src`)) {
      const lines = (readFileSync(f, 'utf-8') as string).split('\n')
      lines.forEach((l: string, i: number) => {
        if (/<table\b/.test(l)) {
          const above = lines.slice(Math.max(0, i - 3), i + 1).join('\n')
          tables.push({ file: f, line: i + 1, ok: /overflow-x-auto/.test(above) })
        }
      })
    }
  }
  it('таблицы найдены (не пустой обход)', () => {
    expect(tables.length).toBeGreaterThanOrEqual(16)
  })
  it('у каждой <table> есть обёртка overflow-x-auto', () => {
    const bad = tables.filter((t) => !t.ok).map((t) => `${t.file}:${t.line}`)
    expect(bad).toEqual([])
  })
})
