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
  it('defines .sets-table with a plate per cell row', async () => {
    const css = await readStyle()
    expect(css).toMatch(/\.sets-table\s*\{[^}]*border-spacing:/)
    expect(css).toMatch(/\.sets-table td\s*\{[^}]*background:\s*var\(--bg\)/)
    expect(css).toMatch(/\.sets-table td:first-child\s*\{[^}]*border-radius/)
    expect(css).toMatch(/\.sets-table td:last-child\s*\{[^}]*border-radius/)
  })
})
