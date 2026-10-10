import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StreakFlamePicker from './components/StreakFlamePicker.vue'
import { STREAK_FLAME_VARIANTS, STREAK_FLAME_VARIANT_KEY, readStreakFlameVariant } from './lib/streakFlameVariant'

async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG 44.18в (срез 1): выбор вида огонька серии в «Кастомизации».
describe('StreakFlamePicker', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('показывает оба варианта с живым предпросмотром; по умолчанию активно «Единое пламя»', () => {
    const w = mount(StreakFlamePicker)
    for (const v of STREAK_FLAME_VARIANTS) expect(w.find(`[data-testid="streakflame-${v}"]`).exists()).toBe(true)
    expect(w.find('[data-testid="streakflame-flame"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="streakflame-tongues"]').attributes('data-active')).toBe('false')
    expect(w.find('[data-testid="streakflame-flame"] svg.splash-live').exists()).toBe(true)
    expect(w.find('[data-testid="streakflame-tongues"] svg.splash-tongues').exists()).toBe(true)
    expect(w.text()).toContain('Единое пламя')
    expect(w.text()).toContain('Три языка')
  })

  it('«Выбрать» запоминает вариант в localStorage и переключает активную карточку', async () => {
    const w = mount(StreakFlamePicker)
    await w.find('[data-testid="streakflame-tongues"] [data-testid="streakflame-choose"]').trigger('click')
    expect(localStorage.getItem(STREAK_FLAME_VARIANT_KEY)).toBe('tongues')
    expect(readStreakFlameVariant()).toBe('tongues')
    expect(w.find('[data-testid="streakflame-tongues"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="streakflame-flame"]').attributes('data-active')).toBe('false')
    expect(w.find('[data-testid="streakflame-tongues"] [data-testid="streakflame-choose"]').attributes('disabled')).toBeDefined()
  })

  it('если localStorage недоступен — выбор не меняется и показывается ошибка', async () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      const w = mount(StreakFlamePicker)
      await w.find('[data-testid="streakflame-tongues"] [data-testid="streakflame-choose"]').trigger('click')
      expect(w.find('[data-testid="streakflame-flame"]').attributes('data-active')).toBe('true')
      expect(w.find('[data-testid="streakflame-save-error"]').exists()).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })

  it('КОПИЯ реестра в web-dashboard совпадает с этой (страж)', async () => {
    const mine = await readSrc('./lib/streakFlameVariant.ts')
    expect(await readSrc('../../web-dashboard/src/lib/streakFlameVariant.ts')).toBe(mine)
  })
})
