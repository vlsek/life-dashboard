import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CoinIcon from './CoinIcon.vue'

describe('CoinIcon (BACKLOG 14, 11:16: монеты с огоньком)', () => {
  it('рисует монету и огонёк (внешний и внутренний слой), декоративно скрыта от скринридеров', () => {
    const w = mount(CoinIcon)
    const svg = w.find('svg')
    expect(svg.classes()).toContain('coin-icon')
    expect(svg.attributes('aria-hidden')).toBe('true')
    for (const cls of ['coin-body', 'coin-rim', 'coin-ring', 'coin-shine', 'coin-flame-outer', 'coin-flame-inner']) {
      expect(w.find(`.${cls}`).exists(), cls).toBe(true)
    }
  })

  it('читается как монета (BACKLOG 16, 13:28): диск на всю клетку 24×24, огонёк внутри диска, а не над ним', () => {
    const w = mount(CoinIcon)
    const body = w.find('.coin-body')
    expect(body.attributes('cx')).toBe('12')
    expect(body.attributes('cy')).toBe('12')
    expect(Number(body.attributes('r'))).toBeGreaterThanOrEqual(10) // раньше r=6,8 — маленький шарик с пустым полем вокруг
    // кант и бортик — концентрические круги внутри диска
    expect(Number(w.find('.coin-rim').attributes('r'))).toBeLessThan(Number(body.attributes('r')))
    expect(Number(w.find('.coin-ring').attributes('r'))).toBeLessThan(Number(w.find('.coin-rim').attributes('r')))
    // оба слоя огонька лежат в группе-эмблеме, которая перенесена в центр диска
    const emblem = w.find('.coin-emblem')
    expect(emblem.exists()).toBe(true)
    expect(emblem.find('.coin-flame-outer').exists() && emblem.find('.coin-flame-inner').exists()).toBe(true)
    expect(emblem.attributes('transform')).toContain('translate(12 12.3)')
  })

  it('размер 1em и посадка как у <Icon>: заменяет его без сдвига вёрстки; extraStyle пробрасывается', () => {
    const w = mount(CoinIcon, { props: { extraStyle: 'margin-right:0.3em;' } })
    const cls = w.find('svg').classes()
    expect(cls).toEqual(expect.arrayContaining(['h-[1em]', 'w-[1em]', 'shrink-0']))
    expect(w.find('svg').attributes('style')).toContain('margin-right')
  })
})
