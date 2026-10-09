import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_UNLOCK, type ThemeKey } from './theme'
import { UNLOCK_GROUPS, themeUnlockInfo } from './themeUnlockInfo'
import { t } from './i18n'

// BACKLOG 49.10: окно «как получить закрытую тему». Страж: у КАЖДОЙ закрытой темы есть название достижения и понятное условие на обоих языках.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('условие получения закрытой темы', () => {
  it('у каждой закрытой темы-награды есть достижение и условие с числом (RU и EN)', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      for (const k of Object.keys(THEME_UNLOCK) as ThemeKey[]) {
        const info = themeUnlockInfo(k)
        expect(info, k).not.toBeNull()
        expect(info!.condition, `${k}: нет описания группы условия — добавьте в UNLOCK_GROUPS`).not.toBeNull()
        expect(info!.condition!, k).toMatch(/\d/)
        expect(info!.condition!, k).not.toContain('{n}')
        expect(info!.achievementName.startsWith('cust_ach_'), `${k}: нет названия достижения`).toBe(false)
      }
    }
  })

  it('конкретно: «Сепия» — сотня слов; «Нордик» — выучено 100 слов; число берётся из ключа достижения', () => {
    expect(themeUnlockInfo('sepia')).toMatchObject({ achievementKey: 'words_100', achievementName: 'Сотня слов', condition: 'Слов добавлено в «Языках»: 100' })
    expect(themeUnlockInfo('nord')!.condition).toBe('Слов выучено в «Языках»: 100')
    expect(themeUnlockInfo('amoled')!.condition).toBe('Дней с записанной тренировкой: 250')
  })

  it('открытая по умолчанию тема — без окна (null); у всех групп есть переводы', () => {
    expect(themeUnlockInfo('dark' as ThemeKey)).toBeNull()
    for (const key of Object.values(UNLOCK_GROUPS)) {
      for (const lang of ['ru', 'en']) {
        localStorage.setItem('site_lang', lang)
        expect(t(key as never), key).not.toBe(key)
      }
    }
  })
})
