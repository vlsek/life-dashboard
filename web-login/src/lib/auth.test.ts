import { describe, it, expect } from 'vitest'
import { describeError } from './auth'
import { postAuthTarget, ROUTES } from './routes'

const labels = { unknownError: 'unknown', errorCode: '(code ', unknownErrorConsole: 'unknown — see console' }

describe('describeError', () => {
  it('falls back to "unknown" for empty errors', () => {
    expect(describeError(null, labels)).toBe('unknown')
    expect(describeError(undefined, labels)).toBe('unknown')
  })

  it('joins message, description and status code like the original', () => {
    expect(describeError({ message: 'Invalid login', error_description: 'bad creds', status: 400 }, labels)).toBe('Invalid login bad creds (code 400)')
    expect(describeError({ message: 'Oops' }, labels)).toBe('Oops')
  })

  it('serialises an object with no known fields instead of returning nothing', () => {
    expect(describeError({ weird: true }, labels)).toBe('{"weird":true}')
  })

  it('handles values that cannot be JSON-serialised', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(describeError(circular, labels)).toBe('[object Object]')
  })
})

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
