// Очередь записей воды (BACKLOG 24 🐞 «23:16 — вода по «+200» добавлялась неправильно, после обновления подтянулась куча нажатий»).
// Запись воды — «прочитать значение дня из БД → прибавить → записать». Без очереди несколько быстрых нажатий запускали такие цепочки
// ПАРАЛЛЕЛЬНО: все читали одно и то же старое значение и затирали друг друга (потерянные обновления), а журнал `water_log`
// получал строку на каждое нажатие — отсюда «куча нажатий» и неверная сумма. Очередь выполняет задания строго по одному:
// каждое читает значение уже ПОСЛЕ записи предыдущего. Ошибка одного задания не останавливает остальные.
// Копия этого файла лежит в web-header/src/lib и web-dashboard/src/lib (бандлы собираются независимо) — править в обоих.
export interface WriteQueue {
  run<T>(job: () => Promise<T>): Promise<T>
  /** Промис, который завершается, когда все поставленные в очередь задания выполнены (ошибки проглочены). */
  idle(): Promise<void>
}

// lockName — межвкладочная блокировка (Web Locks): «прочитать → прибавить → записать» из двух вкладок идёт строго по очереди, иначе вкладка,
// начавшая чтение раньше записи соседа, затирает его сумму (BACKLOG 66.13). Без поддержки Web Locks работает как раньше (в пределах вкладки).
export function createWriteQueue(lockName?: string): WriteQueue {
  let tail: Promise<void> = Promise.resolve()
  const exec = <T>(job: () => Promise<T>): Promise<T> => {
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined
    return lockName && locks ? (locks.request(lockName, job) as Promise<T>) : job()
  }
  return {
    run<T>(job: () => Promise<T>): Promise<T> {
      const result = tail.then(() => exec(job))
      tail = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    },
    idle: () => tail,
  }
}
