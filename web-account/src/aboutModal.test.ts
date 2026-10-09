import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AboutModal from './components/AboutModal.vue'

// Файлы читаем через node:fs; имя модуля собрано строкой, чтобы vue-tsc не требовал @types/node для тестов пилота.
async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG 44.20 (ответ владельца 2026-10-07): «О проекте» → «О создателе»: коротко и кнопка «Резюме» (https://portfolio.orneryhero.workers.dev/).
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('окно «О создателе»', () => {
  it('заголовок «О создателе», один короткий абзац и кнопка «Резюме» со ссылкой на портфолио', () => {
    const w = mount(AboutModal)
    expect(w.find('h3').text()).toContain('О создателе')
    const link = w.find('[data-test="about-resume"]')
    expect(link.attributes('href')).toBe('https://portfolio.orneryhero.workers.dev/')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.text()).toContain('Резюме')
    expect(w.findAll('p').filter((p) => p.text().length > 40 && !p.text().includes('Telegram'))).toHaveLength(1) // один абзац про создателя
    expect(w.find('h4').exists()).toBe(false) // подзаголовок «Кто это сделал» убран
    expect(w.text()).not.toContain('инфраструктурный')
    w.unmount()
  })

  it('по-английски: About the creator и Resume', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(AboutModal)
    expect(w.find('h3').text()).toContain('About the creator')
    expect(w.find('[data-test="about-resume"]').text()).toContain('Resume')
    w.unmount()
  })

  it('ссылка и пометка одинаковы во всех страницах, где есть окно (account, history, languages, workouts)', async () => {
    const own = await readSrc('./components/AboutModal.vue')
    for (const d of ['web-history', 'web-languages', 'web-workouts']) {
      expect(await readSrc(`../../${d}/src/components/AboutModal.vue`), d).toBe(own)
    }
    for (const d of ['web-account', 'web-history', 'web-languages', 'web-workouts']) {
      const i18n = await readSrc(`../../${d}/src/lib/i18n.ts`)
      expect(i18n, d).toContain("nav_about: 'О создателе'")
      expect(i18n, d).toContain("nav_about: 'About the creator'")
      expect(i18n, d).not.toContain('about_creator_title')
    }
  })
})
