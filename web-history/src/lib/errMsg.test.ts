import { describe, expect, it } from 'vitest'
import { errMsg } from './errMsg'

// Ошибки Supabase — обычные объекты, не Error: раньше показывалось «[object Object]»
describe('errMsg', () => {
  it('Error → message', () => expect(errMsg(new Error('boom'))).toBe('boom'))
  it('ошибка Supabase (объект с message) → её сообщение', () => {
    expect(errMsg({ message: 'new row violates row-level security policy', code: '42501', details: null, hint: null })).toBe('new row violates row-level security policy')
  })
  it('строка остаётся строкой', () => expect(errMsg('нет сети')).toBe('нет сети'))
  it('объект без message → JSON, пустой объект и null → понятный текст, не «[object Object]»', () => {
    expect(errMsg({ code: 'PGRST116' })).toBe('{"code":"PGRST116"}')
    expect(errMsg({})).toBe('unknown error')
    expect(errMsg({ message: '' })).toBe('{"message":""}')
    expect(errMsg(null)).toBe('null')
    expect(errMsg(undefined)).toBe('undefined')
  })
  it('циклический объект не роняет показ ошибки', () => {
    const a: Record<string, unknown> = {}
    a.self = a
    expect(errMsg(a)).toBe('unknown error')
  })
  it('никогда не возвращает «[object Object]»', () => {
    for (const v of [{}, { a: 1 }, { message: 5 }, [], [1, 2], { toString: () => 'x' }]) expect(errMsg(v)).not.toContain('[object Object]')
  })
})
