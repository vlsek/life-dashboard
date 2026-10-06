import { describe, expect, it } from 'vitest'

// В этом проекте уже бывало, что разметка ссылается на класс, а стилей у него нет (см. комментарий к .card в style.css).
// Vitest не отдаёт содержимое .css через ?raw (css выключен), поэтому читаем файл напрямую; типов node в пилоте нет.
async function readStyle(): Promise<string> {
  // @ts-expect-error — в этом пилоте нет типов node, а vitest выполняется в node
  const fs = (await import('node:fs')) as { readFileSync: (p: string, enc: string) => string }
  const cwd = (globalThis as unknown as { process: { cwd: () => string } }).process.cwd()
  return fs.readFileSync(`${cwd}/src/style.css`, 'utf-8')
}

describe('style.css: подложка у каждого подхода (BACKLOG 18.4)', () => {
  it('defines .sets-table with a separate plate per parameter cell (раздел 42, 9:06)', async () => {
    const css = await readStyle()
    expect(css).toMatch(/\.sets-table\s*\{[^}]*border-spacing:\s*\d+px\s+\d+px/) // зазор и по горизонтали — плашки не слипаются
    expect(css).toMatch(/\.sets-table td\.set-plate\s*\{[^}]*background:\s*var\(--bg\)[^}]*border:\s*1px solid var\(--border\)[^}]*border-radius:\s*10px/)
    expect(css).toMatch(/\.sets-table td\.set-plate:focus-within\s*\{[^}]*border-color:\s*var\(--accent\)/)
    expect(css).toMatch(/\.sets-table td\.set-plate input\s*\{[^}]*border:\s*0/) // без плашки в плашке
    // старая «одна общая плашка на всю строку» (скругление только у крайних ячеек) не должна вернуться
    expect(css).not.toMatch(/\.sets-table td:first-child\s*\{/)
    expect(css).not.toMatch(/\.sets-table td:last-child\s*\{/)
  })
})

describe('style.css: подложка у всех полей ввода и списков в окнах (раздел 42, 9:05)', () => {
  it.each(["input[type='number']", "input[type='time']", "input[type='date']", 'select', 'textarea', "input[type='text']"])('.modal %s имеет рамку и фон', async (sel) => {
    const css = await readStyle()
    const rule = css.match(/(\.modal [^{}]*)\{[^}]*background:\s*var\(--bg\)[^}]*border:\s*1px solid var\(--border\)[^}]*\}/g) ?? []
    expect(rule.some((r) => r.includes('.modal ' + sel))).toBe(true)
  })
})
