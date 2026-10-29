// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts)
import { readdirSync, readFileSync, statSync } from 'node:fs'
// @ts-ignore — то же
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// BACKLOG 74.3: ошибка загрузки показывается через LoadError.vue («Повторить», role=alert), а не серым <p> без повтора.
// Страж читает исходники всех пилотов. ALLOW — места, где серый текст оставлен сознательно (после среза 2 — пусто: исключения добавлять только с причиной).
declare const __dirname: string // есть в vitest (node); типов node в проекте нет
const ROOT = resolve(__dirname, '..', '..')
const PILOTS_DONE = ['web-shop', 'web-goals', 'web-skills', 'web-achievements', 'web-milestones', 'web-challenges', 'web-dashboard', 'web-community']
const ALLOW: string[] = []

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n: string) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? (n === 'node_modules' ? [] : vueFiles(p)) : p.endsWith('.vue') ? [p] : []
  })
}
const rel = (p: string) => p.slice(ROOT.length + 1).split('\\').join('/')

describe('ошибки загрузки: «Повторить» везде', () => {
  const files: string[] = readdirSync(ROOT).filter((n: string) => n.startsWith('web-') && statSync(join(ROOT, n, 'src')).isDirectory()).flatMap((n: string) => vueFiles(join(ROOT, n, 'src')))

  it('голый <p …>{{ t(\'comm_load_error\') }}…</p> остаётся только там, где его сознательно оставили (ALLOW)', () => {
    const bare = files.filter((f: string) => !f.endsWith('/LoadError.vue') && /<p [^>]*>\s*\{\{\s*t\('comm_load_error'\)\s*\}\}/.test(readFileSync(f, 'utf-8'))).map(rel).sort()
    expect(bare).toEqual([...ALLOW].sort())
  })

  it('пилоты из PILOTS_DONE используют LoadError с retry; в ALLOW нет пилотов из PILOTS_DONE', () => {
    for (const p of PILOTS_DONE) {
      const app = readFileSync(join(ROOT, p, 'src', 'App.vue'), 'utf-8')
      expect(app, p).toMatch(/<LoadError [^>]*:retry="\w+"/)
      expect(ALLOW.some((a) => a.startsWith(p + '/')), p).toBe(false)
    }
  })

  it('LoadError.vue во всех пилотах одинаков (правим только через scripts/apply_load_error.py)', () => {
    const copies = PILOTS_DONE.map((p) => readFileSync(join(ROOT, p, 'src', 'components', 'LoadError.vue'), 'utf-8'))
    for (const c of copies) expect(c).toBe(copies[0])
    expect(copies[0]).toContain('role="alert"')
    expect(copies[0]).toContain('data-testid="load-retry"')
    expect(copies[0]).toContain('min-h-11') // цель нажатия не меньше 44 px
  })

  it('ключи load_retry и load_offline есть на двух языках в каждом пилоте', () => {
    for (const p of PILOTS_DONE) {
      const s = readFileSync(join(ROOT, p, 'src', 'lib', 'i18n.ts'), 'utf-8')
      expect((s.match(/load_retry:/g) || []).length, p).toBe(2)
      expect((s.match(/load_offline:/g) || []).length, p).toBe(2)
    }
  })
})
