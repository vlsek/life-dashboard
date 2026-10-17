import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StreakFlamePicker from './components/StreakFlamePicker.vue'
import { STREAK_FLAME_VARIANTS, STREAK_FLAME_VARIANT_KEY, readStreakFlameVariant } from './lib/streakFlameVariant'

async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG 44.18в (срез 2): «Огненное кольцо», «Уголёк» и «Свеча» в «Кастомизации» (раздел «Пламя серии» — самый маленький: было 2 вида, стало 5).
describe('StreakFlamePicker: новые виды', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('пять карточек с подписями; у каждой живой предпросмотр своим компонентом', () => {
    expect([...STREAK_FLAME_VARIANTS]).toEqual(['flame', 'tongues', 'ring', 'ember', 'candle'])
    const w = mount(StreakFlamePicker)
    expect(w.findAll('[data-testid^="streakflame-"][data-active]')).toHaveLength(5)
    for (const label of ['Единое пламя', 'Три языка', 'Огненное кольцо', 'Уголёк', 'Свеча']) expect(w.text()).toContain(label)
    expect(w.find('[data-testid="streakflame-ring"] svg.splash-ring').exists()).toBe(true)
    // «Уголёк» и «Свеча» в предпросмотре показаны на ступени 3 (видны и свечение, и искры)
    expect(w.find('[data-testid="streakflame-ember"] svg.sf-ember').attributes('data-tier')).toBe('3')
    expect(w.find('[data-testid="streakflame-candle"] svg.sf-candle').attributes('data-tier')).toBe('3')
  })

  it.each(['ring', 'ember', 'candle'] as const)('«Выбрать» для «%s» запоминает вид и переключает активную карточку', async (v) => {
    const w = mount(StreakFlamePicker)
    await w.find(`[data-testid="streakflame-${v}"] [data-testid="streakflame-choose"]`).trigger('click')
    expect(localStorage.getItem(STREAK_FLAME_VARIANT_KEY)).toBe(v)
    expect(readStreakFlameVariant()).toBe(v)
    expect(w.find(`[data-testid="streakflame-${v}"]`).attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="streakflame-flame"]').attributes('data-active')).toBe('false')
  })

  it('подсказка раздела больше не говорит «оба вида» (видов пять) — ни по-русски, ни по-английски', () => {
    expect(mount(StreakFlamePicker).text()).toContain('Все виды бесплатные')
    expect(mount(StreakFlamePicker).text()).not.toContain('Оба вида')
    localStorage.setItem('site_lang', 'en')
    const en = mount(StreakFlamePicker)
    expect(en.text()).toContain('All looks are free')
    for (const label of ['Fire ring', 'Ember', 'Candle']) expect(en.text()).toContain(label)
  })
})

describe('копии новых видов в web-dashboard совпадают с этими (страж)', () => {
  it.each(['StreakEmber.vue', 'StreakCandle.vue'])('компонент %s', async (f) => {
    expect(await readSrc('../../web-dashboard/src/components/splash/' + f)).toBe(await readSrc('./components/splash/' + f))
  })
  it('блок CSS «streak-flame-more» одинаков в style.css обоих пилотов', async () => {
    const block = (s: string) => s.slice(s.indexOf('/* streak-flame-more:start */'), s.indexOf('/* streak-flame-more:end */'))
    const mine = block(await readSrc('./style.css'))
    expect(mine.length).toBeGreaterThan(500)
    expect(block(await readSrc('../../web-dashboard/src/style.css'))).toBe(mine)
  })
})
