import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞 (срез 4): ошибки шапки показываются через friendlyError — текст драйвера, адрес Supabase и имена таблиц до человека не доходят.
describe('header: показ ошибок без сырого текста драйвера', () => {
  for (const f of ['src/lib/useWater.ts', 'src/lib/useLayout.ts'] as string[]) {
    it(f, () => {
      const src: string = readFileSync(f, 'utf-8')
      expect(src).toMatch(/friendlyError\(/)
      expect(src).not.toMatch(/(saveError|error)\.value = [^\n]*\.message/)
      expect(src).not.toMatch(/\+ (error|err|upErr)\.message/)
    })
  }
  it('окно настроек показывает готовую фразу, а не «префикс + сырой текст»', () => {
    const src: string = readFileSync('src/components/SettingsModal.vue', 'utf-8')
    expect(src).not.toMatch(/dash_layout_save_error'\) \}\}\{\{ saveError/)
  })
})
