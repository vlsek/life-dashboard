import { describe, expect, it } from 'vitest'
import { NAME_MAX, cleanName, googleProfile } from './googleProfile'

// Файлы читаем через node:fs; имя модуля собрано строкой, чтобы vue-tsc не требовал @types/node для тестов пилота.
async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}
const body = (s: string) => s.split('\n').filter((_l, i, a) => !a.slice(0, i + 1).every((x) => x.startsWith('//'))).join('\n').trim()

describe('cleanName', () => {
  it('убирает пробелы по краям и схлопывает внутри', () => {
    expect(cleanName('  Аня   Иванова ')).toBe('Аня Иванова')
    expect(cleanName('\n\tIvan\u00a0Petrov ')).toBe('Ivan Petrov')
  })
  it('пусто и не строка — пустая строка', () => {
    expect(cleanName('')).toBe('')
    expect(cleanName('   ')).toBe('')
    expect(cleanName(null)).toBe('')
    expect(cleanName(42)).toBe('')
  })
  it('режет до NAME_MAX символов, не ломая эмодзи пополам', () => {
    const long = 'я'.repeat(NAME_MAX + 10)
    expect(Array.from(cleanName(long)).length).toBe(NAME_MAX)
    expect(cleanName('😀'.repeat(NAME_MAX + 5))).toBe('😀'.repeat(NAME_MAX))
  })
})

describe('googleProfile', () => {
  it('full_name приоритетнее name, затем given_name + family_name', () => {
    expect(googleProfile({ user_metadata: { full_name: 'Аня Иванова', name: 'x' } }).name).toBe('Аня Иванова')
    expect(googleProfile({ user_metadata: { name: 'Anna' } }).name).toBe('Anna')
    expect(googleProfile({ user_metadata: { given_name: 'Anna', family_name: 'Ivanova' } }).name).toBe('Anna Ivanova')
    expect(googleProfile({ user_metadata: { given_name: 'Anna' } }).name).toBe('Anna')
  })
  it('нет данных (вход по почте) — пусто', () => {
    expect(googleProfile({ user_metadata: {} })).toEqual({ name: null, avatar: null })
    expect(googleProfile({ user_metadata: null })).toEqual({ name: null, avatar: null })
    expect(googleProfile(null)).toEqual({ name: null, avatar: null })
    expect(googleProfile(undefined)).toEqual({ name: null, avatar: null })
  })
  it('аватар: avatar_url или picture, только по https', () => {
    expect(googleProfile({ user_metadata: { avatar_url: 'https://a.example/x.png' } }).avatar).toBe('https://a.example/x.png')
    expect(googleProfile({ user_metadata: { picture: 'https://lh3.googleusercontent.com/a/y' } }).avatar).toBe('https://lh3.googleusercontent.com/a/y')
    expect(googleProfile({ user_metadata: { avatar_url: 'http://a.example/x.png' } }).avatar).toBeNull()
    expect(googleProfile({ user_metadata: { avatar_url: 'javascript:alert(1)', picture: 'https://ok.example/p.png' } }).avatar).toBe('https://ok.example/p.png')
    expect(googleProfile({ user_metadata: { avatar_url: 123 } }).avatar).toBeNull()
  })
  it('не строки в имени игнорируются', () => {
    expect(googleProfile({ user_metadata: { full_name: 5, name: 'Ok' } }).name).toBe('Ok')
  })
})

describe('копии googleProfile.ts совпадают (страж от расхождения)', () => {
  it('web-header держит тот же код, что и онбординг', async () => {
    const orig = body(await readSrc('./googleProfile.ts'))
    expect(orig).toContain('googleProfile')
    expect(body(await readSrc('../../../web-header/src/lib/googleProfile.ts'))).toBe(orig)
  })
})
