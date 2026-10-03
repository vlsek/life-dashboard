import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Виджет «Навыки» на главной (BACKLOG 391, владелец 2026-10-03: любой навык на главную и отмечать прогресс)
const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  selectError: null as unknown,
  updateError: null as unknown,
  updates: [] as { patch: unknown; id: unknown }[],
  all: [] as Record<string, unknown>[],
}))
vi.mock('./supabase', () => ({
  sb: {
    from: () => {
      const ctx: { upd?: unknown; id?: unknown } = {}
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => {
        if (col === 'id') ctx.id = val
        return chain
      }
      chain.in = () => Promise.resolve({ data: db.rows, error: db.selectError })
      chain.order = () => Promise.resolve({ data: db.all, error: null })
      chain.update = (patch: unknown) => {
        ctx.upd = patch
        return chain
      }
      chain.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
        if (ctx.upd !== undefined) db.updates.push({ patch: ctx.upd, id: ctx.id })
        return Promise.resolve({ error: db.updateError }).then(ok, bad)
      }
      return chain
    },
  },
}))
const floats = vi.hoisted(() => ({ calls: [] as number[] }))
vi.mock('./pointsFloat', () => ({ emitPointsFloat: (d: number) => { if (d) floats.calls.push(d) } })) // как настоящий: нулевую дельту не показывает

import SkillsWidget from '../components/SkillsWidget.vue'
import WidgetsSection from '../components/WidgetsSection.vue'
import { loadSkillOptions, nextProgress, skillDelta, skillPercent } from './useSkillsWidget'
import { loadWidgetOptions } from './widgets'

const sk = (over: Record<string, unknown> = {}) => ({ id: 's1', name: 'Шпагат', progress: 40, mastered: false, step: 20, points: 15, ...over })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.rows = [sk(), sk({ id: 's2', name: 'Печать', progress: 0, step: 10, points: null })]
  db.selectError = null
  db.updateError = null
  db.updates = []
  db.all = []
  floats.calls = []
})

describe('правила навыка (копия раздела Навыков)', () => {
  it('nextProgress: ±шаг, зажат в 0..100; шаг по умолчанию 10', () => {
    expect(nextProgress(40, 20, 1)).toBe(60)
    expect(nextProgress(90, 20, 1)).toBe(100)
    expect(nextProgress(10, 20, -1)).toBe(0)
    expect(nextProgress(null, null, 1)).toBe(10)
  })
  it('skillPercent: целое 0..100, мусор — 0', () => {
    expect(skillPercent(54.6)).toBe(55)
    expect(skillPercent(-3)).toBe(0)
    expect(skillPercent(150)).toBe(100)
    expect(skillPercent('x' as unknown as number)).toBe(0)
    expect(skillPercent(undefined)).toBe(0)
  })
  it('skillDelta: освоил +очки (пусто → 10), снял −очки, без смены статуса 0', () => {
    expect(skillDelta(false, true, 15)).toBe(15)
    expect(skillDelta(false, true, null)).toBe(10)
    expect(skillDelta(true, false, 15)).toBe(-15)
    expect(skillDelta(false, false, 15)).toBe(0)
    expect(skillDelta(true, true, 15)).toBe(0)
  })
})

describe('loadSkillOptions / loadWidgetOptions', () => {
  it('все навыки с признаком «освоен»', async () => {
    db.all = [{ id: 'a', name: 'А', mastered: true }, { id: 'b', name: 'Б', mastered: null }]
    expect(await loadSkillOptions('u1')).toEqual([{ id: 'a', name: 'А', mastered: true }, { id: 'b', name: 'Б', mastered: false }])
    const o = await loadWidgetOptions('u1')
    expect(o.skills).toHaveLength(2)
  })
})

