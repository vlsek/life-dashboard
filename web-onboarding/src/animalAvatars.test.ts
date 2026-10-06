import { describe, expect, it } from 'vitest'
import { ANIMALS, animalAvatarUrl, animalKeyOfUrl, animalLabel } from './lib/animalAvatars'

// Файлы читаем через node:fs; имя модуля собрано строкой, чтобы vue-tsc не требовал @types/node для тестов пилота.
async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG раздел 29: 20 аватарок-животных в одном стиле (тёмные чернила + пастельный фон + белые блики), data-URI в profiles.avatar_url.
describe('библиотека аватарок-животных', () => {
  it('ровно 20 животных, ключи уникальны, у каждого есть русское и английское название', () => {
    expect(ANIMALS).toHaveLength(20)
    expect(new Set(ANIMALS.map((a) => a.key)).size).toBe(20)
    for (const a of ANIMALS) {
      expect(a.ru.length, a.key).toBeGreaterThan(1)
      expect(a.en.length, a.key).toBeGreaterThan(1)
    }
  })

  it('каждый SVG корректен: корневой <svg> с viewBox, нет скриптов, внешних ссылок и обработчиков', () => {
    const doc = new DOMParser()
    for (const a of ANIMALS) {
      const x = doc.parseFromString(a.svg, 'image/svg+xml')
      expect(x.querySelector('parsererror'), a.key).toBeNull()
      expect(x.documentElement.nodeName, a.key).toBe('svg')
      expect(x.documentElement.getAttribute('viewBox'), a.key).toBe('0 0 64 64')
      expect(a.svg, a.key).not.toMatch(/<script|href=|xlink|on[a-z]+=|url\(|<image|<foreignObject/i)
    }
  })

  it('единый стиль: тёмные чернила, белые блики и один пастельный фон на животное (не больше трёх цветов)', () => {
    for (const a of ANIMALS) {
      const colors = new Set([...a.svg.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toLowerCase()))
      expect(colors.size, a.key).toBeLessThanOrEqual(3)
      expect(colors.has('#2f3047'), a.key).toBe(true)
    }
  })

  it('картинки разные: у каждого животного свой рисунок', () => {
    expect(new Set(ANIMALS.map((a) => a.svg)).size).toBe(20)
  })

  it('data-URI: начинается с data:image/svg+xml, раскодируется обратно в тот же SVG, неизвестный ключ — null', () => {
    const url = animalAvatarUrl('fox')!
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
    expect(decodeURIComponent(url.split(',').slice(1).join(','))).toBe(ANIMALS.find((a) => a.key === 'fox')!.svg)
    expect(animalAvatarUrl('dragon')).toBeNull()
    expect(url.length).toBeLessThan(3000) // вмещается в строку профиля, как и вся лента лидерборда
  })

  it('animalKeyOfUrl узнаёт свои аватарки и не путает со своим фото, ссылкой Google и пустым', () => {
    for (const a of ANIMALS) expect(animalKeyOfUrl(animalAvatarUrl(a.key)), a.key).toBe(a.key)
    expect(animalKeyOfUrl('https://lh3.googleusercontent.com/a/x')).toBeNull()
    expect(animalKeyOfUrl('data:image/svg+xml;charset=utf-8,%3Csvg%3E')).toBeNull()
    expect(animalKeyOfUrl(null)).toBeNull()
    expect(animalKeyOfUrl('')).toBeNull()
  })

  it('animalLabel: русское и английское название', () => {
    const cat = ANIMALS.find((a) => a.key === 'cat')!
    expect(animalLabel(cat, 'ru')).toBe('Кот')
    expect(animalLabel(cat, 'en')).toBe('Cat')
  })

  it('копия в web-dashboard совпадает (страж: файл сгенерирован scripts/gen_animal_avatars.py)', async () => {
    const mine = await readSrc('./lib/animalAvatars.ts')
    expect(await readSrc('../../web-dashboard/src/lib/animalAvatars.ts')).toBe(mine)
  })
})
