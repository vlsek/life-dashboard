import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG раздел 35 🐞 «Желания: при добавлении фото „не удалось загрузить картинку failed to fetch“».
const h = vi.hoisted(() => ({ uploads: [] as { path: string; file: File; opts: Record<string, unknown> }[], results: [] as ({ message: string; code?: string } | null)[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    storage: {
      from: () => ({
        upload: async (path: string, file: File, opts: Record<string, unknown>) => {
          h.uploads.push({ path, file, opts })
          const err = h.results.shift() ?? null
          return { data: err ? null : { path }, error: err }
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: 'https://cdn.example/' + path } }),
      }),
    },
  },
}))

import { useShop } from './lib/useShop'
import ItemForm from './components/ItemForm.vue'

const photo = (name = 'Моё фото', type = 'image/jpeg') => new File([new Uint8Array(1000)], name, { type })
const NET = { message: 'TypeError: Failed to fetch (https://haxmgtflegsfpxieaydv.supabase.co/storage/v1/object/shop-images/u1/1.jpg)' }

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.uploads.length = 0
  h.results.length = 0
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useShop.uploadImage', () => {
  it('успешная загрузка: безопасный путь (без пробелов и кириллицы), тип файла передан, возвращается публичный адрес', async () => {
    const { uploadImage } = useShop()
    const url = await uploadImage('u1', photo('Моё фото'))
    expect(url).toMatch(/^https:\/\/cdn\.example\/u1\/\d+\.jpg$/)
    expect(h.uploads).toHaveLength(1)
    expect(h.uploads[0].path).toMatch(/^u1\/\d+\.jpg$/)
    expect(h.uploads[0].opts).toMatchObject({ contentType: 'image/jpeg' })
    expect(h.uploads[0].opts.upsert).toBeUndefined()
  })

  it('сетевой сбой — одна повторная попытка через паузу (с перезаписью того же пути) и успех', async () => {
    h.results.push(NET, null)
    const { uploadImage } = useShop()
    const p = uploadImage('u1', photo())
    await vi.advanceTimersByTimeAsync(1000)
    await expect(p).resolves.toMatch(/^https:/)
    expect(h.uploads).toHaveLength(2)
    expect(h.uploads[1].path).toBe(h.uploads[0].path)
    expect(h.uploads[1].opts).toMatchObject({ upsert: true })
  })

  it('сеть недоступна и со второй попытки — ошибка летит наверх (форма покажет понятный текст), больше двух попыток нет', async () => {
    h.results.push(NET, NET)
    const { uploadImage } = useShop()
    const p = uploadImage('u1', photo())
    const caught = p.catch((e) => e)
    await vi.advanceTimersByTimeAsync(5000)
    expect(await caught).toMatchObject({ message: expect.stringContaining('Failed to fetch') })
    expect(h.uploads).toHaveLength(2)
  })

  it('ошибка не сетевая (нет прав) — без повтора', async () => {
    h.results.push({ message: 'new row violates row-level security policy', code: '42501' })
    const { uploadImage } = useShop()
    await expect(uploadImage('u1', photo())).rejects.toBeTruthy()
    expect(h.uploads).toHaveLength(1)
  })
})

describe('ItemForm: загрузка фото', () => {
  const mountForm = (upload: (f: File) => Promise<string | null>) => mount(ItemForm, { props: { existing: null, uploadImage: upload } })
  const pick = async (w: ReturnType<typeof mountForm>, file: File) => {
    const input = w.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
  }

  it('сбой «Failed to fetch» показывается понятным текстом, без адреса Supabase и самой фразы «failed to fetch»', async () => {
    const w = mountForm(async () => {
      throw NET
    })
    await pick(w, photo())
    const msg = w.find('[data-test="shop-upload-error"]').text()
    expect(msg).toContain('Нет связи')
    expect(msg).not.toMatch(/supabase|https?:|fetch|TypeError/i)
    expect(w.find('[data-test="shop-uploading"]').exists()).toBe(false)
  })

  it('успех подставляет адрес картинки и прячет ошибку; после сбоя повторная попытка очищает ошибку', async () => {
    let fail = true
    const w = mountForm(async () => {
      if (fail) throw NET
      return 'https://cdn.example/u1/1.jpg'
    })
    await pick(w, photo())
    expect(w.find('[data-test="shop-upload-error"]').exists()).toBe(true)
    fail = false
    await pick(w, photo())
    expect(w.find('[data-test="shop-upload-error"]').exists()).toBe(false)
    expect(w.html()).toContain('https://cdn.example/u1/1.jpg')
  })

  it('во время загрузки показано «Загружаю…»', async () => {
    let release: (v: string) => void = () => {}
    const w = mountForm(() => new Promise<string>((r) => (release = r)))
    const input = w.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [photo()], configurable: true })
    await input.trigger('change')
    expect(w.find('[data-test="shop-uploading"]').text()).toContain('Загружаю')
    release('https://cdn.example/x.jpg')
    await flushPromises()
    expect(w.find('[data-test="shop-uploading"]').exists()).toBe(false)
  })
})
