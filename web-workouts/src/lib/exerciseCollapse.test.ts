import { beforeEach, describe, expect, it } from 'vitest'
import { exerciseCollapseKey, readExerciseCollapsed, writeExerciseCollapsed } from './exerciseCollapse'

describe('exercise collapse state', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to expanded', () => {
    expect(readExerciseCollapsed('a')).toBe(false)
  })
  it('remembers collapsed per exercise id', () => {
    writeExerciseCollapsed('a', true)
    expect(readExerciseCollapsed('a')).toBe(true)
    expect(readExerciseCollapsed('b')).toBe(false)
  })
  it('removes the key when expanded again', () => {
    writeExerciseCollapsed('a', true)
    writeExerciseCollapsed('a', false)
    expect(localStorage.getItem(exerciseCollapseKey('a'))).toBeNull()
  })
  it('does not collide with category keys', () => {
    expect(exerciseCollapseKey('upper').startsWith('workouts_ex_collapsed:')).toBe(true)
    expect(exerciseCollapseKey('upper')).not.toBe('workouts_collapsed:upper')
  })
})
