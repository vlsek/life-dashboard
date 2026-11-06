// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts)
import { readFileSync } from 'node:fs'
// @ts-ignore — то же
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет

// BACKLOG 74.4: нажимаемые зоны на телефоне. Скрипт scripts/visual_regression.py (настоящий Chromium, собранные папки) нашёл на «Главной» элементы меньше 24 px
// (минимум WCAG 2.2 AA): шестерёнка аватара 19×19, поле времени плана 19 px, «уже сделано» 18 px; заголовки-переключатели 29 px (стандарт проекта — 32, аудит 60.2).
// Вёрстку в jsdom не проверить, поэтому страж смотрит на сами правила. Корневой шрифт проекта меньше 16 px, поэтому `2rem` даёт ~29 px — размеры заданы в px.
const ROOT = resolve(__dirname, '..', '..')
const read = (f: string): string => readFileSync(resolve(ROOT, f), 'utf-8')
const px = (s: string): number => Number((/min-height:\s*(\d+)px/.exec(s) || [])[1] || 0)

describe('нажимаемые зоны на «Главной» и в «Языках»', () => {
  it('.collapse-head (заголовки сворачиваемых блоков) — не ниже 32 px', () => {
    const rule = /\.collapse-head \{[^}]*\}/.exec(read('web-dashboard/src/style.css'))![0]
    expect(px(rule)).toBeGreaterThanOrEqual(32)
  })

  it('шестерёнка аватара: класс gear-btn и расширенная зона нажатия через ::after (не меньше 40 px при значке 19)', () => {
    const src = read('web-dashboard/src/components/AvatarProgress.vue')
    expect(src).toMatch(/class="gear-btn absolute/)
    const after = /\.gear-btn::after \{([^}]*)\}/.exec(src)
    expect(after, '.gear-btn::after').not.toBeNull()
    expect(after![1]).toMatch(/position:\s*absolute/)
    const inset = Number((/inset:\s*-(\d+)px/.exec(after![1]) || [])[1])
    expect(19 + 2 * inset).toBeGreaterThanOrEqual(40)
  })

  it('план: поле времени и «уже сделано» не ниже 32 px', () => {
    const src = read('web-dashboard/src/components/PlannedSection.vue')
    expect(px(/\.plan-time \{[^}]*\}/.exec(src)![0])).toBeGreaterThanOrEqual(32)
    expect(src).toMatch(/<label class="inline-flex items-center gap-1 text-sm" style="min-height: 32px"/)
  })

  it('«Языки»: кнопка «добавить словарь» не ниже 32 px', () => {
    const src = read('web-languages/src/components/DictionaryTabs.vue')
    const tag = /<button[^>]*data-test="tab-add"[\s\S]*?>/.exec(src)![0]
    expect(px(tag)).toBeGreaterThanOrEqual(32)
  })
})
