import { describe, expect, it, vi } from 'vitest'
import { parseResults, searchImages, searchUrl } from './imageSearch'

describe('searchUrl / parseResults', () => {
  it('запрос кодируется и обрезается, берём 5 безопасных результатов', () => {
    const u = searchUrl('  кофе & чай  ')
    expect(u).toContain('q=' + encodeURIComponent('кофе & чай'))
    expect(u).toContain('page_size=5')
    expect(searchUrl('x'.repeat(200))).toContain('q=' + 'x'.repeat(80) + '&')
  })
  it('thumbnail приоритетнее url; только https; без повторов; не больше лимита', () => {
    const rows = [
      { thumbnail: 'https://a/1.jpg', url: 'https://b/1.jpg', title: 'Один' },
      { thumbnail: 'http://insecure/2.jpg', url: 'https://b/2.jpg', title: 'Два' },
      { thumbnail: 'https://a/1.jpg', url: 'x' }, // повтор
      { url: 'javascript:alert(1)' },
      { thumbnail: 'https://a/3.jpg' },
      { thumbnail: 'https://a/4.jpg' },
      { thumbnail: 'https://a/5.jpg' },
      { thumbnail: 'https://a/6.jpg' },
    ]
    const r = parseResults({ results: rows })
    expect(r.map((x) => x.url)).toEqual(['https://a/1.jpg', 'https://b/2.jpg', 'https://a/3.jpg', 'https://a/4.jpg', 'https://a/5.jpg'])
    expect(r[0].title).toBe('Один')
  })
  it('мусор в ответе — пустой список', () => {
    expect(parseResults(null)).toEqual([])
    expect(parseResults({ results: 'x' })).toEqual([])
  })
})

describe('searchImages', () => {
  const okFetch = (json: unknown) => vi.fn(async () => ({ ok: true, json: async () => json }) as unknown as Response)
  it('ok с картинками; слишком короткий запрос не ходит в сеть', async () => {
    const f = okFetch({ results: [{ thumbnail: 'https://a/1.jpg', title: 'x' }] })
    expect(await searchImages('кофе', f as unknown as typeof fetch)).toEqual({ ok: true, images: [{ url: 'https://a/1.jpg', title: 'x' }] })
    expect(f).toHaveBeenCalledTimes(1)
    const g = okFetch({})
    expect(await searchImages(' к ', g as unknown as typeof fetch)).toEqual({ ok: true, images: [] })
    expect(g).not.toHaveBeenCalled()
  })
  it('пустой ответ — ok без картинок; ошибка сети и не-2xx — ok:false', async () => {
    expect(await searchImages('кофе', okFetch({ results: [] }) as unknown as typeof fetch)).toEqual({ ok: true, images: [] })
    expect(await searchImages('кофе', (async () => { throw new Error('net') }) as unknown as typeof fetch)).toEqual({ ok: false })
    expect(await searchImages('кофе', (async () => ({ ok: false, status: 429 })) as unknown as typeof fetch)).toEqual({ ok: false })
  })
})
