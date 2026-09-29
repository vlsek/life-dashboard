import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// Подмена useWater — этот тест только про то, ЧТО и КУДА рендерится (Teleport в #topbar-right,
// иконка без текста), а не про саму сеть (это покрыто lib/water.test.ts). См. COORDINATION.md:
// раньше блок «Вода» был отдельной секцией в теле страницы — теперь как на ванильном сайте.
const state = vi.hoisted(() => ({
  metric: null as { id: string } | null,
  loaded: true,
  error: null as string | null,
  todayMl: 500,
  normMl: 2000,
}))

vi.mock('./lib/useWater', () => ({
  useWater: () => ({
    metric: computed(() => state.metric),
    normMl: computed(() => state.normMl),
    autoNormMl: ref(null),
    weightKg: ref(null),
    todayMl: computed(() => state.todayMl),
    loaded: computed(() => state.loaded),
    error: computed(() => state.error),
    init: vi.fn(),
    addMl: vi.fn(),
    getMlForDate: vi.fn(async () => 0),
    saveGoal: vi.fn(),
    createWaterMetric: vi.fn(async () => ({ id: 'new' })),
  }),
}))

import WaterSection from './components/WaterSection.vue'

beforeEach(() => {
  state.metric = null
  state.loaded = true
  state.error = null
  document.body.innerHTML = '<div id="topbar-right"></div>'
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('WaterSection: header placement', () => {
  it('teleports an icon-only setup button into #topbar-right when there is no water metric yet', async () => {
    const w = mount(WaterSection, { props: { userId: 'u1' }, attachTo: document.body })
    await w.vm.$nextTick()
    const topbar = document.getElementById('topbar-right')!
    const btn = topbar.querySelector('[data-test="water-setup-btn"]')
    expect(btn).toBeTruthy()
    expect(btn!.textContent?.trim()).toBe('') // иконка без текстовой подписи, как в шапке ванильного сайта
    expect(document.body.textContent).not.toMatch(/500|2000/) // никакого текстового блока "Вода" в теле страницы
    w.unmount()
  })

  it('teleports the glass badge (icon-only, no ml text) once a water metric exists', async () => {
    state.metric = { id: 'm1' }
    const w = mount(WaterSection, { props: { userId: 'u1' }, attachTo: document.body })
    await w.vm.$nextTick()
    const topbar = document.getElementById('topbar-right')!
    const btn = topbar.querySelector('[data-test="water-badge"]')
    expect(btn).toBeTruthy()
    expect(btn!.textContent?.trim()).toBe('')
    expect(btn!.getAttribute('title')).toContain('500')
    expect(btn!.getAttribute('title')).toContain('2000')
    w.unmount()
  })

  it('clicking the header badge opens the water modal', async () => {
    state.metric = { id: 'm1' }
    const w = mount(WaterSection, { props: { userId: 'u1' }, attachTo: document.body })
    await w.vm.$nextTick()
    const btn = document.getElementById('topbar-right')!.querySelector('[data-test="water-badge"]') as HTMLElement
    btn.click()
    await w.vm.$nextTick()
    expect(document.body.textContent).toMatch(/500/) // модалка открылась и показывает текущее значение
    w.unmount()
  })

  it('renders nothing (no teleport) while there is an error', async () => {
    state.error = 'boom'
    const w = mount(WaterSection, { props: { userId: 'u1' }, attachTo: document.body })
    await w.vm.$nextTick()
    expect(document.getElementById('topbar-right')!.children.length).toBe(0)
    w.unmount()
  })
})
