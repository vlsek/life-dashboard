import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readdirSync, readFileSync } from 'node:fs'

// Владелец 2026-10-10: «давай уберём отовсюду надпись пилот, уже давно не пилот». Заголовки вкладок всех страниц — без слова «пилот».
const root = '..' // тесты запускаются из каталога пилота (web-goals/)

describe('заголовки вкладок', () => {
  it('ни в одной странице нет слова «пилот» / pilot', () => {
    const dirs = (readdirSync(root) as string[]).filter((d: string) => d.startsWith('web-'))
    expect(dirs.length).toBeGreaterThan(10)
    for (const d of dirs) {
      let html = ''
      try {
        html = readFileSync(`${root}/${d}/index.html`, 'utf8') as string
      } catch {
        continue
      }
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
      expect(title, d).not.toMatch(/пилот|pilot/i)
    }
  })
})
