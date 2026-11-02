import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const water = ref<unknown>(null)
vi.mock('./lib/useInsights', () => ({ useInsights: () => ({ water, load: vi.fn() }) }))
import InsightsCard from './components/InsightsCard.vue'

describe('InsightsCard', () => {
  localStorage.setItem('site_lang', 'ru')
  it('без инсайта карточки нет; с инсайтом — текст и пометка «Корреляция ≠ причина»', async () => {
    const w = mount(InsightsCard, { props: { userId: 'u1' } })
    expect(w.find('[data-testid="insights"]').exists()).toBe(false)
    water.value = { withAvg: 4.1, withoutAvg: 3.2, nWith: 18, nWithout: 14, diff: 0.9 }
    await w.vm.$nextTick()
    expect(w.find('[data-testid="insight-water"]').text()).toContain('4.1 из 5')
    expect(w.find('[data-testid="insights"]').text()).toContain('Корреляция ≠ причина')
  })
})
