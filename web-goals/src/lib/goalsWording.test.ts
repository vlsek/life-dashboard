import { beforeEach, describe, expect, it } from 'vitest'
import { t } from './i18n'

// BACKLOG 843 (владелец): раздел называется просто «Цели», кнопка — просто «Добавить» (раньше «Долгосрочные цели» / «Добавить цель»).
describe('Цели: короткие названия', () => {
  beforeEach(() => localStorage.clear())

  it('RU: заголовок «Цели», кнопка «Добавить»', () => {
    localStorage.setItem('site_lang', 'ru')
    expect(t('goals_h1')).toBe('🎯 Цели')
    expect(t('goals_add_btn')).toBe('➕ Добавить')
  })

  it('EN: заголовок «Goals», кнопка «Add»', () => {
    localStorage.setItem('site_lang', 'en')
    expect(t('goals_h1')).toBe('🎯 Goals')
    expect(t('goals_add_btn')).toBe('➕ Add')
  })

  it('слова «долгосрочные» / «long-term» нигде в словаре раздела не остались', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      expect(t('goals_h1').toLowerCase()).not.toMatch(/долгосроч|long-term/)
      expect(t('goals_add_btn').toLowerCase()).not.toMatch(/цель|goal/)
    }
  })
})
