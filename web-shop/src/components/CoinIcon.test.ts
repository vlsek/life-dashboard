import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CoinIcon from './CoinIcon.vue'

describe('CoinIcon (BACKLOG 14, 11:16: монеты с огоньком)', () => {
  it('рисует монету и огонёк (внешний и внутренний слой), декоративно скрыта от скринридеров', () => {
    const w = mount(CoinIcon)
    const svg = w.find('svg')
    expect(svg.classes()).toContain('coin-icon')
    expect(svg.attributes('aria-hidden')).toBe('true')
    for (const cls of ['coin-body', 'coin-ring', 'coin-flame-outer', 'coin-flame-inner']) {
      expect(w.find(`.${cls}`).exists(), cls).toBe(true)
    }
  })

  it('размер 1em и посадка как у <Icon>: заменяет его без сдвига вёрстки; extraStyle пробрасывается', () => {
    const w = mount(CoinIcon, { props: { extraStyle: 'margin-right:0.3em;' } })
    const cls = w.find('svg').classes()
    expect(cls).toEqual(expect.arrayContaining(['h-[1em]', 'w-[1em]', 'shrink-0']))
    expect(w.find('svg').attributes('style')).toContain('margin-right')
  })
})
