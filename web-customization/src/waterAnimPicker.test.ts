import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах пилота).
import { readFileSync } from 'node:fs'
import WaterAnimPicker from './components/WaterAnimPicker.vue'
import { WATER_ANIMS, WATER_ANIM_KEY } from './lib/waterAnim'
import { THEME_WATER } from './lib/themeWater'

// Выбор анимации воды в «Кастомизации» (BACKLOG 54.8): ключ общий с «Настройками» шапки, «По теме» снимает выбор, после выбора играет превью.
const read = (p: string): string => readFileSync(p, 'utf-8')
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('WaterAnimPicker', () => {
  it('плитки: «По теме» и шесть вариантов; по умолчанию активна «По теме»', () => {
    const w = mount(WaterAnimPicker)
    expect(WATER_ANIMS.length).toBe(6)
    for (const v of ['auto', ...WATER_ANIMS]) expect(w.find(`[data-testid="wateranim-${v}"]`).exists(), v).toBe(true)
    expect(w.find('[data-testid="wateranim-auto"]').attributes('data-active')).toBe('true')
    w.unmount()
  })

  it('выбор варианта пишется в water_saved_anim (общий ключ с шапкой) и запускает превью', async () => {
    const w = mount(WaterAnimPicker, { attachTo: document.body })
    await w.find('[data-testid="wateranim-pour"] [data-testid="wateranim-choose"]').trigger('click')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBe('pour')
    expect(w.find('[data-testid="wateranim-pour"]').attributes('data-active')).toBe('true')
    await new Promise((r) => setTimeout(r, 30))
    expect(document.querySelector('.water-saved:not(.water-saved-inline)')?.getAttribute('data-variant')).toBe('pour')
    w.unmount()
  })

  it('у каждого варианта — живой зацикленный пример-превью именно этого варианта (57.2)', async () => {
    const w = mount(WaterAnimPicker, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 30))
    for (const v of WATER_ANIMS) {
      const ex = w.find(`[data-testid="wateranim-${v}"] [data-testid="wateranim-example"] .water-saved`)
      expect(ex.exists(), v).toBe(true)
      expect(ex.attributes('data-variant'), v).toBe(v)
      expect(ex.classes()).toContain('water-saved-inline')
    }
    expect(document.querySelector('.water-saved:not(.water-saved-inline)')).toBeNull() // примеры — не оверлеи
    w.unmount()
  })

  it('«По теме» снимает выбор', async () => {
    localStorage.setItem(WATER_ANIM_KEY, 'splash')
    const w = mount(WaterAnimPicker)
    expect(w.find('[data-testid="wateranim-splash"]').attributes('data-active')).toBe('true')
    await w.find('[data-testid="wateranim-auto"] [data-testid="wateranim-choose"]').trigger('click')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBeNull()
    w.unmount()
  })

  it('копии lib и компонента совпадают с Дашбордом (страж)', () => {
    expect(read('src/lib/waterAnim.ts')).toBe(read('../web-dashboard/src/lib/waterAnim.ts'))
    expect(read('src/lib/themeWater.ts')).toBe(read('../web-dashboard/src/lib/themeWater.ts'))
    expect(read('src/components/WaterSavedAnim.vue')).toBe(read('../web-dashboard/src/components/WaterSavedAnim.vue'))
    expect(read('src/lib/waterAnim.ts')).toBe(read('../web-header/src/lib/waterAnim.ts'))
    expect(read('../web-header/src/lib/waterItemSync.ts')).toBe(read('../web-dashboard/src/lib/waterItemSync.ts'))
  })

  it('надета платная анимация из магазина — в разделе выбора появляется пояснение «она главнее»', () => {
    const w1 = mount(WaterAnimPicker)
    expect(w1.find('[data-testid="wateranim-item-on"]').exists()).toBe(false)
    w1.unmount()
    localStorage.setItem('site_water_anim', 'rain')
    const w2 = mount(WaterAnimPicker)
    expect(w2.find('[data-testid="wateranim-item-on"]').exists()).toBe(true)
    w2.unmount()
  })
})

describe('«Показать» у каждой анимации воды (BACKLOG 57.2)', () => {
  const playing = (): string | null | undefined => document.querySelector('.water-saved:not(.water-saved-inline)')?.getAttribute('data-variant')
  const wait = () => new Promise((r) => setTimeout(r, 30))

  it('у «По теме» и всех шести вариантов есть своя кнопка «Показать»', () => {
    const w = mount(WaterAnimPicker)
    for (const v of ['auto', ...WATER_ANIMS]) expect(w.find(`[data-testid="wateranim-${v}"] [data-testid="wateranim-show"]`).exists(), v).toBe(true)
    expect(w.find('[data-testid="wateranim-pour"] [data-testid="wateranim-show"]').text()).toBe('Показать')
    w.unmount()
  })

  it('«Показать» играет ИМЕННО этот вариант и НЕ меняет сохранённый выбор', async () => {
    localStorage.setItem(WATER_ANIM_KEY, 'drops')
    const w = mount(WaterAnimPicker, { attachTo: document.body })
    await w.find('[data-testid="wateranim-splash"] [data-testid="wateranim-show"]').trigger('click')
    await wait()
    expect(playing()).toBe('splash')
    expect(localStorage.getItem(WATER_ANIM_KEY)).toBe('drops')
    expect(w.find('[data-testid="wateranim-drops"]').attributes('data-active')).toBe('true')
    w.unmount()
  })

  it('«По теме» показывает вариант большой темы, а без темы — спокойную волну; общая кнопка играет текущий', async () => {
    const w = mount(WaterAnimPicker, { attachTo: document.body })
    await w.find('[data-testid="wateranim-auto"] [data-testid="wateranim-show"]').trigger('click')
    await wait()
    expect(playing()).toBe('wave')
    document.documentElement.classList.add('theme-nightfall')
    try {
      await w.find('[data-testid="wateranim-auto"] [data-testid="wateranim-show"]').trigger('click')
      await wait()
      expect(playing()).toBe(THEME_WATER['nightfall'] ?? 'wave')
    } finally {
      document.documentElement.classList.remove('theme-nightfall')
    }
    localStorage.setItem(WATER_ANIM_KEY, 'ripple')
    await w.find('[data-testid="wateranim-play"]').trigger('click')
    await wait()
    expect(playing()).toBe('ripple')
    w.unmount()
  })
})
