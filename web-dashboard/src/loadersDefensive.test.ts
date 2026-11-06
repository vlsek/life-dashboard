import { beforeEach, describe, expect, it, vi } from 'vitest'

// Загрузчики необязательных функций «Планов» (повторы — миграция 087, шаблоны дня — миграция 115) не должны бросать исключение:
// обрыв сети или неожиданный ответ клиента = функция недоступна, а не необработанная ошибка (в проде — шум в консоли и сломанный блок,
// в тестах — «unhandled errors» и вечно красный код возврата полного прогона).
const h = vi.hoisted(() => ({ mode: 'ok' as 'ok' | 'dberror' | 'throws' | 'rejects' }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      if (h.mode === 'throws') return { select: () => ({ eq: () => ({}) }) } // нет .order → TypeError внутри load (как у неполного клиента)
      const result = h.mode === 'dberror' ? { data: null, error: { message: 'relation does not exist', code: '42P01' } } : { data: [], error: null }
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lte: () => chain,
        order: () => (h.mode === 'rejects' ? Promise.reject(new Error('network down')) : Promise.resolve(result)),
        then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
      }
      return chain
    },
  },
}))
import { usePlanRepeats } from './lib/usePlanRepeats'
import { usePlanTemplates } from './lib/usePlanTemplates'

beforeEach(() => {
  h.mode = 'ok'
})

describe.each([
  ['usePlanTemplates', async () => { const x = usePlanTemplates(); await x.load('u1'); return x.available.value }],
  ['usePlanRepeats', async () => { const x = usePlanRepeats(); await x.load('u1', '2026-11-04'); return x.available.value }],
])('%s.load', (_name, run) => {
  it('успех: функция доступна', async () => {
    expect(await run()).toBe(true)
  })
  it('таблицы нет (ответ базы с ошибкой): недоступна, без исключения', async () => {
    h.mode = 'dberror'
    expect(await run()).toBe(false)
  })
  it('клиент бросил исключение синхронно (неожиданная форма запроса): недоступна, без исключения', async () => {
    h.mode = 'throws'
    await expect(run()).resolves.toBe(false)
  })
  it('запрос оборвался (promise отклонён): недоступна, без исключения', async () => {
    h.mode = 'rejects'
    await expect(run()).resolves.toBe(false)
  })
})

describe('после сбоя списки очищены', () => {
  it('шаблоны и повторы пусты, а не остаются от прошлой загрузки', async () => {
    const tpl = usePlanTemplates()
    const rep = usePlanRepeats()
    await tpl.load('u1')
    await rep.load('u1', '2026-11-04')
    tpl.templates.value = [{ id: 'a', name: 'X', items: [{ text: 'Y' }] }]
    h.mode = 'rejects'
    await tpl.load('u1')
    await rep.load('u1', '2026-11-04')
    expect(tpl.templates.value).toEqual([])
    expect(rep.repeats.value).toEqual([])
    expect(tpl.available.value).toBe(false)
    expect(rep.available.value).toBe(false)
  })
})
