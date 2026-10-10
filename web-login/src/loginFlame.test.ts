import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в brandFlame.test.ts других пилотов).
import { readFileSync } from 'node:fs'
import SplashFlameLive from './components/splash/SplashFlameLive.vue'

const app: string = readFileSync('src/App.vue', 'utf-8')
const css: string = readFileSync('src/style.css', 'utf-8')

describe('окно входа: живое пламя (BACKLOG 746)', () => {
  it('компонент рисует языки пламени и искры в 64 px', () => {
    const w = mount(SplashFlameLive, { props: { size: 64 } })
    expect(w.find('svg').attributes('width')).toBe('64')
    expect(w.findAll('.flame-layer')).toHaveLength(3)
    expect(w.findAll('.spark').length).toBeGreaterThanOrEqual(3)
  })
  it('App.vue показывает пламя над заголовком', () => {
    expect(app).toContain('<SplashFlameLive :size="64"')
    expect(app.indexOf('<SplashFlameLive')).toBeLessThan(app.indexOf("t('login_title')"))
  })
  it('цвет — акцент темы, есть пульсация свечения и выключатели анимаций', () => {
    expect(css).toContain('fill: var(--accent)')
    expect(css).toContain('@keyframes splash-glow')
    expect(css).toContain('@keyframes flame-morph-out')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain("html[data-motion='off'] .splash-live *")
  })
})
