import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AchievementUnlockedModal from './AchievementUnlockedModal.vue'
import { evaluate, GROUP_ORDER, type Counters } from '../lib/achievements'

const ZERO: Counters = { streakBest: 0, perfectDays: 0, pointsTotal: 0, metricDone: 0, weightEntries: 0, goalsDone: 0, skillsMastered: 0, booksDone: 0, workoutDays: 0, challengesDone: 0, megaWeeks: 0, wordsAdded: 0, wordsLearned: 0 }
const pick = (...keys: string[]) => evaluate({ ...ZERO, streakBest: 100, goalsDone: 10, booksDone: 5 }).filter((s) => keys.includes(s.def.key))

beforeEach(() => localStorage.setItem('site_lang', 'ru'))
afterEach(() => {
  localStorage.removeItem('site_lang')
  document.body.innerHTML = ''
})

describe('AchievementUnlockedModal', () => {
  it('одно достижение: название, за что, строка группы, значок; без счётчика; кнопка «Отлично» закрывает', async () => {
    const w = mount(AchievementUnlockedModal, { props: { states: pick('streak_30') }, attachTo: document.body })
    expect(w.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(w.find('[data-testid="unlocked-title"]').text()).toBe('Новое достижение!')
    expect(w.find('[data-testid="unlocked-name"]').text()).toBe('Месяц в огне')
    expect(w.find('[data-testid="unlocked-condition"]').text()).toBe('Идеальных дней подряд: 30')
    expect(w.find('[data-testid="unlocked-message"]').text()).toContain('привычка')
    expect(w.find('[data-testid="unlocked-badge"] svg').exists()).toBe(true)
    expect(w.find('[data-testid="unlocked-counter"]').exists()).toBe(false)
    expect(w.find('[data-testid="unlocked-next"]').text()).toBe('Отлично')
    await w.find('[data-testid="unlocked-next"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })

  it('несколько: «1 из 3», «Дальше» листает, на последнем «Отлично» закрывает, раньше не закрывает', async () => {
    const w = mount(AchievementUnlockedModal, { props: { states: pick('streak_5', 'goals_10', 'books_5') }, attachTo: document.body })
    expect(w.find('[data-testid="unlocked-title"]').text()).toBe('Новые достижения!')
    expect(w.find('[data-testid="unlocked-counter"]').text()).toBe('1 из 3')
    expect(w.find('[data-testid="unlocked-next"]').text()).toBe('Дальше')
    const first = w.find('[data-testid="unlocked-name"]').text()
    await w.find('[data-testid="unlocked-next"]').trigger('click')
    expect(w.emitted('close')).toBeUndefined()
    expect(w.find('[data-testid="unlocked-counter"]').text()).toBe('2 из 3')
    expect(w.find('[data-testid="unlocked-name"]').text()).not.toBe(first)
    await w.find('[data-testid="unlocked-next"]').trigger('click')
    expect(w.find('[data-testid="unlocked-counter"]').text()).toBe('3 из 3')
    expect(w.find('[data-testid="unlocked-next"]').text()).toBe('Отлично')
    await w.find('[data-testid="unlocked-next"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })

  it('закрывается по клику на фон и по Esc, но не по клику внутри карточки; после размонтирования Esc не слушается', async () => {
    const onClose = vi.fn()
    const w = mount(AchievementUnlockedModal, { props: { states: pick('streak_5'), onClose }, attachTo: document.body })
    await w.find('[data-testid="achievement-unlocked"]').trigger('click')
    expect(onClose).not.toHaveBeenCalled()
    await w.find('[data-testid="unlocked-backdrop"]').trigger('click')
    expect(onClose).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(2)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onClose).toHaveBeenCalledTimes(2) // другие клавиши не закрывают
    w.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(2) // слушатель снят
  })

  it('у каждой группы есть своя тёплая строка на обоих языках', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      const all = evaluate({ streakBest: 1000, perfectDays: 1000, pointsTotal: 5000, metricDone: 9, weightEntries: 1, goalsDone: 99, skillsMastered: 1, booksDone: 99, workoutDays: 99, challengesDone: 99, megaWeeks: 9, wordsAdded: 999, wordsLearned: 999 })
      for (const g of GROUP_ORDER) {
        const s = all.find((x) => x.def.group === g)!
        const w = mount(AchievementUnlockedModal, { props: { states: [s] }, attachTo: document.body })
        const msg = w.find('[data-testid="unlocked-message"]').text()
        expect(msg, `${lang}/${g}`).toBeTruthy()
        expect(msg, `${lang}/${g}`).not.toContain('undefined')
        w.unmount()
      }
    }
  })
})
