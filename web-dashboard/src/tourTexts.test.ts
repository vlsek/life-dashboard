import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'

// BACKLOG 935/49.5 (одобрено владельцем 2026-10-17): тур онбординга короче и на «ты». Тексты — в scripts/apply_tour_texts.py,
// оттуда они раскатываются в словарь КАЖДОГО пилота (tour_1..7_text). Правка руками в одном словаре разводит копии — тест это ловит.
const run = (cmd: string) => execSync(cmd, { cwd: '..', encoding: 'utf-8' })
const TEXTS = JSON.parse(run(`python3 -c "import json,sys; sys.path.insert(0,'scripts'); import apply_tour_texts as a; print(json.dumps(a.TEXTS, ensure_ascii=False))"`)) as Record<'ru' | 'en', Record<string, string>>

describe('тур онбординга: тексты в одном месте', () => {
  it('apply_tour_texts.py идемпотентен: копии во всех пилотах совпадают с эталоном', () => {
    expect(run('python3 scripts/apply_tour_texts.py --check')).toContain('изменено файлов: 0')
  })
  it('тур есть в словарях всех пилотов, где он нужен (не меньше 15), по 7 шагов на язык', () => {
    const dirs = readdirSync('..').filter((d) => d.startsWith('web-'))
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
  it('тексты короткие и парные: RU ≤ 230 знаков, одинаковое число абзацев и строк в RU и EN', () => {
    for (const n of ['1', '2', '3', '4', '5', '6', '7']) {
      const ru = TEXTS.ru[n]
      const en = TEXTS.en[n]
      expect(ru.length, `ru ${n}`).toBeLessThanOrEqual(230)
      expect(ru.split('\n').length, `строки ${n}`).toBe(en.split('\n').length)
    }
  })
  it('русский тур — на «ты»: нет «вы»-форм', () => {
    for (const n of ['1', '2', '3', '4', '5', '6', '7']) expect(TEXTS.ru[n], `ru ${n}`).not.toMatch(/\b(вы|вас|вам|ваш\w*|нажмите|откройте|выберите)\b/i)
  })
})
