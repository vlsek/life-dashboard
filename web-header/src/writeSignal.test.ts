import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installWriteSignal, isActionWrite, WRITE_SIGNAL } from './lib/writeSignal'

// BACKLOG 52.1 срез 4: проверка достижений после любой успешной записи в базу на странице.
describe('isActionWrite', () => {
  const U = 'https://x.supabase.co/rest/v1/'
  it('записи в таблицы — действие; чтение — нет', () => {
    for (const m of ['POST', 'patch', 'PUT', 'DELETE']) expect(isActionWrite(m, U + 'goals')).toBe(true)
    expect(isActionWrite('GET', U + 'goals')).toBe(false)
    expect(isActionWrite(undefined, U + 'goals')).toBe(false)
  })
  it('чужие адреса, отметка «был в сети» и настройки оформления (profiles) — не действие', () => {
    expect(isActionWrite('POST', 'https://example.com/api')).toBe(false)
    expect(isActionWrite('POST', U + 'rpc/touch_last_seen')).toBe(false)
    expect(isActionWrite('PATCH', U + 'profiles?user_id=eq.1')).toBe(false)
    expect(isActionWrite('POST', U + 'rpc/start_pause')).toBe(true)
    expect(isActionWrite('POST', U + 'profiles_extra')).toBe(true) // не путаем с profiles
  })
})

describe('installWriteSignal', () => {
  let orig: typeof fetch
  let fake: ReturnType<typeof vi.fn>
  beforeEach(() => {
    orig = window.fetch
    fake = vi.fn(async () => new Response('{}', { status: 200 }))
    window.fetch = fake as unknown as typeof fetch
  })
  afterEach(() => {
    window.fetch = orig
  })
  const U = 'https://x.supabase.co/rest/v1/goals'

  it('успешная запись шлёт сигнал, ответ отдаёт как есть; чтение и ошибки — без сигнала', async () => {
    const on = vi.fn()
    window.addEventListener(WRITE_SIGNAL, on)
    const off = installWriteSignal()
    const r = await fetch(U, { method: 'POST', body: '{}' })
    expect(r.status).toBe(200)
    expect(on).toHaveBeenCalledTimes(1)
    await fetch(U)
    expect(on).toHaveBeenCalledTimes(1)
    fake.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    await fetch(U, { method: 'PATCH' })
    expect(on).toHaveBeenCalledTimes(1)
    off()
    window.removeEventListener(WRITE_SIGNAL, on)
  })
  it('метод из Request тоже понимается; повторная установка не оборачивает дважды; снятие возвращает fetch', async () => {
    const on = vi.fn()
    window.addEventListener(WRITE_SIGNAL, on)
    const off = installWriteSignal()
    const off2 = installWriteSignal()
    await fetch(new Request(U, { method: 'DELETE' }))
    expect(on).toHaveBeenCalledTimes(1)
    expect(fake).toHaveBeenCalledTimes(1)
    off2()
    off()
    expect(window.fetch).toBe(fake)
    window.removeEventListener(WRITE_SIGNAL, on)
  })
})
