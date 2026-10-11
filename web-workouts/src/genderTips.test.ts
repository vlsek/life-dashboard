import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MuscleMap from './components/MuscleMap.vue'
import { usuallySkipped } from './lib/genderTips'

// BACKLOG 58.10: шраги женщинам обычно не нужны — мягкая пометка и конец списка рекомендаций; мужчинам и без пола — как раньше.
describe('подсказки по полу (58.10)', () => {
  it('чистая логика: шраги помечаются только для женщин', () => {
    expect(usuallySkipped('shrug', 'female')).toBe(true)
    expect(usuallySkipped('shrug', 'male')).toBe(false)
    expect(usuallySkipped('shrug', null)).toBe(false)
    expect(usuallySkipped('squat', 'female')).toBe(false)
  })

  async function open(gender: 'male' | 'female' | null) {
    const w = mount(MuscleMap, { props: { entries: [], exercises: [], embedded: true, gender }, attachTo: document.body })
    await w.find('[data-muscle="back"]').trigger('click')
    return w
  }
  const items = (w: Awaited<ReturnType<typeof open>>) => w.findAll('[data-testid="muscle-suggestions"] li')

  it('женщина: «Шраги» в конце списка с пометкой', async () => {
    const w = await open('female')
    const li = items(w)
    expect(li.length).toBeGreaterThan(1)
    const last = li[li.length - 1]
    expect(last.text()).toMatch(/Шраги|Shrugs/)
    expect(last.find('[data-testid="muscle-suggest-skip"]').exists()).toBe(true)
    expect(li.filter((x) => x.find('[data-testid="muscle-suggest-skip"]').exists())).toHaveLength(1)
  })

  it('мужчина и пол неизвестен: без пометок, порядок прежний', async () => {
    for (const g of ['male', null] as const) {
      const w = await open(g)
      expect(w.find('[data-testid="muscle-suggest-skip"]').exists()).toBe(false)
      expect(items(w).some((x) => /Шраги|Shrugs/.test(x.text()))).toBe(true)
    }
  })
})
