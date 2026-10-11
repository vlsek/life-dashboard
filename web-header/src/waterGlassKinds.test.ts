import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterGlass from './components/WaterGlass.vue'
import { waterGlassStyle } from './lib/useWaterGlass'
import type { WaterGlassStyle } from './lib/waterGlass'

const glass = (ml: number) => mount(WaterGlass, { props: { todayMl: ml, normMl: 2000, title: 't' } })

describe('вид стакана в шапке (57.2б)', () => {
  beforeEach(() => { waterGlassStyle.value = 'glass' })
  for (const s of ['glass', 'mug', 'bottle', 'flask', 'goblet'] as WaterGlassStyle[]) {
    it(`рисует форму «${s}» и золотой контур на 100 %`, async () => {
      waterGlassStyle.value = s
      const w = glass(2000)
      const svg = w.find('[data-test="water-glass"]')
      expect(svg.attributes('data-glass')).toBe(s)
      expect(w.find('[data-test="glass-sheen"]').exists()).toBe(true)
      expect(glass(500).find('[data-test="glass-sheen"]').exists()).toBe(false)
    })
  }
})
