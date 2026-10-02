import { addDaysIso } from './date'

// «Отменить последнее добавление» воды и правка суммы за день (BACKLOG 12). Значение дня — одна запись в daily_values, журнала
// добавлений в базе нет (и миграция ради него не нужна), поэтому «что было до» помним сами: на каждый день — короткий стек
// {prev, next} в localStorage. Отмена возможна, только пока значение дня всё ещё равно тому `next`, который записали мы: если
// его успели изменить в другом месте (другое устройство, правка из виджета), откатывать «вслепую» нельзя — затрёшь чужое.
// Чистые функции + тонкая обёртка над localStorage (все обращения в try/catch: приватный режим/квота не должны ломать воду).

export interface UndoEntry {
  prev: number
  next: number
}

export const UNDO_LIMIT = 10 // сколько последних записей дня помним
export const UNDO_KEEP_DAYS = 7 // старше — чистим при загрузке, чтобы localStorage не рос
export const MAX_DAY_ML = 20000 // потолок суммы за день при ручной правке (защита от опечатки «200000»)
const PREFIX = 'water-undo:'

export const undoKey = (userId: string, date: string) => `${PREFIX}${userId}:${date}`

// Добавить запись; no-op (prev === next) не пишем, стек не длиннее UNDO_LIMIT (старые выпадают).
export function pushEntry(stack: UndoEntry[], prev: number, next: number): UndoEntry[] {
  if (prev === next) return stack
  return [...stack, { prev, next }].slice(-UNDO_LIMIT)
}

// Можно откатить, только если текущее значение дня — именно то, что записали последним.
export function canUndo(stack: UndoEntry[] | undefined, currentMl: number): boolean {
  const top = stack?.[stack.length - 1]
  return !!top && top.next === currentMl
}

// Разбор сохранённого стека: мусор и чужие форматы → пустой стек, невалидные записи отбрасываем.
export function parseStack(raw: string | null | undefined): UndoEntry[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .filter((e) => e && Number.isFinite(e.prev) && Number.isFinite(e.next) && e.prev >= 0 && e.next >= 0)
      .map((e) => ({ prev: Number(e.prev), next: Number(e.next) }))
      .slice(-UNDO_LIMIT)
  } catch {
    return []
  }
}

// Ввод «сумма за день»: «1500», «1 500», «1500,5» → целое число мл 0…MAX_DAY_ML; иначе null (ошибка ввода).
export function parseTotalInput(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const str = String(raw).trim().replace(/\s+/g, '').replace(',', '.')
  if (str === '') return null
  const n = Number(str)
  if (!Number.isFinite(n) || n < 0) return null
  const ml = Math.round(n)
  return ml > MAX_DAY_ML ? null : ml
}

// --- localStorage ---

// Все стеки пользователя за последние UNDO_KEEP_DAYS дней (старые удаляет).
export function loadStacks(userId: string, today: string): Record<string, UndoEntry[]> {
  const out: Record<string, UndoEntry[]> = {}
  try {
    const oldest = addDaysIso(today, -(UNDO_KEEP_DAYS - 1))
    const own = `${PREFIX}${userId}:`
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(own)) keys.push(k)
    }
    for (const k of keys) {
      const date = k.slice(own.length)
      if (date < oldest) {
        localStorage.removeItem(k)
        continue
      }
      const stack = parseStack(localStorage.getItem(k))
      if (stack.length) out[date] = stack
    }
  } catch {
    /* localStorage недоступен — отмена просто не переживёт перезагрузку */
  }
  return out
}

export function saveStack(userId: string, date: string, stack: UndoEntry[]) {
  try {
    if (stack.length) localStorage.setItem(undoKey(userId, date), JSON.stringify(stack))
    else localStorage.removeItem(undoKey(userId, date))
  } catch {
    /* см. выше */
  }
}
