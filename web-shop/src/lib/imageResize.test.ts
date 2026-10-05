import { describe, expect, it } from 'vitest'
import { fitSize, MAX_SIDE, prepareImage, safeExt, SKIP_UNDER, type ResizeDeps } from './imageResize'

// BACKLOG раздел 35 🐞 «Желания: при добавлении фото „failed to fetch“»: фото сжимается перед загрузкой; любая неудача возвращает исходник.
const file = (type: string, size: number, name = 'IMG 1.jpg') => new File([new Uint8Array(size)], name, { type })
const deps = (dims: { width: number; height: number } | null, outSize: number | null, calls: { render: number } = { render: 0 }): ResizeDeps => ({
  measure: async () => dims,
  render: async () => {
    calls.render++
    return outSize == null ? null : new Blob([new Uint8Array(outSize)], { type: 'image/jpeg' })
  },
})

describe('fitSize', () => {
  it('уменьшает по длинной стороне с сохранением пропорций, не увеличивает', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: MAX_SIDE, height: 960 })
    expect(fitSize(3000, 4000)).toEqual({ width: 960, height: MAX_SIDE })
    expect(fitSize(1280, 720)).toEqual({ width: 1280, height: 720 })
    expect(fitSize(640, 480)).toEqual({ width: 640, height: 480 })
    expect(fitSize(10000, 1)).toEqual({ width: MAX_SIDE, height: 1 }) // не уходит в 0
  })
})

describe('safeExt', () => {
  it('расширение по типу файла; по имени — только безопасное; иначе jpg', () => {
    expect(safeExt('image/jpeg', 'x')).toBe('jpg')
    expect(safeExt('image/png', 'фото 1')).toBe('png')
    expect(safeExt('image/heic', 'a.HEIC')).toBe('heic')
    expect(safeExt('', 'photo.JPG')).toBe('jpg')
    expect(safeExt('', 'Моё фото')).toBe('jpg') // без точки раньше в путь попадало ВСЁ имя (пробелы, кириллица)
    expect(safeExt('', 'a.b c')).toBe('jpg')
    expect(safeExt('', 'weird.toolongext')).toBe('jpg')
  })
})

describe('prepareImage', () => {
  it('большое фото с телефона: уменьшается и пересжимается в JPEG, результат меньше исходника', async () => {
    const calls = { render: 0 }
    const src = file('image/jpeg', 6_000_000, 'IMG_2041.jpg')
    const out = await prepareImage(src, deps({ width: 4032, height: 3024 }, 220_000, calls))
    expect(calls.render).toBe(1)
    expect(out).not.toBe(src)
    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('photo.jpg')
    expect(out.size).toBe(220_000)
  })
  it('маленький JPEG/WebP, который и так вписывается, не трогаем', async () => {
    const calls = { render: 0 }
    const src = file('image/jpeg', SKIP_UNDER - 1)
    expect(await prepareImage(src, deps({ width: 800, height: 600 }, 1000, calls))).toBe(src)
    expect(calls.render).toBe(0)
    const webp = file('image/webp', 1000)
    expect(await prepareImage(webp, deps({ width: 100, height: 100 }, 10, calls))).toBe(webp)
  })
  it('PNG небольшого размера всё равно пересжимается, если выйдет меньше (скриншоты бывают тяжёлыми)', async () => {
    const out = await prepareImage(file('image/png', 900_000, 's.png'), deps({ width: 1000, height: 1000 }, 120_000))
    expect(out.type).toBe('image/jpeg')
  })
  it('GIF, SVG и не-картинки не трогаем', async () => {
    for (const t of ['image/gif', 'image/svg+xml', 'application/pdf']) {
      const f = file(t, 5_000_000)
      const calls = { render: 0 }
      expect(await prepareImage(f, deps({ width: 4000, height: 4000 }, 1000, calls))).toBe(f)
      expect(calls.render).toBe(0)
    }
  })
  it('не раздуваем: если результат не меньше исходника — возвращаем исходник', async () => {
    const f = file('image/jpeg', 100_000)
    expect(await prepareImage(f, deps({ width: 2000, height: 1000 }, 150_000))).toBe(f)
  })
  it('любая неудача безопасна: формат не декодируется, пустой результат, исключение — всегда исходный файл', async () => {
    const f = file('image/heic', 4_000_000, 'IMG.HEIC')
    expect(await prepareImage(f, deps(null, 1000))).toBe(f) // не удалось измерить
    expect(await prepareImage(f, deps({ width: 4000, height: 3000 }, null))).toBe(f) // не удалось отрисовать
    expect(await prepareImage(f, deps({ width: 4000, height: 3000 }, 0))).toBe(f) // пустой результат
    expect(await prepareImage(f, deps({ width: 0, height: 0 }, 1000))).toBe(f)
    const boom: ResizeDeps = { measure: async () => { throw new Error('decode failed') }, render: async () => null }
    expect(await prepareImage(f, boom)).toBe(f)
  })
})
