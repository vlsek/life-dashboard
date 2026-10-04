import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'

// «Страж» (BACKLOG 567, «Аудит устаревшего оформления»): нативные окна браузера confirm()/alert()/prompt() выглядят «из 2000-х»
// и ломают тему. Вместо них — `confirmDialog` из lib/confirmDialog.ts (окно рисует ConfirmDialogHost в AppShell).
// Пилоты из списка ниже ЕЩЁ содержат нативные вызовы — у каждого указано, почему; тест проверяет и это: когда вызов уберут,
// пилот надо ВЫНЕСТИ из списка (иначе тест подскажет), а новый нативный вызов в любом другом пилоте — падение.
const ROOT = '..'
const KNOWN: Record<string, string> = {
  'web-dashboard': 'prompt() «своё количество воды» в WaterModal — вместе с окном воды (поле ввода в окне вместо prompt)',
  'web-header': 'prompt() «своё количество воды» в WaterModal шапки — то же, отдельный бандл виджетов',
}
const CALL = /(?<![\w.])(confirm|alert|prompt)\(/

function files(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir) as string[]) {
    const p = `${dir}/${name}`
    if (statSync(p).isDirectory()) out.push(...files(p))
    else if (/\.(vue|ts)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p)
  }
  return out
}
function nativeCalls(pilot: string): string[] {
  const hits: string[] = []
  for (const f of files(`${ROOT}/${pilot}/src`)) {
    ;(readFileSync(f, 'utf-8') as string).split('\n').forEach((line: string, i: number) => {
      const t = line.trim()
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
      if (CALL.test(line)) hits.push(`${f}:${i + 1}: ${t}`)
    })
  }
  return hits
}

const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && existsSync(`${ROOT}/${d}/src`))

describe('нативные confirm()/alert()/prompt() не используются', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots.filter((p: string) => !(p in KNOWN))) {
    it(`${pilot}: нативных окон браузера нет`, () => {
      expect(nativeCalls(pilot), 'используйте confirmDialog из lib/confirmDialog.ts').toEqual([])
    })
  }

  for (const [pilot, why] of Object.entries(KNOWN)) {
    it(`${pilot}: известное исключение всё ещё актуально (${why})`, () => {
      expect(nativeCalls(pilot).length, `в ${pilot} нативных вызовов больше нет — уберите его из KNOWN`).toBeGreaterThan(0)
    })
  }
})
