// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в designTokens.test.ts)
import { execSync } from 'node:child_process'
// @ts-ignore — то же
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
// @ts-ignore — то же
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

// Авария 21–23.10.2026: мой коммит «WIP rebuilt on merged sources» (разрешение конфликта при ребейзе) выложил бандлы account и community с маркерами конфликта слияния
// (строки `<<<<<<<< HEAD:…`, `========`, `>>>>>>>> …` внутри JS) → обе страницы были пустыми у всех пользователей около двух суток (до релиза 23.10 05:39), а ни один тест этого не видел
// (проверяли маркеры только в index.html). Этот страж смотрит ВСЕ собранные файлы и пишет, какой именно сломан.
// Полная проверка в браузере — scripts/pwa_offline_check.py (открывает каждую страницу без сети и ловит ошибки JS).
const ROOT = '..'
// git ставит маркеры из 7 символов, а при конфликте двух версий переименованного хэш-файла (там, где в самом файле уже есть похожие строки)
// — из 8 и больше (`<<<<<<<< HEAD:…`, `========`, `>>>>>>>> …`): именно так выглядела авария 21–23.10. Поэтому «7–8», а не «ровно 7» (длинные разделители из `=` в docs/HANDOFF.md — не маркеры).
const MARKER = /^(<{7,8} |>{7,8} |={7,8}$)/m

function outDirs(): string[] {
  const dirs: string[] = []
  for (const d of readdirSync(ROOT) as string[]) {
    if (!d.startsWith('web-')) continue
    let cfg = ''
    try { cfg = readFileSync(`${ROOT}/${d}/vite.config.ts`, 'utf-8') } catch { continue }
    const m = cfg.match(/outDir:\s*'\.\.\/([^']+)'/)
    if (m && existsSync(`${ROOT}/${m[1]}`)) dirs.push(m[1])
  }
  return dirs
}
function files(dir: string): string[] {
  const out: string[] = []
  const walk = (rel: string) => {
    for (const e of readdirSync(`${ROOT}/${rel}`, { withFileTypes: true }) as { name: string; isDirectory: () => boolean }[]) {
      const p = `${rel}/${e.name}`
      if (e.isDirectory()) walk(p)
      else if (/\.(js|css|html|json|svg)$/.test(e.name)) out.push(p)
    }
  }
  walk(dir)
  return out
}

describe('собранные файлы целы (нет маркеров конфликта, JS разбирается)', () => {
  it('в собранных папках пилотов и корневых файлах нет маркеров конфликта слияния', () => {
    const bad: string[] = []
    const candidates = [...outDirs().flatMap(files), 'sw.js', 'sw-assets.js', 'config.js', 'version.json', 'COORDINATION.md', 'docs/BACKLOG.md', 'docs/ROADMAP.md', 'docs/HANDOFF.md']
    for (const f of candidates) {
      if (!existsSync(`${ROOT}/${f}`)) continue
      if (MARKER.test(readFileSync(`${ROOT}/${f}`, 'utf-8'))) bad.push(f)
    }
    expect(bad, 'файлы с маркерами конфликта (пересоберите пилот из слитых исходников, а не коммитьте как есть)').toEqual([])
  })
  it('главный бандл каждой страницы и /header-widgets/header.js — корректный ES-модуль (node --check)', () => {
    const tmp = mkdtempSync(`${tmpdir()}/ld-bundles-`)
    const bad: string[] = []
    let checked = 0
    const check = (rel: string) => {
      const dst = `${tmp}/b${checked++}.mjs`
      copyFileSync(`${ROOT}/${rel}`, dst)
      try { execSync(`node --check ${dst}`, { stdio: 'pipe' }) } catch (e) { bad.push(`${rel}: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n').slice(0, 3).join(' ')}`) }
    }
    for (const d of outDirs()) {
      if (!existsSync(`${ROOT}/${d}/index.html`)) continue
      const html = readFileSync(`${ROOT}/${d}/index.html`, 'utf-8')
      for (const m of html.matchAll(/(?:src)="\/(?:[^"]*assets\/[^"]+\.js)"/g)) check(m[0].slice(5, -1).replace(/^\//, ''))
    }
    check('header-widgets/header.js')
    expect(checked).toBeGreaterThanOrEqual(18)
    expect(bad).toEqual([])
  })
  it('version.json — корректный JSON с версией и min_supported', () => {
    const data = JSON.parse(readFileSync(`${ROOT}/version.json`, 'utf-8')) as { version: string; min_supported: string }
    expect(data.version).toMatch(/^\d+\.\d{2}$/)
    expect(data.min_supported).toMatch(/^\d+\.\d{2}$/)
  })
})
