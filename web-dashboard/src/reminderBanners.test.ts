import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в shellModalGuard.test.ts).
import { readFileSync } from 'node:fs'
import ReminderBanners from './components/ReminderBanners.vue'

// BACKLOG 781 (ответ владельца): клик по самой плашке «Итоги недели на подходе» открывает недельный итог «сделано / не сделано»;
// ссылка «Сделай что-то из целей» и крестик работают как раньше.
const mountBanner = () => mount(ReminderBanners, { props: { milestonesReminder: null, weekendReminderVisible: true, weekTotalPct: 64 } })

describe('плашка «Итоги недели на подходе»', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('клик по плашке открывает недельный итог', async () => {
    const w = mountBanner()
    await w.find('[data-test="week-reminder"]').trigger('click')
    expect(w.emitted('openWeek')).toHaveLength(1)
    expect(w.emitted('dismissWeekend')).toBeUndefined()
  })

  it('клик по тексту внутри плашки (не по ссылке) тоже открывает итог', async () => {
    const w = mountBanner()
    await w.find('strong').trigger('click')
    expect(w.emitted('openWeek')).toHaveLength(1)
  })

  it('ссылка «Сделай что-то из целей» ведёт в цели и итог НЕ открывает', async () => {
    const w = mountBanner()
    const link = w.find('[data-test="week-reminder-link"]')
    expect(link.attributes('href')).toBe('/goals/')
    await link.trigger('click')
    expect(w.emitted('openWeek')).toBeUndefined()
  })

  it('крестик закрывает плашку и итог НЕ открывает', async () => {
    const w = mountBanner()
    await w.find('[data-test="week-reminder-dismiss"]').trigger('click')
    expect(w.emitted('dismissWeekend')).toHaveLength(1)
    expect(w.emitted('openWeek')).toBeUndefined()
  })

  it('с клавиатуры: Enter и пробел на плашке открывают итог (доступность)', async () => {
    const w = mountBanner()
    const box = w.find('[data-test="week-reminder"]')
    expect(box.attributes('role')).toBe('button')
    expect(box.attributes('tabindex')).toBe('0')
    await box.trigger('keydown.enter')
    await box.trigger('keydown.space')
    expect(w.emitted('openWeek')).toHaveLength(2)
  })

  it('подписи для чтения с экрана на RU и EN', async () => {
    const ru = mountBanner()
    expect(ru.find('[data-test="week-reminder"]').attributes('aria-label')).toBe('Открыть итоги недели')
    expect(ru.find('[data-test="week-reminder-dismiss"]').attributes('aria-label')).toBe('Закрыть напоминание')
    localStorage.setItem('site_lang', 'en')
    const en = mountBanner()
    expect(en.find('[data-test="week-reminder"]').attributes('aria-label')).toBe('Open the weekly summary')
  })

  it('плашки нет, пока напоминание не показывается', () => {
    const w = mount(ReminderBanners, { props: { milestonesReminder: null, weekendReminderVisible: false, weekTotalPct: 0 } })
    expect(w.find('[data-test="week-reminder"]').exists()).toBe(false)
  })

  it('App.vue связывает событие с окном недельного итога', () => {
    const app: string = readFileSync('src/App.vue', 'utf-8')
    expect(app).toContain(`@open-week="summaryKind = 'week'"`)
  })
})
