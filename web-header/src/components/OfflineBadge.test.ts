import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OfflineBadge from './OfflineBadge.vue'
import { badgeKind, type OutboxView } from '../lib/outboxClient'
import type { OutboxEntry } from '../lib/offlineOutbox'

const entry = (o: Partial<OutboxEntry>): OutboxEntry => ({ id: 'a', seq: 1, userId: 'u', key: 'daily_values:2026-10-19:m', table: 'daily_values', op: 'upsert', clientTs: 0, attempts: 0, nextTryAt: 0, status: 'pending', ...o })
function view(status: { pending: number; failed: number }, entries: OutboxEntry[], online = true): OutboxView {
  return { status: ref({ state: 'idle', ...status }), entries: ref(entries), online: ref(online), refresh: vi.fn(), retry: vi.fn(), discard: vi.fn(), stop: vi.fn() } as unknown as OutboxView
}

describe('badgeKind', () => {
  it('приоритет: ошибки > ожидание > офлайн > ничего', () => {
    expect(badgeKind({ state: 'error', pending: 2, failed: 1 }, true)).toBe('error')
    expect(badgeKind({ state: 'pending', pending: 2, failed: 0 }, false)).toBe('pending')
    expect(badgeKind({ state: 'offline', pending: 0, failed: 0 }, false)).toBe('offline')
    expect(badgeKind({ state: 'idle', pending: 0, failed: 0 }, true)).toBeNull()
  })
})

describe('OfflineBadge', () => {
  it('когда всё синхронизировано и сеть есть — плашки нет', () => {
    expect(mount(OfflineBadge, { props: { view: view({ pending: 0, failed: 0 }, []) } }).find('[data-test=offline-badge]').exists()).toBe(false)
  })
  it('показывает число ожидающих и список по нажатию', async () => {
    const w = mount(OfflineBadge, { props: { view: view({ pending: 2, failed: 0 }, [entry({ id: '1' }), entry({ id: '2', table: 'daily_notes', key: 'daily_notes:2026-10-18' })]) } })
    expect(w.find('[data-test=offline-count]').text()).toBe('2')
    await w.find('[data-test=offline-badge]').trigger('click')
    expect(w.findAll('[data-test=offline-waiting]')).toHaveLength(2)
    expect(w.text()).toContain('2026-10-18')
  })
  it('у отклонённых есть «Повторить» и «Удалить»', async () => {
    const v = view({ pending: 0, failed: 1 }, [entry({ id: 'f1', status: 'failed', lastError: 'rls' })])
    const w = mount(OfflineBadge, { props: { view: v } })
    await w.find('[data-test=offline-badge]').trigger('click')
    await w.find('[data-test=offline-retry]').trigger('click')
    await w.find('[data-test=offline-discard]').trigger('click')
    expect(v.retry).toHaveBeenCalledWith('f1')
    expect(v.discard).toHaveBeenCalledWith('f1')
    expect(w.text()).toContain('rls')
  })
  it('офлайн без записей: облачко без числа', () => {
    const w = mount(OfflineBadge, { props: { view: view({ pending: 0, failed: 0 }, [], false) } })
    expect(w.find('[data-test=offline-badge]').exists()).toBe(true)
    expect(w.find('[data-test=offline-count]').exists()).toBe(false)
  })
})
