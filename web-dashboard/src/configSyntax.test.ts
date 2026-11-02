// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts)
import { readFileSync } from 'node:fs'
// @ts-ignore — то же
import { resolve } from 'node:path'
// @ts-ignore — то же
import { Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет

// config.js грузится на КАЖДОЙ странице (версия, история обновлений): синтаксическая ошибка в нём ломает сайт целиком.
// Однажды слияние (`Merge origin/main; release v7.22/7.23`) потеряло закрывающие `]},` у записей 7.23 — и main был сломан несколько релизов.
const SRC = readFileSync(resolve(__dirname, '..', '..', 'config.js'), 'utf-8')

describe('config.js', () => {
  it('разбирается как JavaScript (синтаксис без запуска кода)', () => {
    expect(() => new Script(SRC, { filename: 'config.js' })).not.toThrow()
  })

  it('журналы обновлений RU и EN устроены одинаково: те же версии в том же порядке, у каждой записи закрыт список', () => {
    const grab = (name: string): string => {
      const i = SRC.indexOf(`const ${name} = [`)
      const j = SRC.indexOf('\n];', i)
      expect(i, name).toBeGreaterThan(0)
      expect(j, name).toBeGreaterThan(i)
      return SRC.slice(i, j)
    }
    const ru = grab('CHANGELOG_RU')
    const en = grab('CHANGELOG_EN')
    const versions = (s: string): string[] => [...s.matchAll(/\{ version: "([0-9.]+)"/g)].map((m) => m[1])
    expect(versions(ru)).toEqual(versions(en))
    // сколько записей открыто — столько и закрыто (`]},` на отдельной строке)
    expect((ru.match(/^    \]\},$/gm) || []).length).toBe(versions(ru).length)
    expect((en.match(/^    \]\},$/gm) || []).length).toBe(versions(en).length)
  })
})
