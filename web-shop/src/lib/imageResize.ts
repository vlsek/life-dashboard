// Сжатие фото перед загрузкой в Supabase Storage (BACKLOG раздел 35 🐞 «Желания: при добавлении фото пишет „не удалось загрузить картинку failed to fetch“»).
// Фото с телефона — несколько МБ; на мобильной сети такой запрос часто обрывается («Failed to fetch»). Уменьшаем до MAX_SIDE по длинной стороне и
// пересжимаем в JPEG — получается ~100–300 КБ. Любая неудача (формат не декодируется, нет canvas) безопасно возвращает ИСХОДНЫЙ файл:
// сжатие — улучшение, а не условие загрузки.
export const MAX_SIDE = 1280
export const QUALITY = 0.82
export const SKIP_UNDER = 300 * 1024 // маленькие JPEG/WebP, которые и так вписываются в размер, не трогаем

export function fitSize(width: number, height: number, max: number = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (!(longest > max)) return { width, height } // не увеличиваем
  const k = max / longest
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) }
}

// Расширение для пути в хранилище: по типу файла; иначе по имени, но только безопасные символы (пробелы/кириллица в ключе ломают запрос); иначе jpg.
export function safeExt(type: string, name: string): string {
  const byType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/heic': 'heic', 'image/heif': 'heif' }
  if (byType[type]) return byType[type]
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg'
}

export interface ResizeDeps {
  measure(file: File): Promise<{ width: number; height: number } | null>
  render(file: File, width: number, height: number): Promise<Blob | null>
}

export async function prepareImage(file: File, deps: ResizeDeps = browserDeps): Promise<File> {
  try {
    if (!/^image\//.test(file.type)) return file
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file // анимация и вектор не трогаем
    const dims = await deps.measure(file)
    if (!dims || !(dims.width > 0) || !(dims.height > 0)) return file
    const fit = fitSize(dims.width, dims.height)
    const needResize = fit.width !== dims.width || fit.height !== dims.height
    if (!needResize && file.size <= SKIP_UNDER && /^image\/(jpeg|webp)$/.test(file.type)) return file
    const blob = await deps.render(file, fit.width, fit.height)
    if (!blob || blob.size === 0 || blob.size >= file.size) return file // не раздуваем файл
    return new File([blob], 'photo.jpg', { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}

type Drawable = { source: CanvasImageSource; width: number; height: number; close: () => void }

// Декодирование с учётом EXIF-поворота; запасной путь через <img> для старых браузеров.
async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('decode failed'))
      img.src = url
    })
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

const browserDeps: ResizeDeps = {
  async measure(file) {
    const d = await decode(file)
    const res = { width: d.width, height: d.height }
    d.close()
    return res
  },
  async render(file, width, height) {
    const d = await decode(file)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = '#ffffff' // JPEG без прозрачности: прозрачные места PNG станут белыми, а не чёрными
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(d.source, 0, 0, width, height)
      return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY))
    } finally {
      d.close()
    }
  },
}
