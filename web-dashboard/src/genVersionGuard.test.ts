// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в sharedFilesInvariants.test.ts)
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
// @ts-ignore — то же
import { execFileSync } from 'node:child_process'
// @ts-ignore — то же
import { join, resolve } from 'node:path'
// @ts-ignore — то же
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет
declare const process: { env: Record<string, string | undefined> }

// scripts/gen_version_json.py запускает каждый агент в каждом релизе: он обязан падать на сломанном config.js
// (на слиянии у записи журнала трижды терялся закрывающий `]},` — v7.07, v7.23, v7.35), а не писать version.json из обломков.
const ROOT = resolve(__dirname, '..', '..')
const CFG = readFileSync(resolve(ROOT, 'config.js'), 'utf-8')

function run(config: string): { ok: boolean; out: string } {
  const dir = mkdtempSync(join(tmpdir(), 'gvj-'))
  writeFileSync(join(dir, 'config.js'), config, 'utf-8')
  try {
    const out = execFileSync('python3', [resolve(ROOT, 'scripts', 'gen_version_json.py')], { env: { ...process.env, GEN_VERSION_ROOT: dir }, encoding: 'utf-8', stdio: 'pipe' })
    return { ok: true, out: String(out) + readFileSync(join(dir, 'version.json'), 'utf-8').slice(0, 40) }
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string }
    return { ok: false, out: String(err.stderr || err.stdout || err.message) }
  }
}

describe('gen_version_json.py: защита от поломки config.js', () => {
  it('целый config.js проходит и пишет version.json (в подменённую папку, не в репозиторий)', () => {
    const r = run(CFG)
    expect(r.ok).toBe(true)
    expect(r.out).toContain('"version"')
  })
  it('потерянный закрывающий `]},` у записи журнала — отказ с понятным сообщением', () => {
    const i = CFG.indexOf('const CHANGELOG_RU = [')
    const j = CFG.indexOf('\n    ]},', i)
    const broken = CFG.slice(0, j) + CFG.slice(j + '\n    ]},'.length)
    const r = run(broken)
    expect(r.ok).toBe(false)
    expect(r.out).toContain('config.js')
  })
  it('синтаксис верный, но запись не разбирается (ключи в другом порядке) — отказ «объявлено/разобрано»', () => {
    const marker = 'const CHANGELOG_RU = ['
    const odd = "\n    { version: '9.99', changes: [\"x\"], date: '2026-01-01 00:00' },"
    const r = run(CFG.replace(marker, marker + odd))
    expect(r.ok).toBe(false)
    expect(r.out).toMatch(/объявлено записей/)
  })
})
