// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts)
import { execFileSync } from 'node:child_process'
// @ts-ignore — то же
import { readFileSync } from 'node:fs'
// @ts-ignore — то же
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет

// Маркеры слияния в исходниках (<<<<<<< / ======= / >>>>>>>) после `git stash pop` или неудачного rebase: однажды такой коммит уже ушёл на main
// (v6.76, web-dashboard/App.vue). Собранные бандлы проверяет builtBundlesSane.test.ts, а исходники — этот страж.
const ROOT = resolve(__dirname, '..', '..')
const TEXT = /\.(vue|ts|js|py|sql|md|json|html|css|sh)$/

describe('в отслеживаемых исходниках нет маркеров конфликта слияния', () => {
  it('ни одна строка не начинается с <<<<<<< или >>>>>>> (с пробелом и именем ветки/коммита)', () => {
    const files: string[] = String(execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })).split('\n').filter((f) => TEXT.test(f) && !f.includes('node_modules'))
    expect(files.length).toBeGreaterThan(100)
    const bad: string[] = []
    for (const f of files) {
      let s: string
      try {
        s = readFileSync(resolve(ROOT, f), 'utf-8')
      } catch {
        continue // файл удалён в рабочем дереве, но ещё в индексе
      }
      if (/^(<<<<<<< |>>>>>>> )\S/m.test(s)) bad.push(f)
    }
    expect(bad).toEqual([])
  })
})
