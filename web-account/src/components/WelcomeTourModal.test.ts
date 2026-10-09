import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WelcomeTourModal from './WelcomeTourModal.vue'

const touch = (w: ReturnType<typeof mount>, from: number, to: number) => {
  const root = w.find('.fixed')
  root.element.dispatchEvent(Object.assign(new Event('touchstart', { bubbles: true }), { touches: [{ clientX: from, clientY: 100 }] }))
  root.element.dispatchEvent(Object.assign(new Event('touchend', { bubbles: true }), { changedTouches: [{ clientX: to, clientY: 100 }] }))
}

describe('WelcomeTourModal: свайп и анимация', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('свайп влево — следующий шаг, вправо — назад; направление задаёт класс перехода', async () => {
    const w = mount(WelcomeTourModal, { attachTo: document.body })
    const dots = () => w.findAll('.rounded-full').map((d) => (d.attributes('style') ?? '').includes('--accent'))
    expect(dots().indexOf(true)).toBe(0)
    touch(w, 300, 100)
    await w.vm.$nextTick()
    expect(dots().indexOf(true)).toBe(1)
    expect(w.find('[data-testid="tour-viewport"]').html()).toContain('tour-next')
    touch(w, 100, 300)
    await w.vm.$nextTick()
    expect(dots().indexOf(true)).toBe(0)
    w.unmount()
  })

  it('короткий или вертикальный жест шаг не меняет', async () => {
    const w = mount(WelcomeTourModal)
    touch(w, 200, 180)
    await w.vm.$nextTick()
    expect(w.findAll('.rounded-full').map((d) => (d.attributes('style') ?? '').includes('--accent')).indexOf(true)).toBe(0)
  })
})
