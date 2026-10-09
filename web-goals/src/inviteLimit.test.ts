import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Миграция 063 (BACKLOG 41): настройка «сколько предложений от друзей в день принимаю» (profiles.goal_invites_per_day), срез 2c.
const db = vi.hoisted(() => ({
  profile: { goal_invites_per_day: null } as { goal_invites_per_day?: number | null } | null,
  selectError: null as null | { code?: string; message: string },
  updateError: null as null | { message: string },
  throwOnSelect: false,
  updates: [] as Record<string, unknown>[],
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      if (table !== 'profiles') throw new Error('unexpected table ' + table)
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => {
          if (db.throwOnSelect) return Promise.reject(new Error('network'))
          return Promise.resolve({ data: db.selectError ? null : db.profile, error: db.selectError })
        },
        update: (patch: Record<string, unknown>) => {
          db.updates.push(patch)
          return { eq: () => Promise.resolve({ error: db.updateError }) }
        },
      }
      return chain
    },
  },
}))

import { DEFAULT_INVITE_LIMIT, effectiveLimit, limitChoices, loadInviteLimit, saveInviteLimit } from './lib/inviteLimit'

beforeEach(() => {
  db.profile = { goal_invites_per_day: null }
  db.selectError = null
  db.updateError = null
  db.throwOnSelect = false
  db.updates = []
})

describe('inviteLimit', () => {
  it('пусто = 10, 0 остаётся 0, мусор и отрицательные = 10, потолок 100', () => {
    expect(effectiveLimit(null)).toBe(DEFAULT_INVITE_LIMIT)
    expect(effectiveLimit(undefined)).toBe(10)
    expect(effectiveLimit(0)).toBe(0)
    expect(effectiveLimit(-3)).toBe(10)
    expect(effectiveLimit(250)).toBe(100)
    expect(effectiveLimit(Number.NaN)).toBe(10)
  })
  it('в списке стандартные значения + своё из базы по порядку', () => {
    expect(limitChoices(10)).toEqual([0, 3, 5, 10, 25, 50])
    expect(limitChoices(7)).toEqual([0, 3, 5, 7, 10, 25, 50])
  })
  it('чтение: значение из базы; нет колонки / нет строки / сбой сети — «не поддерживается»', async () => {
    db.profile = { goal_invites_per_day: 5 }
    expect(await loadInviteLimit('u')).toEqual({ status: 'ok', value: 5 })
    db.profile = { goal_invites_per_day: null }
    expect(await loadInviteLimit('u')).toEqual({ status: 'ok', value: 10 })
    db.selectError = { code: '42703', message: 'column profiles.goal_invites_per_day does not exist' }
    expect(await loadInviteLimit('u')).toEqual({ status: 'unsupported' })
    db.selectError = null
    db.profile = null
    expect(await loadInviteLimit('u')).toEqual({ status: 'unsupported' })
    db.profile = { goal_invites_per_day: 5 }
    db.throwOnSelect = true
    expect(await loadInviteLimit('u')).toEqual({ status: 'unsupported' })
  })
  it('запись: уходит нормализованное число; ошибка — false', async () => {
    expect(await saveInviteLimit('u', 3)).toBe(true)
    expect(await saveInviteLimit('u', 999)).toBe(true)
    expect(db.updates).toEqual([{ goal_invites_per_day: 3 }, { goal_invites_per_day: 100 }])
    db.updateError = { message: 'boom' }
    expect(await saveInviteLimit('u', 5)).toBe(false)
  })
})

void flushPromises
void mount
