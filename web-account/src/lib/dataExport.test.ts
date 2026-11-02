import { describe, expect, it } from 'vitest'
import { PAGE, buildCsv, buildJson, buildZip, collectExport, crc32, csvCell, exportCsvZip, exportFileName, fetchAllRows, readme, totalRows, type ExportTable, type SbReader } from './dataExport'

const T: ExportTable = { name: 'books', userCol: 'user_id', ru: 'Книги', en: 'Books' }

// Подмена supabase: таблицы с готовыми строками; фиксируем, как просили (колонка/значение/диапазон/порядок)
function reader(db: Record<string, Record<string, unknown>[]>, opts: { noIdColumn?: boolean; failTable?: string } = {}) {
  const calls: { table: string; col: string; v: string; range: [number, number]; ordered: boolean }[] = []
  const sb: SbReader = {
    from: (table) => ({
      select: () => ({
        eq: (col, v) => {
          const run = (range: [number, number], ordered: boolean) => {
            calls.push({ table, col, v, range, ordered })
            if (opts.failTable === table) return Promise.resolve({ data: null, error: { message: 'relation "' + table + '" does not exist' } })
            if (ordered && opts.noIdColumn) return Promise.resolve({ data: null, error: { message: 'column books.id does not exist' } })
            const rows = (db[table] ?? []).filter((r) => r[col] === v).slice(range[0], range[1] + 1)
            return Promise.resolve({ data: rows, error: null })
          }
          return {
            order: () => ({ range: (a: number, b: number) => run([a, b], true) }),
            range: (a: number, b: number) => run([a, b], false),
          }
        },
      }),
    }),
  }
  return { sb, calls }
}
const many = (n: number, uid = 'u1') => Array.from({ length: n }, (_, i) => ({ id: i, user_id: uid, title: 'Книга ' + i }))

describe('fetchAllRows', () => {
  it('читает постранично по 1000 и склеивает: 2500 строк → 3 запроса', async () => {
    const { sb, calls } = reader({ books: many(2500) })
    const rows = await fetchAllRows(sb, T, 'u1')
    expect(rows.length).toBe(2500)
    expect(calls.map((c) => c.range)).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
    expect(PAGE).toBe(1000)
  })
  it('ровно 1000 строк — проверяет и следующую страницу (она пустая)', async () => {
    const { sb, calls } = reader({ books: many(1000) })
    expect((await fetchAllRows(sb, T, 'u1')).length).toBe(1000)
    expect(calls.length).toBe(2)
  })
  it('отбирает только свои строки по колонке владельца (чужие не попадают)', async () => {
    const { sb, calls } = reader({ books: [...many(3, 'u1'), ...many(5, 'u2')] })
    expect((await fetchAllRows(sb, T, 'u1')).length).toBe(3)
    expect(calls.every((c) => c.col === 'user_id' && c.v === 'u1')).toBe(true)
  })
  it('нет колонки id — повторяет без сортировки', async () => {
    const { sb, calls } = reader({ books: many(2) }, { noIdColumn: true })
    expect((await fetchAllRows(sb, T, 'u1')).length).toBe(2)
    expect(calls.map((c) => c.ordered)).toEqual([true, false])
  })
  it('ошибка базы пробрасывается с её текстом', async () => {
    const { sb } = reader({}, { failTable: 'books' })
    await expect(fetchAllRows(sb, T, 'u1')).rejects.toThrow('does not exist')
  })
})

describe('collectExport', () => {
  it('таблица, которой нет, попадает в skipped, остальные выгружаются; прогресс доходит до конца', async () => {
    const { sb } = reader({ books: many(2), metrics: many(1) }, { failTable: 'vocabulary' })
    const prog: number[] = []
    const tables: ExportTable[] = [T, { name: 'vocabulary', userCol: 'user_id', ru: 'Слова', en: 'Vocabulary' }, { name: 'metrics', userCol: 'user_id', ru: 'Метрики', en: 'Metrics' }]
    const r = await collectExport(sb, 'u1', new Date('2026-11-01T10:00:00Z'), tables, (d) => prog.push(d))
    expect(Object.keys(r.tables)).toEqual(['books', 'metrics'])
    expect(Object.keys(r.skipped)).toEqual(['vocabulary'])
    expect(totalRows(r)).toBe(3)
    expect(prog).toEqual([1, 2, 3])
  })
})

