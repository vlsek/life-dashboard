import { describe, expect, it } from 'vitest'
import { categoriesOf, rankExercises } from './exercisePick'
import type { Exercise } from './types'

const ex = (id: string, name: string) => ({ id, name } as Exercise)
const list = [ex('a', 'Жим лёжа'), ex('b', 'Присед'), ex('c', 'Тяга'), ex('d', 'Планка')]
describe('rankExercises', () => {
  it('недавние сверху, при равной дате — чаще делаемые, без истории — по алфавиту в конце', () => {
    const entries = [
      { exercise_id: 'b', date: '2026-10-01' }, { exercise_id: 'a', date: '2026-10-20' },
      { exercise_id: 'c', date: '2026-10-20' }, { exercise_id: 'c', date: '2026-09-01' },
    ]
    expect(rankExercises(list, entries, '').map((r) => r.exercise.id)).toEqual(['c', 'a', 'b', 'd'])
    expect(rankExercises(list, entries, '')[0]).toMatchObject({ last: '2026-10-20', count: 2 })
  })
  it('поиск: регистр и «ё» не мешают; пустой запрос — все', () => {
    expect(rankExercises(list, [], 'ЖИМ ЛЕЖА').map((r) => r.exercise.id)).toEqual(['a'])
    expect(rankExercises(list, [], 'тяг').map((r) => r.exercise.id)).toEqual(['c'])
    expect(rankExercises(list, [], '   ')).toHaveLength(4)
    expect(rankExercises(list, [], 'zzz')).toEqual([])
  })
})

describe('фильтр по категории', () => {
  const cx = (id: string, name: string, category: string | null) => ({ id, name, category } as Exercise)
  const l = [cx('a', 'Жим', 'Грудь'), cx('b', 'Разводка', 'Грудь'), cx('c', 'Присед', 'Ноги'), cx('d', 'Планка', null), cx('e', 'Тяга', ' ')]
  it('категории: без пустых и повторов, по алфавиту', () => { expect(categoriesOf(l)).toEqual(['Грудь', 'Ноги']) })
  it('фильтр + поиск вместе; null — без фильтра', () => {
    expect(rankExercises(l, [], '', 'Грудь').map((r) => r.exercise.id)).toEqual(['a', 'b'])
    expect(rankExercises(l, [], 'раз', 'Грудь').map((r) => r.exercise.id)).toEqual(['b'])
    expect(rankExercises(l, [], 'раз', 'Ноги')).toEqual([])
    expect(rankExercises(l, [], '', null)).toHaveLength(5)
  })
})

