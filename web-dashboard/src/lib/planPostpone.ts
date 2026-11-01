import type { PlannedEntry } from './planned'

// «Отложить на завтра» (BACKLOG 75.9, срез 2): правила — отдельно от записи в базу, чтобы их можно было проверить без неё.
// Откладываем только СВОИ невыполненные пункты, не созданные из повтора: пункт-цель «привязан к цели» (откладывать нечего — цель
// живёт сама), выполненное откладывать незачем, а повторяющийся пункт завтра появится сам (plan_repeats, миграция 087) — перенос дал бы дубль.
export function canPostpone(it: PlannedEntry | undefined | null): boolean {
  return !!it && it.type !== 'goal' && !it.done && !it.repeat && it.text.trim() !== ''
}

// В план завтрашнего дня пункт попадает «чистым»: без отметки о выполнении и времени выполнения. Время напоминания и «бонус» сохраняются.
export function entryForNextDay(it: PlannedEntry): PlannedEntry {
  const out: PlannedEntry = { type: 'custom', text: it.text }
  if (it.time) out.time = it.time
  if (it.bonus) out.bonus = true
  return out
}

const sameItem = (a: PlannedEntry, b: PlannedEntry) => a.type !== 'goal' && a.text.trim() === b.text.trim() && (a.time ?? '') === (b.time ?? '')

// Дописать пункт в план следующего дня. Такой же пункт (текст и время) там уже есть и не выполнен — второй раз не добавляем
// (кнопку могли нажать дважды, или пункт уже переносили): план завтра не дублируется, а сегодня пункт всё равно снимается.
export function addToNextDay(tomorrow: readonly PlannedEntry[], it: PlannedEntry): { list: PlannedEntry[]; duplicate: boolean } {
  if (tomorrow.some((x) => !x.done && sameItem(x, it))) return { list: [...tomorrow], duplicate: true }
  return { list: [...tomorrow, entryForNextDay(it)], duplicate: false }
}