describe('SkillsWidget', () => {
  const mountW = (ids = ['s1', 's2']) => mount(SkillsWidget, { props: { userId: 'u1', ids } })

  it('карточка на каждый выбранный навык в порядке выбора: название, полоса, процент, шаги', async () => {
    const w = mountW(['s2', 's1'])
    await flushPromises()
    const items = w.findAll('[data-test="skills-item"]')
    expect(items.map((i) => i.find('[data-test="skills-name"]').text())).toEqual(['Печать', 'Шпагат'])
    expect(items[1].find('[data-test="skills-percent"]').text()).toBe('40%')
    expect(items[1].find('[data-test="skills-fill"]').attributes('style')).toContain('width: 40%')
    expect(items[1].find('[data-test="skills-up"]').text()).toBe('+20%')
    expect(items[0].find('[data-test="skills-up"]').text()).toBe('+10%')
    expect(items[0].find('[data-test="skills-down"]').attributes('disabled')).toBeDefined() // прогресс 0
    expect(w.emitted('state')!.map((e) => e[0])).toEqual(['loading', 'ready'])
    w.unmount()
  })

  it('«+шаг» сразу двигает полосу, пишет progress/mastered в БД; до 100% очков нет', async () => {
    const w = mountW(['s1'])
    await flushPromises()
    await w.find('[data-test="skills-up"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="skills-percent"]').text()).toBe('60%')
    expect(db.updates).toEqual([{ patch: { progress: 60, mastered: false }, id: 's1' }])
    expect(floats.calls).toEqual([])
    w.unmount()
  })

  it('дошёл до 100% — навык освоен, +очки навыка анимацией, «+шаг» отключён; откат ниже 100% — −очки', async () => {
    db.rows = [sk({ progress: 90, step: 20, points: 15 })]
    const w = mountW(['s1'])
    await flushPromises()
    await w.find('[data-test="skills-up"]').trigger('click')
    await flushPromises()
    expect(db.updates[0].patch).toEqual({ progress: 100, mastered: true })
    expect(floats.calls).toEqual([15])
    expect(w.find('[data-test="skills-mastered"]').exists()).toBe(true)
    expect(w.find('[data-test="skills-up"]').attributes('disabled')).toBeDefined()
    await w.find('[data-test="skills-down"]').trigger('click')
    await flushPromises()
    expect(db.updates[1].patch).toEqual({ progress: 80, mastered: false })
    expect(floats.calls).toEqual([15, -15])
    expect(w.find('[data-test="skills-mastered"]').exists()).toBe(false)
    w.unmount()
  })

  it('сбой записи — прогресс откатывается, показывается ошибка, очков нет', async () => {
    db.updateError = { message: 'rls' }
    const w = mountW(['s1'])
    await flushPromises()
    await w.find('[data-test="skills-up"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="skills-percent"]').text()).toBe('40%')
    expect(w.find('[data-test="skills-error"]').text()).toContain('Не удалось сохранить прогресс: rls')
    expect(floats.calls).toEqual([])
    w.unmount()
  })

  it('удалённые навыки молча пропускаются; все удалены — empty и ничего не рисуется; ошибка загрузки — error', async () => {
    let w = mountW(['s1', 'gone'])
    await flushPromises()
    expect(w.findAll('[data-test="skills-item"]')).toHaveLength(1)
    w.unmount()
    db.rows = []
    w = mountW(['gone'])
    await flushPromises()
    expect(w.find('[data-test="skills-widget"]').exists()).toBe(false)
    expect(w.emitted('state')!.map((e) => e[0]).pop()).toBe('empty')
    w.unmount()
    db.selectError = { message: 'boom' }
    w = mountW(['s1'])
    await flushPromises()
    expect(w.emitted('state')!.map((e) => e[0]).pop()).toBe('error')
    w.unmount()
  })
})

describe('WidgetsSection: оба виджета', () => {
  it('блок виден, если готов хотя бы один: навыки есть, а товар «Коплю» недоступен', async () => {
    const w = mount(WidgetsSection, { props: { userId: 'u1', config: { skills: ['s1'] } } })
    await flushPromises()
    expect(w.find('[data-test="widgets-section"]').attributes('style') ?? '').not.toContain('display: none')
    expect(w.find('[data-test="skills-widget"]').exists()).toBe(true)
    expect(w.emitted('shown')!.map((e) => e[0]).pop()).toBe(true)
    w.unmount()
  })

  it('все навыки выбранного виджета удалены — блока нет (shown=false)', async () => {
    db.rows = []
    const w = mount(WidgetsSection, { props: { userId: 'u1', config: { skills: ['gone'] } } })
    await flushPromises()
    expect(w.find('[data-test="widgets-section"]').attributes('style')).toContain('display: none')
    expect(w.emitted('shown')!.map((e) => e[0]).pop()).toBe(false)
    w.unmount()
  })
})
