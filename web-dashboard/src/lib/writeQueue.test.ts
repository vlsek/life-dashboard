import { describe, expect, it } from 'vitest'
import { createWriteQueue } from './writeQueue'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Очередь записей воды (BACKLOG 24 🐞 «23:16»): задания идут строго по одному, ошибка одного не останавливает остальные.
describe('createWriteQueue', () => {
  it('выполняет задания строго по порядку постановки, даже если первое дольше второго', async () => {
    const q = createWriteQueue()
    const order: string[] = []
    const a = q.run(async () => {
      await sleep(20)
      order.push('a')
    })
    const b = q.run(async () => {
      await sleep(1)
      order.push('b')
    })
    await Promise.all([a, b])
    expect(order).toEqual(['a', 'b'])
  })

  it('никогда не запускает два задания одновременно', async () => {
    const q = createWriteQueue()
    let active = 0
    let max = 0
    const job = async () => {
      max = Math.max(max, ++active)
      await sleep(3)
      active--
    }
    await Promise.all(Array.from({ length: 6 }, () => q.run(job)))
    expect(max).toBe(1)
  })

  it('возвращает результат своего задания', async () => {
    const q = createWriteQueue()
    const res = await Promise.all([q.run(async () => 1), q.run(async () => 'two'), q.run(async () => null)])
    expect(res).toEqual([1, 'two', null])
  })

  it('ошибка задания доходит до его вызывающего, но очередь не заклинивает', async () => {
    const q = createWriteQueue()
    const bad = q.run(async () => {
      throw new Error('boom')
    })
    const good = q.run(async () => 'ok')
    await expect(bad).rejects.toThrow('boom')
    await expect(good).resolves.toBe('ok')
    await expect(q.run(async () => 'later')).resolves.toBe('later')
  })

  it('следующее задание стартует только после завершения предыдущего (видит его результат)', async () => {
    const q = createWriteQueue()
    let total = 0
    const add = (n: number) =>
      q.run(async () => {
        const read = total // «прочитать»
        await sleep(2)
        total = read + n // «записать»
      })
    await Promise.all([add(200), add(200), add(200)])
    expect(total).toBe(600) // без очереди — 200: все три прочли 0
  })

  it('idle() ждёт все поставленные задания, в том числе упавшие', async () => {
    const q = createWriteQueue()
    let done = 0
    void q.run(async () => {
      await sleep(5)
      done++
    })
    void q
      .run(async () => {
        await sleep(5)
        done++
        throw new Error('x')
      })
      .catch(() => {})
    await q.idle()
    expect(done).toBe(2)
  })

  it('пустая очередь: idle() завершается сразу', async () => {
    await expect(createWriteQueue().idle()).resolves.toBeUndefined()
  })

  it('независимые очереди не мешают друг другу', async () => {
    const q1 = createWriteQueue()
    const q2 = createWriteQueue()
    const order: string[] = []
    const a = q1.run(async () => {
      await sleep(15)
      order.push('q1')
    })
    const b = q2.run(async () => {
      order.push('q2')
    })
    await Promise.all([a, b])
    expect(order).toEqual(['q2', 'q1'])
  })
})
