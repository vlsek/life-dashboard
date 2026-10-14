import { describe, expect, it } from 'vitest'
import { confirmName, fmtDate, isSelf, nameCell } from './admin'
import type { AdminUser } from './types'

const u = (o: Partial<AdminUser> = {}): AdminUser => ({ user_id: 'u1', email: 'a@x.com', display_name: 'Аня', is_admin: false, created_at: '2026-03-07T10:00:00Z', ...o })

describe('admin helpers (порт admin.js)', () => {
  it('fmtDate: ДД.ММ.ГГГГ из ISO, пусто — пустая строка', () => {
    expect(fmtDate('2026-03-07T10:00:00Z')).toBe('07.03.2026')
    expect(fmtDate(null)).toBe('')
    expect(fmtDate(undefined)).toBe('')
    expect(fmtDate('мусор')).toBe('')
  })
  it('isSelf сравнивает user_id', () => {
    expect(isSelf(u(), 'u1')).toBe(true)
    expect(isSelf(u(), 'u2')).toBe(false)
  })
  it('имя в таблице — display_name или «—»; в подтверждении — display_name или e-mail', () => {
    expect(nameCell(u())).toBe('Аня')
    expect(nameCell(u({ display_name: null }))).toBe('—')
    expect(nameCell(u({ display_name: '' }))).toBe('—')
    expect(confirmName(u())).toBe('Аня')
    expect(confirmName(u({ display_name: null }))).toBe('a@x.com')
  })
})
