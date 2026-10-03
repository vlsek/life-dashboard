import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterReminderBanner from './WaterReminderBanner.vue'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('WaterReminderBanner', () => {
  it('says how much is drunk and how much is left', () => {
    const w = mount(WaterReminderBanner, { props: { ml: 700, goal: 2000 } })
    expect(w.find('[data-test="water-reminder-text"]').text()).toBe('Сегодня выпито 700 из 2000 мл — осталось 1300 мл.')
    expect(w.text()).toContain('Пора выпить воды')
  })
  it('rounds fractional values and never shows a negative remainder', () => {
    const w = mount(WaterReminderBanner, { props: { ml: 1999.6, goal: 2000.4 } })
    expect(w.find('[data-test="water-reminder-text"]').text()).toContain('осталось 1 мл')
    expect(mount(WaterReminderBanner, { props: { ml: 2200, goal: 2000 } }).text()).toContain('осталось 0 мл')
  })
  it('dismiss emits', async () => {
    const w = mount(WaterReminderBanner, { props: { ml: 0, goal: 2000 } })
    await w.find('[data-test="water-reminder-dismiss"]').trigger('click')
    expect(w.emitted('dismiss')).toHaveLength(1)
  })

  it('never prints NaN, Infinity or a negative number (BACKLOG 23, 15:19)', () => {
    for (const [ml, goal] of [[NaN, 2000], [500, NaN], [-300, 2000], [Infinity, 2000], [500, -1], [undefined as unknown as number, 2000]]) {
      const w = mount(WaterReminderBanner, { props: { ml, goal } })
      const text = w.find('[data-test="water-reminder-text"]').text()
      expect(text).not.toMatch(/NaN|Infinity|undefined|-\d/)
    }
  })
  it('a drunk amount above the goal shows "0 left", not a negative number', () => {
    const w = mount(WaterReminderBanner, { props: { ml: 2600, goal: 2000 } })
    expect(w.find('[data-test="water-reminder-text"]').text()).toContain('осталось 0 мл')
  })
})
