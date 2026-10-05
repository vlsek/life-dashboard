import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { readFileSync } from 'node:fs'

// «Страж» формата версии (решение владельца 2026-10-05): X.YY, ровно две цифры минора; после 2.99 идёт 3.00, а не 2.100.
// Агенты с бампом int(минор)+1 уже дважды выпускали 2.100…2.106 — теперь тест красный, пока config.js не исправлен.
// Vitest запускается из папки web-dashboard/, корень репозитория — на уровень выше.
const config: string = readFileSync('../config.js', 'utf-8')
const key = (v: string): [number, number] => {
  const [a, b] = v.split('.')
  return [Number(a), Number(b)]
}

describe('формат версии сайта X.YY', () => {
  const site = config.match(/const SITE_VERSION = "([^"]+)"/)?.[1] ?? ''
  const all = [...config.matchAll(/version: "([^"]+)"/g)].map((m) => m[1])

  it('SITE_VERSION — две цифры минора', () => {
    expect(site).toMatch(/^\d+\.\d{2}$/)
  })
  it('все записи журнала изменений в том же формате', () => {
    expect(all.length).toBeGreaterThan(100)
    expect(all.filter((v) => !/^\d+\.\d{2}$/.test(v))).toEqual([])
  })
  it('верхняя запись журнала — текущая версия, дальше строго по убыванию (RU и EN отдельно)', () => {
    const ru = config.slice(config.indexOf('const CHANGELOG_RU'), config.indexOf('const CHANGELOG_EN'))
    const en = config.slice(config.indexOf('const CHANGELOG_EN'))
    for (const part of [ru, en]) {
      const vs = [...part.matchAll(/version: "([^"]+)"/g)].map((m) => m[1])
      expect(vs[0]).toBe(site)
      for (let i = 1; i < vs.length; i++) {
        const [pa, pb] = key(vs[i - 1])
        const [ca, cb] = key(vs[i])
        expect(pa > ca || (pa === ca && pb > cb), `${vs[i - 1]} должна быть новее ${vs[i]}`).toBe(true)
      }
    }
  })
})
