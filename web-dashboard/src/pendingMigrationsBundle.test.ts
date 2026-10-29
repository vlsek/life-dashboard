import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { execFileSync } from 'node:child_process'
// @ts-ignore
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
// @ts-ignore
import { tmpdir } from 'node:os'

// Сводный файл ожидающих миграций для владельца (scripts/build_pending_migrations.py → docs/pending_migrations_bundle.sql).
// Страж: каждая миграция, названная в «Ждёт владельца» («применить миграцию …»), ОБЯЗАНА быть в сводке; иначе владелец пропустит её.
// Красный тест = добавили миграцию в «Ждёт владельца», а сводку не пересобрали: `python3 scripts/build_pending_migrations.py` (при конфликте файла — тоже пересобрать).
const ROOT = '..'
const run = (): string => execFileSync('python3', ['scripts/build_pending_migrations.py', '--check'], { cwd: ROOT, encoding: 'utf-8' }) as string

describe('сводный файл ожидающих миграций', () => {
  const report: string = run()
  const bundle: string = readFileSync(`${ROOT}/docs/pending_migrations_bundle.sql`, 'utf-8')
  const names: string[] = report.split('\n').map((l: string) => /^ {2}(\d{3}_[\w-]+)/.exec(l)?.[1] ?? '').filter(Boolean)

  it('скрипт отрабатывает: все названные в «Ждёт владельца» файлы существуют (список может быть пустым — владелец применил всё)', () => {
    expect(report).toContain('В сводке:')
    if (names.length === 0) expect(bundle).toContain('ожидающих миграций нет')
  })

  it('каждая миграция из списка есть в сводном файле, и порядок — по номерам', () => {
    const inBundle = [...bundle.matchAll(/^-- ФАЙЛ: migrations\/(\S+)\.sql/gm)].map((m) => m[1])
    for (const n of names) expect(inBundle, `${n} нет в docs/pending_migrations_bundle.sql — перегенерируйте: python3 scripts/build_pending_migrations.py`).toContain(n)
    const sorted = [...inBundle].sort((a, b) => Number(a.slice(0, 3)) - Number(b.slice(0, 3)) || (a < b ? -1 : 1))
    expect(inBundle).toEqual(sorted)
  })

  it('в сводке нет psql-метакоманд и явных begin/commit (SQL Editor их не поймёт)', () => {
    const code = bundle.replace(/--[^\n]*/g, '')
    expect(code).not.toMatch(/^\s*\\\w/m)
    expect(code).not.toMatch(/^\s*(begin|commit)\s*;/im)
  })

  // «Базовая линия» (docs/sql-checks/migrations_applied_baseline.txt): владелец подтвердил применение по N включительно — миграции <= N в сводку не идут,
  // всё новее (из «Ждёт владельца» и все каталожные) — идёт. Проверяем на временных фикстурах, чтобы не зависеть от текущего репозитория.
  describe('базовая линия применённых миграций', () => {
    const fixture = (baseline: string | null, list: string[], files: Record<string, string>): string => {
      const dir: string = mkdtempSync(`${tmpdir()}/pmb-`)
      for (const d of ['scripts', 'migrations', 'docs/sql-checks']) mkdirSync(`${dir}/${d}`, { recursive: true })
      writeFileSync(`${dir}/scripts/build_pending_migrations.py`, readFileSync(`${ROOT}/scripts/build_pending_migrations.py`, 'utf-8'))
      if (baseline !== null) writeFileSync(`${dir}/docs/sql-checks/migrations_applied_baseline.txt`, `# тест\n${baseline}\n`)
      writeFileSync(`${dir}/COORDINATION.md`, `# x\n\n### Ждёт владельца\n${list.map((n) => `- [ ] Владельцу: применить миграцию \`migrations/${n}.sql\` (повтор безопасен)\n`).join('')}\n## Журнал\n- запись\n`)
      for (const [n, sql] of Object.entries(files)) writeFileSync(`${dir}/migrations/${n}.sql`, sql)
      execFileSync('python3', ['scripts/build_pending_migrations.py'], { cwd: dir, encoding: 'utf-8' })
      return readFileSync(`${dir}/docs/pending_migrations_bundle.sql`, 'utf-8') as string
    }
    const ins = (k: string) => `insert into customization_catalog (item_key) values ('${k}') on conflict (item_key) do update set item_key = excluded.item_key;`
    const files = { '109_a': 'select 109;', '110_b': 'select 110;', '111_c': 'select 111;', '112_catalog_x': ins('x'), '108_catalog_old': ins('old') }

    it('при базовой линии 110: миграция из списка с номером 111 идёт, 109 и 110 — нет; каталожная 112 идёт как страховка, каталожная 108 — нет', () => {
      const b = fixture('110', ['109_a', '110_b', '111_c'], files)
      expect(b).toContain('-- ФАЙЛ: migrations/111_c.sql')
      expect(b).toContain('-- ФАЙЛ: migrations/112_catalog_x.sql')
      for (const n of ['109_a', '110_b', '108_catalog_old']) expect(b, n).not.toContain(`migrations/${n}.sql`)
      expect(b).toContain('подтвердил применение по 110')
    })

    it('если всё применено: пустая сводка с безопасным select, а не пустой файл', () => {
      const b = fixture('112', ['109_a', '110_b', '111_c'], files)
      expect(b).not.toContain('-- ФАЙЛ:')
      expect(b).toContain("select 'ожидающих миграций нет (применено по 112)'")
    })

    it('без файла базовой линии (0) работает как раньше: берутся все пункты списка и все каталожные', () => {
      const b = fixture(null, ['109_a', '111_c'], files)
      for (const n of ['109_a', '111_c', '108_catalog_old', '112_catalog_x']) expect(b, n).toContain(`migrations/${n}.sql`)
    })
  })
})
