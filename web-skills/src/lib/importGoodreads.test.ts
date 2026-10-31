import { describe, expect, it } from 'vitest'
import { bookKey, importRows, parseCsv, parseGoodreads, parseGoodreadsDate, planImport } from './importGoodreads'

describe('parseCsv', () => {
  it('кавычки, запятые и переводы строк внутри поля, "" как кавычка, CRLF, BOM', () => {
    const rows = parseCsv('\uFEFFa,b\r\n"x, y","он сказал ""да""\nи ушёл"\r\n\r\n1,2')
    expect(rows).toEqual([['a', 'b'], ['x, y', 'он сказал "да"\nи ушёл'], ['1', '2']])
  })
  it('последняя строка без перевода и пустые поля', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']])
  })
})

describe('parseGoodreadsDate', () => {
  it('2024/03/15 и 2024-3-5 — дата; неполная, несуществующая и мусор — null', () => {
    expect(parseGoodreadsDate('2024/03/15')).toBe('2024-03-15')
    expect(parseGoodreadsDate('2024-3-5')).toBe('2024-03-05')
    expect(parseGoodreadsDate('2024/03')).toBeNull()
    expect(parseGoodreadsDate('2024/02/30')).toBeNull()
    expect(parseGoodreadsDate('')).toBeNull()
  })
})

const CSV = [
  'Book Id,Title,Author,My Rating,Exclusive Shelf,Date Read,Date Added,Number of Pages',
  '1,"Dune (Dune, #1)",Frank Herbert,5,read,2024/03/15,2023/01/01,412',
  '2,Мастер и Маргарита,Михаил Булгаков,4,read,,2022/05/05,480',
  '3,"The Hobbit",J.R.R. Tolkien,0,to-read,,2024/01/01,300',
  '4,Currently One,Someone,0,currently-reading,,2024/02/02,100',
  '5,,Nobody,0,read,2024/01/01,2024/01/01,10',
].join('\n')

describe('parseGoodreads', () => {
  it('читает прочитанные (с датой прочтения или, если её нет, датой добавления), «хочу прочитать» и «читаю» как «в планах»', () => {
    const r = parseGoodreads(CSV)
    expect(r.error).toBeNull()
    expect(r.books).toEqual([
      { title: 'Dune (Dune, #1)', author: 'Frank Herbert', status: 'done', doneDate: '2024-03-15' },
      { title: 'Мастер и Маргарита', author: 'Михаил Булгаков', status: 'done', doneDate: '2022-05-05' },
      { title: 'The Hobbit', author: 'J.R.R. Tolkien', status: 'to_read', doneDate: null },
      { title: 'Currently One', author: 'Someone', status: 'to_read', doneDate: null },
    ]) // строка без названия пропущена
  })
  it('пустой файл и чужой CSV без колонки Title — понятные ошибки', () => {
    expect(parseGoodreads('').error).toBe('empty')
    expect(parseGoodreads('Title\n').error).toBe('empty')
    expect(parseGoodreads('a,b\n1,2').error).toBe('noColumns')
  })
})

describe('planImport', () => {
  it('дубли по названию+автору (регистр и пробелы не важны) — с имеющимися и внутри файла', () => {
    const parsed = [
      { title: 'Dune', author: 'Frank Herbert', status: 'done' as const, doneDate: '2024-01-01' },
      { title: ' dune ', author: 'frank  herbert', status: 'done' as const, doneDate: '2024-01-02' },
      { title: 'Emma', author: 'Austen', status: 'to_read' as const, doneDate: null },
      { title: 'Emma', author: 'Другой автор', status: 'to_read' as const, doneDate: null },
    ]
    const p = planImport(parsed, [{ title: 'EMMA', author: 'Austen' }])
    expect(p.toAdd.map((b) => b.title)).toEqual(['Dune', 'Emma']) // Emma Austen уже есть; Emma другого автора — другая книга
    expect(p.duplicates).toBe(2)
    expect([p.done, p.toRead]).toEqual([1, 1])
    expect(bookKey('A  b', null)).toBe('a b|')
  })
})

describe('importRows', () => {
  it('прочитанные — без баллов и с датой, «в планах» — с баллами по умолчанию и без даты', () => {
    const rows = importRows('u1', [
      { title: 'A', author: 'X', status: 'done', doneDate: '2024-01-01' },
      { title: 'B', author: '', status: 'to_read', doneDate: null },
    ])
    expect(rows).toEqual([
      { user_id: 'u1', title: 'A', author: 'X', status: 'done', done_date: '2024-01-01', points: 0 },
      { user_id: 'u1', title: 'B', author: null, status: 'to_read', done_date: null, points: 10 },
    ])
  })
})
