import { describe, expect, it } from 'vitest'
import { BACK_SHAPES, FRONT_SHAPES } from './muscleShapes'
import { MUSCLE_IDS } from './muscles'

describe('anatomical muscle map shapes', () => {
  it('uses curved SVG paths and keeps every muscle represented on both views where applicable', () => {
    expect(FRONT_SHAPES.length).toBeGreaterThan(10)
    expect(BACK_SHAPES.length).toBeGreaterThan(10)
    expect(FRONT_SHAPES.every((s) => s.tag === 'path' && String(s.attrs.d).startsWith('M'))).toBe(true)
    expect(BACK_SHAPES.every((s) => s.tag === 'path' && String(s.attrs.d).startsWith('M'))).toBe(true)

    const front = new Set(FRONT_SHAPES.map((s) => s.muscle))
    const back = new Set(BACK_SHAPES.map((s) => s.muscle))
    expect([...front]).toEqual(expect.arrayContaining(['chest', 'shoulders', 'biceps', 'forearms', 'abs', 'quads', 'calves']))
    expect([...back]).toEqual(expect.arrayContaining(['back', 'shoulders', 'triceps', 'forearms', 'lower_back', 'glutes', 'hamstrings', 'calves']))
    expect([...MUSCLE_IDS].filter((m) => m === 'chest' || m === 'abs')).toEqual(expect.arrayContaining(['chest', 'abs']))
  })

  it('keeps mirrored left/right contours for paired muscles', () => {
    const chest = FRONT_SHAPES.filter((s) => s.muscle === 'chest')
    const quads = FRONT_SHAPES.filter((s) => s.muscle === 'quads')
    expect(chest).toHaveLength(2)
    expect(quads).toHaveLength(2)
    expect(chest[0].attrs.d).not.toBe(chest[1].attrs.d)
    expect(quads[0].attrs.d).not.toBe(quads[1].attrs.d)
  })
})
