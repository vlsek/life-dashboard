import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞 (срез 4): вход и регистрация показывают ошибки только через authErrorText — адрес Supabase, имена таблиц, TypeError и коды до человека не доходят.
describe('login: показ ошибок без сырого текста драйвера', () => {
  it('useLogin.ts', () => {
    const src: string = readFileSync('src/lib/useLogin.ts', 'utf-8')
    expect(src).toMatch(/authErrorText\(/)
    expect(src).not.toMatch(/describeError/)
    expect(src).not.toMatch(/msg\.value = [^\n]*(error|err)\.message/)
    expect(src).not.toMatch(/\+ (error|err)\.message/)
  })
})
