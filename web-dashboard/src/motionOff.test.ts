import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'
import LayoutModal from './components/LayoutModal.vue'
import { applyMotion, MOTION_KEY, motionDisabled, setMotionOff, systemReducedMotion, userMotionOff } from './lib/motion'
import { defaultLayout } from './lib/layout'

const css: string = readFileSync('src/style.css', 'utf-8')
const html: string = readFileSync('index.html', 'utf-8')
const root = () => document.documentElement

function mockSystemReduce(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} }))
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  root().removeAttribute('data-motion')
  mockSystemReduce(false)
})
afterEach(() => vi.unstubAllGlobals())

describe('lib/motion', () => {
  it('по умолчанию выбора нет: анимации включены, флага на <html> нет', () => {
    expect(userMotionOff()).toBe(false)
    expect(motionDisabled()).toBe(false)
    applyMotion()
    expect(root().hasAttribute('data-motion')).toBe(false)
  })

  it('setMotionOff(true) запоминает выбор и сразу ставит data-motion=off; false — снимает оба', () => {
    setMotionOff(true)
    expect(localStorage.getItem(MOTION_KEY)).toBe('off')
    expect(root().getAttribute('data-motion')).toBe('off')
    expect(userMotionOff()).toBe(true)
    setMotionOff(false)
    expect(localStorage.getItem(MOTION_KEY)).toBeNull()
    expect(root().hasAttribute('data-motion')).toBe(false)
  })

  it('applyMotion после «перезагрузки» восстанавливает флаг из localStorage', () => {
    localStorage.setItem(MOTION_KEY, 'off')
    applyMotion()
    expect(root().getAttribute('data-motion')).toBe('off')
    localStorage.removeItem(MOTION_KEY)
    applyMotion()
    expect(root().hasAttribute('data-motion')).toBe(false)
  })

  it('мусор в хранилище не считается выключением', () => {
    localStorage.setItem(MOTION_KEY, 'yes')
    expect(userMotionOff()).toBe(false)
  })

  it('системное «уменьшить движение» тоже отключает (motionDisabled), но флаг на <html> без выбора человека не ставится', () => {
    mockSystemReduce(true)
    expect(systemReducedMotion()).toBe(true)
    expect(motionDisabled()).toBe(true)
    applyMotion()
    expect(root().hasAttribute('data-motion')).toBe(false)
  })

  it('без matchMedia (старое окружение) — движение разрешено, ошибок нет', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(systemReducedMotion()).toBe(false)
  })
})

describe('LayoutModal: дубль выключателей убран (BACKLOG 513)', () => {
  const mk = () => mount(LayoutModal, { props: { initial: defaultLayout() } })

  it('«Отключить все анимации» и «Поздравления за серии» живут в «Глобальных настройках» (шапка), здесь их больше нет', () => {
    const w = mk()
    expect(w.find('[data-test="motion-toggle"]').exists()).toBe(false)
    expect(w.find('[data-test="celebrate-toggle"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Отключить все анимации')
    w.unmount()
  })

  it('вместо них — подсказка, куда они переехали', () => {
    const w = mk()
    expect(w.find('[data-test="settings-moved-hint"]').text()).toContain('Глобальных настройках')
    w.unmount()
  })
})

describe('общее CSS-правило и ранняя установка флага', () => {
  it('style.css гасит animation и transition у ВСЕГО под html[data-motion=off], включая ::before/::after', () => {
    const m = css.match(/html\[data-motion='off'\] \*,\s*html\[data-motion='off'\] \*::before,\s*html\[data-motion='off'\] \*::after\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toContain('animation: none !important')
    expect(m![1]).toContain('transition: none !important')
  })

  it('index.html ставит флаг ДО первой отрисовки (inline-скрипт в <head>) и тем же ключом, что lib/motion.ts', () => {
    expect(html).toContain(`localStorage.getItem('${MOTION_KEY}') === 'off'`)
    expect(html.indexOf("localStorage.getItem('site_motion')")).toBeLessThan(html.indexOf('</head>'))
  })

  it('main.ts применяет флаг до монтирования приложения', () => {
    const main: string = readFileSync('src/main.ts', 'utf-8')
    expect(main.indexOf('applyMotion()')).toBeGreaterThan(-1)
    expect(main.indexOf('applyMotion()')).toBeLessThan(main.indexOf('.mount('))
  })
})

describe('collapseMotion учитывает выключатель', () => {
  it('исходник проверяет data-motion=off до prefers-reduced-motion', () => {
    const src: string = readFileSync('src/lib/collapseMotion.ts', 'utf-8')
    const a = src.indexOf("getAttribute('data-motion') === 'off'")
    expect(a).toBeGreaterThan(-1)
    expect(a).toBeLessThan(src.indexOf("matchMedia('(prefers-reduced-motion: reduce)')"))
  })
})
