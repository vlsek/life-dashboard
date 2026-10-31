import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в shellModalGuard.test.ts)
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// BACKLOG 49.5 срез 2 «Меню новичка»: блок в AppShell.vue всех пилотов ОДИН И ТОТ ЖЕ (копии), шапка кладёт дату регистрации, словари знают «Ещё».
const pilots: string[] = readdirSync('..').filter((d: string) => /^web-/.test(d) && existsSync(`../${d}/src/components/AppShell.vue`))
const block = (s: string): string => s.slice(s.indexOf('// BACKLOG 49.5 срез 2'), s.indexOf("onUnmounted(() => window.removeEventListener('account-created-at'"))
const dashShell: string = readFileSync('src/components/AppShell.vue', 'utf-8')

describe('меню новичка: одинаковый блок во всех AppShell.vue', () => {
  it('пилотов с оболочкой не меньше 15', () => expect(pilots.length).toBeGreaterThanOrEqual(15))
  for (const d of pilots) {
    it(d + ': блок совпадает с дашбордовым, список берёт shownSidebarPages, есть кнопка «Ещё»', () => {
      const s: string = readFileSync(`../${d}/src/components/AppShell.vue`, 'utf-8')
      expect(block(s), d).toBe(block(dashShell))
      expect(s).toContain('v-for="p in shownSidebarPages"')
      expect(s).toContain('data-testid="menu-more"')
      expect(s).toContain("const NEWBIE_MENU_KEYS = ['dashboard', 'goals', 'skills', 'workouts', 'calendar', 'shop']")
      expect(s).toContain("t('nav_more_menu')")
    })
    it(d + ': словарь знает «Ещё» на обоих языках', () => {
      const i: string = readFileSync(`../${d}/src/lib/i18n.ts`, 'utf-8')
      expect(i.match(/nav_more_menu:/g)!.length).toBe(2)
    })
  }
  it('шапка кладёт дату регистрации и сообщает событием; ключ НЕ синхронизируется между устройствами', () => {
    const main: string = readFileSync('../web-header/src/main.ts', 'utf-8')
    expect(main).toContain("localStorage.setItem('account_created_at', createdAt)")
    expect(main).toContain("new Event('account-created-at')")
    expect(readFileSync('../web-header/src/lib/uiSettingsSync.ts', 'utf-8')).not.toContain("'account_created_at'")
  })
  it('порог в меню тот же, что в режиме новичка Дашборда: 7 дней и ключ dash_show_all', () => {
    expect(dashShell).toContain('7 * 86400_000')
    expect(dashShell).toContain("localStorage.getItem('dash_show_all') === '1'")
    expect(readFileSync('src/lib/newbieMode.ts', 'utf-8')).toContain('export const NEWBIE_DAYS = 7')
  })
})