describe('CSV', () => {
  it('экранирует кавычки, запятые, переводы строк; вложенное — JSON; пустое — пусто', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('он сказал "да"')).toBe('"он сказал ""да"""')
    expect(csvCell('строка\nвторая')).toBe('"строка\nвторая"')
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"')
    expect(csvCell([1, 2])).toBe('"[1,2]"')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(0)).toBe('0')
    expect(csvCell(false)).toBe('false')
  })
  it('колонки — объединение ключей всех строк, BOM и CRLF', () => {
    const csv = buildCsv([{ a: 1, b: 'x' }, { a: 2, c: 'y' }])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual(['a,b,c', '1,x,', '2,,y', ''])
  })
})

describe('JSON и README', () => {
  const r = { exportedAt: '2026-11-01T10:00:00.000Z', userId: 'u1', tables: { books: [{ id: 1, title: 'Т' }], metrics: [] }, skipped: { vocabulary: 'нет таблицы' } }
  it('JSON: формат, дата, пользователь, таблицы и пропущенное', () => {
    const j = JSON.parse(buildJson(r))
    expect(j).toMatchObject({ format: 'life-dashboard-export-v1', user_id: 'u1', exported_at: '2026-11-01T10:00:00.000Z', skipped: { vocabulary: 'нет таблицы' } })
    expect(j.tables.books).toEqual([{ id: 1, title: 'Т' }])
  })
  it('README: файл только у непустых таблиц, пустые помечены, пропущенные перечислены', () => {
    const tables: ExportTable[] = [T, { name: 'metrics', userCol: 'user_id', ru: 'Метрики', en: 'Metrics' }]
    const ru = readme(r, 'ru', tables)
    expect(ru).toContain('books.csv — Книги (1)')
    expect(ru).toContain('metrics — Метрики: пусто, файла нет')
    expect(ru).toContain('vocabulary: нет таблицы')
    expect(readme(r, 'en', tables)).toContain('books.csv — Books (1)')
  })
  it('имя файла с датой', () => {
    expect(exportFileName('json', new Date('2026-11-01T10:00:00Z'))).toBe('life-dashboard-data-2026-11-01.json')
    expect(exportFileName('zip', new Date('2026-11-01T10:00:00Z'))).toBe('life-dashboard-data-2026-11-01.zip')
  })
})

describe('ZIP', () => {
  it('crc32 совпадает с эталоном («123456789» → CBF43926)', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926')
    expect(crc32(new Uint8Array())).toBe(0)
  })
  it('структура: локальные заголовки, центральный каталог, конец; число файлов; кириллица в именах помечена UTF-8', () => {
    const z = buildZip([{ name: 'a.txt', data: 'привет' }, { name: 'тест.csv', data: 'x' }], new Date(2026, 10, 1, 10, 0, 0))
    const dv = new DataView(z.buffer, z.byteOffset, z.byteLength)
    expect(dv.getUint32(0, true)).toBe(0x04034b50)
    const eocd = z.length - 22
    expect(dv.getUint32(eocd, true)).toBe(0x06054b50)
    expect(dv.getUint16(eocd + 10, true)).toBe(2) // записей в каталоге
    const cdOffset = dv.getUint32(eocd + 16, true)
    expect(dv.getUint32(cdOffset, true)).toBe(0x02014b50)
    expect(dv.getUint16(6, true) & 0x0800).toBe(0x0800) // флаг UTF-8 в первом заголовке
    expect(dv.getUint32(14, true)).toBe(crc32(new TextEncoder().encode('привет')))
    expect(dv.getUint32(22, true)).toBe(new TextEncoder().encode('привет').length) // несжатый размер
  })
  it('exportCsvZip: README и файлы только у непустых таблиц', () => {
    const z = exportCsvZip({ exportedAt: 'x', userId: 'u', tables: { books: [{ a: 1 }], metrics: [] }, skipped: {} }, 'ru')
    const text = new TextDecoder().decode(z)
    expect(text).toContain('README.txt')
    expect(text).toContain('books.csv')
    expect(text).not.toContain('metrics.csv')
  })
})
