import { describe, expect, it } from 'vitest'
import { readiness } from './lib/muscleReadiness'

describe('readiness', () => {
  it('обычная нагрузка: сегодня — нагружена, вчера — восстанавливается, позавчера — готова', () => {
    expect(readiness('2026-11-02', 4, '2026-11-02')).toBe('loaded')
    expect(readiness('2026-11-01', 4, '2026-11-02')).toBe('recovering')
    expect(readiness('2026-10-31', 4, '2026-11-02')).toBe('ready')
  })
  it('тяжёлая тренировка (8+ подходов) отодвигает готовность на день', () => {
    expect(readiness('2026-11-01', 8, '2026-11-02')).toBe('loaded')
    expect(readiness('2026-10-31', 8, '2026-11-02')).toBe('recovering')
    expect(readiness('2026-10-30', 8, '2026-11-02')).toBe('ready')
  })
  it('никогда не тренировали — null', () => {
    expect(readiness(undefined, 0, '2026-11-02')).toBeNull()
    expect(readiness(null, 0, '2026-11-02')).toBeNull()
  })
})
