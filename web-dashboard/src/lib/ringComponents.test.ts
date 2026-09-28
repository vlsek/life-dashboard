import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarProgress from '../components/AvatarProgress.vue'
import HeaderProgressBadge from '../components/HeaderProgressBadge.vue'
import type { RingData } from './ringPlacement'

const ring = (o: Partial<RingData> = {}): RingData => ({ basePct: 0.5, bonusPct: 0, totalPct: 50, title: 'Day: 50%', ...o })

describe('AvatarProgress', () => {
  it('shows the ring and percent under the avatar when there is data', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring: ring() } })
    expect(w.find('[data-test="avatar-ring"]').exists()).toBe(true)
    expect(w.text()).toContain('50%')
    w.unmount()
  })
  it('draws the bonus layer only when there is a bonus', () => {
    const plain = mount(AvatarProgress, { props: { avatarUrl: null, ring: ring() } })
    const bonus = mount(AvatarProgress, { props: { avatarUrl: null, ring: ring({ bonusPct: 20, totalPct: 70 }) } })
    expect(plain.findAll('[data-test="avatar-ring"] circle')).toHaveLength(2)
    expect(bonus.findAll('[data-test="avatar-ring"] circle')).toHaveLength(3)
    plain.unmount()
    bonus.unmount()
  })
  it('has no ring or percent without data, but keeps the gear', () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: null, ring: null } })
    expect(w.find('[data-test="avatar-ring"]').exists()).toBe(false)
    expect(w.text()).not.toContain('%')
    expect(w.find('[data-test="avatar-gear"]').exists()).toBe(true)
    w.unmount()
  })
  it('emits pick on the avatar and settings on the gear (gear click does not pick)', async () => {
    const w = mount(AvatarProgress, { props: { avatarUrl: 'x.png', ring: ring() } })
    await w.find('[data-test="avatar-gear"]').trigger('click')
    expect(w.emitted('settings')).toHaveLength(1)
    expect(w.emitted('pick')).toBeUndefined()
    await w.find('img').element.parentElement!.click()
    expect(w.emitted('pick')).toHaveLength(1)
    w.unmount()
  })
})

describe('HeaderProgressBadge', () => {
  let host: HTMLElement
  beforeEach(() => {
    host = document.createElement('div')
    host.id = 'topbar-right'
    document.body.appendChild(host)
  })
  afterEach(() => host.remove())

  it('teleports into #topbar-right with the percent and title', async () => {
    const w = mount(HeaderProgressBadge, { props: { kind: 'day', basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'Day: 40%' }, attachTo: document.body })
    await w.vm.$nextTick()
    const btn = host.querySelector('button[data-kind="day"]') as HTMLButtonElement
    expect(btn).toBeTruthy()
    expect(btn.textContent).toContain('40%')
    expect(btn.title).toBe('Day: 40%')
    w.unmount()
  })
  it('week uses a rounded square (rects), day uses circles', async () => {
    const day = mount(HeaderProgressBadge, { props: { kind: 'day', basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'd' }, attachTo: document.body })
    const week = mount(HeaderProgressBadge, { props: { kind: 'week', basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'w' }, attachTo: document.body })
    await day.vm.$nextTick()
    expect(host.querySelector('button[data-kind="day"] circle')).toBeTruthy()
    expect(host.querySelector('button[data-kind="day"] rect')).toBeNull()
    expect(host.querySelector('button[data-kind="week"] rect')).toBeTruthy()
    day.unmount()
    week.unmount()
  })
  it('emits click', async () => {
    const w = mount(HeaderProgressBadge, { props: { kind: 'day', basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'd' }, attachTo: document.body })
    await w.vm.$nextTick()
    ;(host.querySelector('button') as HTMLButtonElement).click()
    expect(w.emitted('click')).toHaveLength(1)
    w.unmount()
  })
  it('renders nothing when the topbar slot does not exist', async () => {
    host.remove()
    const w = mount(HeaderProgressBadge, { props: { kind: 'day', basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'd' } })
    await w.vm.$nextTick()
    expect(document.querySelector('button[data-kind="day"]')).toBeNull()
    w.unmount()
  })
})
