import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
import { readdirSync, readFileSync } from 'node:fs'
import { splitEmojiText } from './lib/emojiText'
import { t } from './lib/i18n'

// Страж против возврата сырых эмодзи (BACKLOG 🎨 «Замена эмодзи на SVG»): если в шаблоне .vue текст выводится как
// {{ t('ключ') }}, а строка словаря начинается с эмодзи, у которого есть SVG, — нужно <EmojiText :text="t('ключ')" />.
// Исключения — места, где компонент вставить нельзя (внутри <option> и т. п.) или рядом уже стоит своя иконка.
const ALLOWED = new Set<string>([
  // исключений нет: в <option> и title/placeholder эмодзи убирается через stripEmoji(), рядом с EmojiText своей иконки не ставим
])

const dir = 'src/components'
const files: string[] = (readdirSync(dir) as string[]).filter((f) => f.endsWith('.vue')).map((f) => `${dir}/${f}`).concat(['src/App.vue'])

describe('шаблоны не выводят эмодзи, у которых есть SVG, сырым текстом', () => {
  it('нет {{ t(key) }} со строкой словаря, начинающейся с заменяемого эмодзи (кроме исключений)', () => {
    const bad: string[] = []
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      for (const f of files) {
        const src: string = readFileSync(f, 'utf-8')
        const tpl = src.slice(src.indexOf('<template>'))
        for (const m of tpl.matchAll(/\{\{ t\('([a-z0-9_]+)'\) \}\}/g)) {
          const key = m[1]
          const value = t(key as never)
          if (splitEmojiText(value)[0]?.kind !== 'icon') continue
          const id = `${f.split('/').pop()}:${key}`
          if (!ALLOWED.has(id)) bad.push(`${id} (${lang})`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('EmojiText реально подключён в файлах, где он используется (нет забытого импорта)', () => {
    for (const f of files) {
      const src: string = readFileSync(f, 'utf-8')
      const tpl = src.slice(src.indexOf('<template>'))
      if (tpl.includes('<EmojiText')) expect(src.slice(0, src.indexOf('<template>')), f).toContain('import EmojiText')
    }
  })
})
