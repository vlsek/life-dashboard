// @ts-ignore — типов node в проекте нет; vitest выполняется в node (как в других стражах)
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MuscleModelFigure from './MuscleModelFigure.vue'
import { MUSCLE_MODELS, type ModelNode, type ModelStyle } from '../lib/muscleModels.generated'

const STYLES: ModelStyle[] = ['anatomy', 'atlas', 'tech']
const flat = (ns: ModelNode[]): ModelNode[] => ns.flatMap((n) => [n, ...(n.children ? flat(n.children) : [])])
const zonesOf = (style: ModelStyle, view: 'front' | 'back') => flat(MUSCLE_MODELS[style][view]).filter((n) => n.attrs?.['data-muscle'])
const mk = (over: Record<string, unknown> = {}) =>
  mount(MuscleModelFigure, { props: { visualStyle: 'anatomy', view: 'front', label: 'Вид спереди', selected: null, stateOf: () => ({ done: false, heat: null, opacity: null }), labelOf: (m: string) => 'Зона ' + m, ...over } as never })

describe('данные моделей (генерируются из макета)', () => {
  it('в каждом направлении спереди 7 групп, сзади 8, всего 12 разных мышц', () => {
    for (const s of STYLES) {
      expect(new Set(zonesOf(s, 'front').map((n) => n.attrs!['data-muscle'])).size).toBe(7)
      expect(new Set(zonesOf(s, 'back').map((n) => n.attrs!['data-muscle'])).size).toBe(8)
      expect(new Set([...zonesOf(s, 'front'), ...zonesOf(s, 'back')].map((n) => n.attrs!['data-muscle'])).size).toBe(12)
    }
  })
  it('число зон совпадает с макетом docs/mockups (генератор не отстал от макета)', () => {
    const html: string = readFileSync('../docs/mockups/muscle-map-concepts-v3.html', 'utf8')
    const models: string[] = html.match(/<svg class="model [^"]*"[^>]*>[\s\S]*?<\/svg>/g) ?? []
    expect(models.length).toBe(3)
    const inMock = models.map((m: string) => (m.match(/data-muscle="/g) ?? []).length)
    const inData = STYLES.map((s) => zonesOf(s, 'front').length + zonesOf(s, 'back').length)
    expect(inData).toEqual(inMock) // anatomy, atlas, machine → anatomy, atlas, tech
  })
})

describe('MuscleModelFigure: контракт зон', () => {
  for (const style of STYLES) for (const view of ['front', 'back'] as const) {
    it(`${style}/${view}: все зоны — кнопки с подписью, tabindex и aria-pressed; svg помечен направлением`, () => {
      const w = mk({ visualStyle: style, view })
      const svg = w.get('svg[data-visual-style]')
      expect(svg.attributes('data-visual-style')).toBe(style)
      expect(svg.classes()).toContain('muscle-map-svg--' + style)
      const zones = w.findAll('[data-muscle]')
      expect(zones.length).toBe(zonesOf(style, view).length)
      for (const z of zones) {
        expect(z.attributes('role')).toBe('button')
        expect(z.attributes('tabindex')).toBe('0')
        expect(z.attributes('aria-pressed')).toBe('false')
        expect(z.attributes('aria-label')).toBe('Зона ' + z.attributes('data-muscle'))
        expect(z.attributes('data-state')).toBe('idle')
      }
    })
  }
  it('декор не фокусируется и скрыт от скринридера', () => {
    const w = mk({ visualStyle: 'tech' })
    for (const el of w.findAll('svg *:not([data-muscle])')) expect(['true', undefined]).toContain(el.attributes('aria-hidden') ?? (el.element.tagName === 'svg' ? undefined : 'true'))
    expect(w.findAll('svg [tabindex]').every((e) => e.attributes('data-muscle'))).toBe(true)
  })
})

describe('MuscleModelFigure: состояния', () => {
  it('выбор: класс selected, aria-pressed и data-selected только у выбранной группы (все её элементы)', () => {
    const w = mk({ selected: 'forearms', view: 'back' })
    const f = w.findAll('[data-muscle="forearms"]')
    expect(f.length).toBeGreaterThan(1) // у предплечий в A несколько сегментов
    for (const z of f) { expect(z.classes()).toContain('selected'); expect(z.attributes('aria-pressed')).toBe('true'); expect(z.attributes('data-selected')).toBe('true') }
    expect(w.findAll('.selected').every((z) => z.attributes('data-muscle') === 'forearms')).toBe(true)
  })
  it('«задействована»: data-state=done, штрих сплошной; в «Анатомии» заливка — градиент этой же фигуры', () => {
    const w = mk({ stateOf: (m: string) => ({ done: m === 'chest', heat: null, opacity: null }) })
    const chest = w.get('[data-muscle="chest"]'), quads = w.get('[data-muscle="quads"]')
    expect(chest.attributes('data-state')).toBe('done')
    expect(chest.attributes('style')).toContain('stroke-dasharray: none')
    expect(chest.attributes('style')).toContain('url(#fleshHot-front)')
    expect(quads.attributes('style')).toContain('stroke-dasharray: 1.2 0.8') // второй признак, не только цвет
  })
  it('нагрузка: ступень в data-heat, плотность — через opacity только у задействованных', () => {
    const w = mk({ stateOf: (m: string) => ({ done: m === 'chest', heat: m === 'chest' ? 2 : 0, opacity: m === 'chest' ? 0.7 : null }) })
    expect(w.get('[data-muscle="chest"]').attributes('data-heat')).toBe('2')
    expect(w.get('[data-muscle="chest"]').attributes('style')).toContain('opacity: 0.7')
    expect(w.get('[data-muscle="quads"]').attributes('style') ?? '').not.toContain('opacity')
  })
  it('id градиентов не повторяются между проекциями: у каждой фигуры свой суффикс', () => {
    const a = mk({ view: 'front' }), b = mk({ view: 'back' })
    const ids = (w: ReturnType<typeof mk>) => w.findAll('defs [id]').map((e) => e.attributes('id'))
    expect(ids(a)).toEqual(['flesh-front', 'fleshHot-front'])
    expect(ids(b)).toEqual(['flesh-back', 'fleshHot-back'])
    expect(a.html()).not.toMatch(/url\(#flesh\)/)
  })
  it('«Техно»: подсвечиваются только узлы выбранной группы; наложение только в этом направлении', () => {
    const w = mk({ visualStyle: 'tech', selected: 'chest' })
    const lit = w.findAll('.node-selected')
    expect(lit.length).toBeGreaterThan(0)
    expect(lit.every((n) => n.attributes('data-node-for') === 'chest')).toBe(true)
    expect(w.find('.muscle-tech-overlay').exists()).toBe(true)
    expect(mk({ visualStyle: 'atlas' }).find('.muscle-tech-overlay').exists()).toBe(false)
  })
  it('голова: метка есть всегда, зелёная только в режиме «Учёба»', () => {
    expect(mk().get('[data-testid="muscle-head"]').attributes('fill')).toBe('none')
    expect(mk({ studyRecent: true }).get('[data-testid="muscle-head"]').attributes('fill')).toBe('var(--success)')
  })
})

describe('MuscleModelFigure: события', () => {
  it('клик, Enter и Space выбирают группу (и ничего больше)', async () => {
    const w = mk()
    const chest = w.get('[data-muscle="chest"]')
    await chest.trigger('click'); await chest.trigger('keydown', { key: 'Enter' }); await chest.trigger('keydown', { key: ' ' }); await chest.trigger('keydown', { key: 'a' })
    expect(w.emitted('select')).toEqual([['chest'], ['chest'], ['chest']])
  })
})
