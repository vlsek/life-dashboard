import { describe, it, expect } from 'vitest'
import { postAuthTarget, ROUTES } from './routes'

describe('postAuthTarget', () => {
  it('onboarded users go to the dashboard, everyone else to onboarding', () => {
    expect(postAuthTarget({ onboarded: true })).toBe(ROUTES.dashboard)
    expect(postAuthTarget({ onboarded: false })).toBe(ROUTES.onboarding)
    expect(postAuthTarget(null)).toBe(ROUTES.onboarding)
    expect(postAuthTarget(undefined)).toBe(ROUTES.onboarding)
  })
})

describe('login screen has no link back to the portfolio (BACKLOG 1.1)', () => {
  it('ROUTES no longer carries a portfolio address', () => {
    expect('portfolio' in ROUTES).toBe(false)
  })
})
