import { describe, expect, it } from 'vitest'
import { mergeFriendScope, requestOutcome, splitRequests, toAcceptedIdSet } from './friends'
import type { FriendRequestRow } from './types'

function req(over: Partial<FriendRequestRow>): FriendRequestRow {
  return { id: 'r', other_user_id: 'u', display_name: 'X', avatar_url: null, direction: 'incoming', created_at: '2026-09-28T10:00:00Z', ...over }
}

describe('toAcceptedIdSet', () => {
  it('reads a plain array of uuid strings (setof uuid)', () => {
    expect([...toAcceptedIdSet(['a', 'b'])]).toEqual(['a', 'b'])
  })
  it('unwraps { get_friend_ids: id } objects', () => {
    expect([...toAcceptedIdSet([{ get_friend_ids: 'a' }, { get_friend_ids: 'b' }])]).toEqual(['a', 'b'])
  })
  it('returns an empty set for null / non-arrays / junk entries', () => {
    expect(toAcceptedIdSet(null).size).toBe(0)
    expect(toAcceptedIdSet({}).size).toBe(0)
    expect(toAcceptedIdSet([null, 5, '', {}]).size).toBe(0)
  })
  it('deduplicates', () => {
    expect(toAcceptedIdSet(['a', 'a']).size).toBe(1)
  })
})

describe('mergeFriendScope', () => {
  it('is the union of follows and accepted friends', () => {
    const s = mergeFriendScope(new Set(['zed', 'bob']), new Set(['bob', 'ann']))
    expect([...s].sort()).toEqual(['ann', 'bob', 'zed'])
  })
  it('works when the migration is not applied (no accepted friends)', () => {
    expect([...mergeFriendScope(new Set(['zed']), new Set())]).toEqual(['zed'])
  })
  it('does not mutate its inputs', () => {
    const f = new Set(['a']), a = new Set(['b'])
    mergeFriendScope(f, a)
    expect(f.size).toBe(1)
    expect(a.size).toBe(1)
  })
})

describe('splitRequests', () => {
  it('separates incoming from outgoing, preserving order', () => {
    const rows = [req({ id: '1', direction: 'incoming' }), req({ id: '2', direction: 'outgoing' }), req({ id: '3', direction: 'incoming' })]
    const { incoming, outgoing } = splitRequests(rows)
    expect(incoming.map((r) => r.id)).toEqual(['1', '3'])
    expect(outgoing.map((r) => r.id)).toEqual(['2'])
  })
  it('handles an empty list', () => {
    expect(splitRequests([])).toEqual({ incoming: [], outgoing: [] })
  })
})

describe('requestOutcome', () => {
  it("maps status 'accepted' (matching request) to 'friends'", () => {
    expect(requestOutcome({ status: 'accepted' })).toBe('friends')
  })
  it("maps 'pending' and anything unexpected to 'sent'", () => {
    expect(requestOutcome({ status: 'pending' })).toBe('sent')
    expect(requestOutcome(null)).toBe('sent')
    expect(requestOutcome(undefined)).toBe('sent')
    expect(requestOutcome({})).toBe('sent')
  })
})
