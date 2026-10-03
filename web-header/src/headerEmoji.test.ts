import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в web-dashboard/src/waterEmoji.test.ts).
import { readdirSync, readFileSync } from 'node:fs'
import { UI_EMOJI_TO_SVG, splitEmojiText, stripEmoji } from './lib/emojiText'
import { ICON_PATHS } from './lib/icons'
import { t } from './lib/i18n'

// BACKLOG «Эмодзи: вода и шапка» (пилот шапки): сырых 💧 ⚙️ 🏋️ ↶ ✎ ⭐ в шаблонах нет — они идут через <EmojiText> (SVG),
// а в атрибутах title эмодзи убраны (SVG в атрибут не вставить).
const read = (f: string): string => readFileSync(f, 'utf-8')
const tpl = (f: string): string => {
  const src = read(f)
  return src.slice(src.indexOf('<template>'))
}
const withoutEmojiText = (s: string) => s.replace(/<EmojiText[\s\S]*?\/>/g, '')
const comps: string[] = (readdirSync('src/components') as string[]).filter((f) => f.endsWith('.vue')).map((f) => `src/components/${f}`)

describe('шапка: эмодзи → SVG', () => {
  it('у каждой используемой иконки есть пути SVG', () => {
    for (const g of ['💧', '⚙️', '🏋️', '↶', '✎', '⭐', '👤', '📈', '📅']) {
      const first = splitEmojiText(`${g} текст`)[0]
      expect(first.kind, g).toBe('icon')
      expect(ICON_PATHS[UI_EMOJI_TO_SVG[g.replace(/\uFE0F/g, '')]], g).toContain('<')
    }
  })

  it('RightPanel / SettingsModal / WaterModal: 💧 ⚙️ 🏋️ ↶ ✎ только внутри <EmojiText>', () => {
    for (const f of ['RightPanel', 'SettingsModal', 'WaterModal']) {
      const rest = withoutEmojiText(tpl(`src/components/${f}.vue`))
      for (const g of ['💧', '⚙', '🏋', '↶', '✎']) expect(rest, `${f} ${g}`).not.toContain(g)
    }
  })

  it('EmojiText подключён везде, где он используется', () => {
    for (const f of comps) {
      const src = read(f)
      if (src.slice(src.indexOf('<template>')).includes('<EmojiText')) expect(src.slice(0, src.indexOf('<template>')), f).toContain('import EmojiText')
    }
  })

  it('страж: {{ t(ключ) }} со строкой словаря, начинающейся с заменяемого эмодзи, не выводится сырым текстом', () => {
    const bad: string[] = []
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      for (const f of comps.concat(['src/App.vue'])) {
        for (const m of tpl(f).matchAll(/\{\{ t\('([a-z0-9_]+)'\) \}\}/g)) {
          if (splitEmojiText(t(m[1] as never))[0]?.kind === 'icon') bad.push(`${f}:${m[1]} (${lang})`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('App.vue: в title колец и стакана нет эмодзи, числа и единицы на месте', () => {
    const src = read('src/App.vue')
    const body = src.slice(src.indexOf('<template>'))
    expect(body).not.toContain('💧')
    expect(body).toMatch(/:title="`\$\{todayMl\} \/ \$\{normMl\} \$\{unitLabel\}`"/)
    expect(src).toMatch(/title: `\$\{label\}: \$\{pct\}% \(\$\{p\.done\}\/\$\{p\.total\}\$\{p\.bonusPct > 0 \? ' \+' \+ p\.bonusPct \+ '%' : ''\}\)`/)
  })

  it('«Бонус»: в подписи спидометра ⭐ рисуется иконкой, а stripEmoji в атрибуте оставляет только текст', () => {
    expect(splitEmojiText('1/2 +20% ⭐').some((s) => s.kind === 'icon')).toBe(true)
    expect(stripEmoji('⚙️ Прогресс дня и недели')).toBe('Прогресс дня и недели')
    expect(tpl('src/components/ProgressGauge.vue')).toContain('<EmojiText :text="detail" />')
  })
})
