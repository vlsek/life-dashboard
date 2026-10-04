import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts пилота Дашборда).
import { existsSync, readFileSync } from 'node:fs'

// BACKLOG п.1 «Иконка приложения на Android»: манифест и иконки подключены на странице (раньше их не было ни на одной
// Vue-странице, только в legacy/dashboard.html — приложение ставилось без манифеста и получало стандартную иконку).
const html: string = readFileSync('index.html', 'utf-8')
const manifest = JSON.parse(readFileSync('../manifest.json', 'utf-8')) as { icons: { src: string; purpose?: string }[] }

describe('PWA: манифест и иконки (customization)', () => {
  it('в <head> есть ссылка на манифест и apple-touch-icon, и мета для режима «приложение»', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />')
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />')
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"')
    expect(html).toContain('name="apple-mobile-web-app-title" content="Dashboard"')
    expect(html.indexOf('rel="manifest"')).toBeLessThan(html.indexOf('</head>'))
  })

  it('манифест содержит обычные, maskable и monochrome-иконки (перекраска под тему системы), и все файлы существуют', () => {
    const purposes = manifest.icons.map((i) => i.purpose)
    for (const p of ['any', 'maskable', 'monochrome']) expect(purposes).toContain(p)
    for (const i of manifest.icons) expect(existsSync('..' + i.src), i.src).toBe(true)
    expect(existsSync('../icons/apple-touch-icon.png')).toBe(true)
  })
})
