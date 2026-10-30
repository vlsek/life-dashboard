import { describe, expect, it } from 'vitest'
import { buildIcs, escapeIcsText, foldLine, icsFileName, icsItemsFromMonth } from './ics'

const NOW = new Date('2026-10-29T12:34:56.789Z')

describe('ics: экранирование и свёртка', () => {
  it('экранирует \\ ; , и переводы строк', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne')
  })
  it('короткая строка не меняется; длинная режется на ≤75 октетов, продолжение с пробела', () => {
    expect(foldLine('SUMMARY:коротко')).toBe('SUMMARY:коротко')
    const long = 'SUMMARY:' + 'я'.repeat(100)
    const parts = foldLine(long).split('\r\n')
    expect(parts.length).toBeGreaterThan(1)
    parts.forEach((p, i) => {
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75)
      if (i > 0) expect(p.startsWith(' ')).toBe(true)
    })
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(long) // после склейки текст тот же, символы не разрезаны
  })
  it('эмодзи (4 байта) не разрезается пополам', () => {
    const line = 'SUMMARY:' + '😀'.repeat(30)
    const back = foldLine(line).split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join('')
    expect(back).toBe(line)
  })
})

describe('buildIcs', () => {
  it('календарь с событием на весь день: даты, конец — следующий день, CRLF', () => {
    const s = buildIcs([{ date: '2026-10-31', summary: 'Сходить, к врачу', uid: 'u1@x' }], NOW)
    expect(s.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(s).toContain('DTSTART;VALUE=DATE:20261031')
    expect(s).toContain('DTEND;VALUE=DATE:20261101') // через границу месяца
    expect(s).toContain('SUMMARY:Сходить\\, к врачу')
    expect(s).toContain('DTSTAMP:20261029T123456Z')
    expect(s.split('\r\n').every((l) => !l.includes('\n'))).toBe(true)
  })
  it('конец года: 31 декабря → 1 января', () => {
    expect(buildIcs([{ date: '2026-12-31', summary: 'x', uid: 'u' }], NOW)).toContain('DTEND;VALUE=DATE:20270101')
  })
  it('пустой текст и кривая дата пропускаются', () => {
    const s = buildIcs([{ date: '2026-10-01', summary: '  ', uid: 'a' }, { date: 'oops', summary: 'x', uid: 'b' }], NOW)
    expect(s).not.toContain('BEGIN:VEVENT')
  })
})

describe('icsItemsFromMonth', () => {
  it('планы и сроки целей по порядку дат, выполненное с «✓ », uid стабильны', () => {
    const items = icsItemsFromMonth(
      { '2026-10-05': [{ text: 'Бассейн', done: true }, { text: 'Читать', done: false }], '2026-10-02': [{ text: 'Звонок', done: false }] },
      { '2026-10-10': [{ id: 'g1', name: 'Сдать отчёт', done: false }] },
      'Срок цели: ',
    )
    expect(items.map((i) => [i.date, i.summary, i.uid])).toEqual([
      ['2026-10-02', 'Звонок', 'plan-2026-10-02-0@life-dashboard'],
      ['2026-10-05', '✓ Бассейн', 'plan-2026-10-05-0@life-dashboard'],
      ['2026-10-05', 'Читать', 'plan-2026-10-05-1@life-dashboard'],
      ['2026-10-10', 'Срок цели: Сдать отчёт', 'goal-g1-2026-10-10@life-dashboard'],
    ])
  })
  it('имя файла: месяц с нулём', () => {
    expect(icsFileName(2026, 0)).toBe('life-dashboard-2026-01.ics')
    expect(icsFileName(2026, 10)).toBe('life-dashboard-2026-11.ics')
  })
})
