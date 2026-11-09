import { describe, it, expect } from 'vitest'
import { archivedRoutines, loadRoutines, normFolder, routineGroups, setRoutineArchived, setRoutineFolder, FOLDER_MAX, type Routine } from './routines'

const R = (id: string, extra: Partial<Routine> = {}): Routine => ({ id, name: id, items: [{ exercise_id: 'e', target_sets: 3, superset_group: null }], updated_at: '2026-01-01', ...extra })

describe('папки и архив рутин', () => {
  it('normFolder: пробелы, длина, пусто → null', () => {
    expect(normFolder('  Ноги ')).toBe('Ноги')
    expect(normFolder('   ')).toBeNull()
    expect(normFolder('x'.repeat(100))!.length).toBe(FOLDER_MAX)
  })
  it('setRoutineFolder обновляет updated_at и снимает папку пустой строкой', () => {
    const a = setRoutineFolder([R('a'), R('b')], 'a', ' Сплит ', '2026-02-02')
    expect(a[0]).toMatchObject({ folder: 'Сплит', updated_at: '2026-02-02' })
    expect(a[1].updated_at).toBe('2026-01-01')
    expect('folder' in setRoutineFolder(a, 'a', '', '2026-03-03')[0]).toBe(false)
  })
  it('архив: флаг ставится и снимается, архивные не в группах', () => {
    const l = setRoutineArchived([R('a'), R('b')], 'a', true, '2026-02-02')
    expect(archivedRoutines(l).map((r) => r.id)).toEqual(['a'])
    expect(routineGroups(l).flatMap((g) => g.routines.map((r) => r.id))).toEqual(['b'])
    expect(archivedRoutines(setRoutineArchived(l, 'a', false, '2026-03-03'))).toEqual([])
  })
  it('группы: без папки первыми, папки по алфавиту', () => {
    const g = routineGroups([R('a', { folder: 'Я' }), R('b'), R('c', { folder: 'А' }), R('d', { folder: 'Я' })])
    expect(g.map((x) => [x.folder, x.routines.map((r) => r.id)])).toEqual([[null, ['b']], ['А', ['c']], ['Я', ['a', 'd']]])
  })
  it('сохранение в localStorage не теряет папку и архив', () => {
    const store = { getItem: () => JSON.stringify([R('a', { folder: 'Х', archived: true })]) } as unknown as Storage
    expect(loadRoutines(store)[0]).toMatchObject({ folder: 'Х', archived: true })
  })
})
