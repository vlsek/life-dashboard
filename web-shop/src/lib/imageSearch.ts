// BACKLOG 81.6 «Подбор фото товара»: по названию хотелки ищем несколько картинок и предлагаем поставить одну как фото.
// Источник — Openverse (открытый каталог свободных изображений: без ключа, с CORS). Для бытовых товаров картинок бывает мало — тогда честно «не нашлось».
// Ставим ссылку на миниатюру Openverse (она стабильнее, чем оригинал на чужом сайте); поле «Фото» и так принимает ссылку. Сеть передаётся параметром — тесты без сети.
export interface FoundImage {
  url: string
  title: string
}
export const IMAGE_SEARCH_LIMIT = 5
const ENDPOINT = 'https://api.openverse.org/v1/images/'

export function searchUrl(query: string, limit = IMAGE_SEARCH_LIMIT): string {
  const q = query.trim().slice(0, 80)
  return `${ENDPOINT}?q=${encodeURIComponent(q)}&page_size=${limit}&mature=false`
}

const isHttps = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u)

// Разбор ответа: только https-ссылки (thumbnail, иначе url), без повторов, не больше limit. Мусор в ответе — пустой список.
export function parseResults(json: unknown, limit = IMAGE_SEARCH_LIMIT): FoundImage[] {
  const rows = (json as { results?: unknown } | null)?.results
  if (!Array.isArray(rows)) return []
  const seen = new Set<string>()
  const out: FoundImage[] = []
  for (const r of rows) {
    const o = r as { thumbnail?: unknown; url?: unknown; title?: unknown } | null
    const url = isHttps(o?.thumbnail) ? o!.thumbnail : isHttps(o?.url) ? o!.url : null
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push({ url: url as string, title: typeof o?.title === 'string' ? o.title.slice(0, 80) : '' })
    if (out.length >= limit) break
  }
  return out
}

export type SearchResult = { ok: true; images: FoundImage[] } | { ok: false }

// ok:false — сеть/сервис недоступны (показываем «не получилось», не «не нашлось»); ok:true с пустым списком — ничего не нашлось.
export async function searchImages(query: string, fetchFn: typeof fetch = fetch, timeoutMs = 8000): Promise<SearchResult> {
  if (query.trim().length < 2) return { ok: true, images: [] }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchFn(searchUrl(query), { signal: ctrl.signal })
    if (!res.ok) return { ok: false }
    return { ok: true, images: parseResults(await res.json()) }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(timer)
  }
}
