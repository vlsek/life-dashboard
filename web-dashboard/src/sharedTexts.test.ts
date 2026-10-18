// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в designTokens.test.ts)
import { execSync } from 'node:child_process'
// @ts-ignore — то же
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 935/49.5 (одобрено владельцем 2026-10-17): тексты короче и на «ты». Они лежат в scripts/apply_texts.py (тур и подсказки), оттуда
// раскатываются в словарь каждого пилота, где есть ключ. Правка руками в одном словаре разводит копии — тест это ловит.
const run = (cmd: string) => execSync(cmd, { cwd: '..', encoding: 'utf-8' })
const BY_KEY = JSON.parse(run(`python3 -c "import json,sys; sys.path.insert(0,'scripts'); import apply_texts as a; print(json.dumps(a.BY_KEY, ensure_ascii=False))"`)) as Record<string, { ru: string; en: string }>
const KEYS = Object.keys(BY_KEY)
const TOUR = KEYS.filter((k) => /^tour_[1-7]_text$/.test(k))

describe('общие тексты: один источник', () => {
  it('apply_texts.py идемпотентен: копии во всех пилотах совпадают с эталоном', () => {
    expect(run('python3 scripts/apply_texts.py --check')).toContain('изменено файлов: 0')
  })
  it('тур есть в словарях всех пилотов, где он нужен (не меньше 15), по 7 шагов на язык', () => {
    expect(TOUR).toHaveLength(7)
    const dirs = (readdirSync('..') as string[]).filter((d: string) => d.startsWith('web-'))
    let withTour = 0
    for (const d of dirs) {
      let src = ''
      try { src = readFileSync(`../${d}/src/lib/i18n.ts`, 'utf-8') } catch { continue }
      const n = (src.match(/^\s*tour_[1-7]_text:/gm) ?? []).length
      if (n === 0) continue
      withTour++
      expect(n, d).toBe(14)
    }
    expect(withTour).toBeGreaterThanOrEqual(15)
  })
  it('каждый ключ есть в словарях ровно по два раза (EN, RU) хотя бы в одном пилоте', () => {
    const dirs = (readdirSync('..') as string[]).filter((d: string) => d.startsWith('web-'))
    for (const k of KEYS) {
      let found = 0
      for (const d of dirs) {
        let src = ''
        try { src = readFileSync(`../${d}/src/lib/i18n.ts`, 'utf-8') } catch { continue }
        const n = (src.match(new RegExp(`^\\s*${k}:`, 'gm')) ?? []).length
        if (n > 0) { found++; expect(n, `${d}.${k}`).toBe(2) }
      }
      expect(found, k).toBeGreaterThan(0)
    }
  })
  it('тексты короткие и парные: RU ≤ 280 знаков, одинаковые абзацы/строки и заполнители {…} в RU и EN', () => {
    for (const k of KEYS) {
      const { ru, en } = BY_KEY[k]
      expect(ru.length, `ru ${k}`).toBeLessThanOrEqual(280)
      expect(ru.split('\n').length, `строки ${k}`).toBe(en.split('\n').length)
      expect((ru.match(/\{\w+\}/g) ?? []).sort(), `заполнители ${k}`).toEqual((en.match(/\{\w+\}/g) ?? []).sort())
    }
  })
  it('русский — на «ты»: нет «вы»-форм', () => {
    for (const k of KEYS) expect(BY_KEY[k].ru, `ru ${k}`).not.toMatch(/(^|[^а-яё])(вы|вас|вам|ваш\w*|нажмите|откройте|выберите|укажите|включите)(?![а-яё])/i)
  })
})
