// Перетаскивание элементов списка (BACKLOG 6.2 «Драг-энд-дроп блоков»). Чистая логика без DOM — компонент
// BlockOrderList.vue снимает размеры строк и передаёт сюда; так жест проверяется тестами без реального браузера.

// Куда встанет перетаскиваемая строка `from`, если её центр сейчас на высоте `center`. `mids` — середины ВСЕХ строк
// (в исходном порядке, по вертикали). Вниз: строка проходит дальше, пока её центр ниже середины следующей; вверх — наоборот.
export function dropIndex(mids: number[], from: number, center: number): number {
  let to = from
  for (let j = from + 1; j < mids.length && mids[j] < center; j++) to = j
  if (to === from) for (let j = from - 1; j >= 0 && mids[j] > center; j--) to = j
  return to
}

// Сдвиг (в px) для строки `j` во время перетаскивания `from` → `to`: строки, через которые проходит перетаскиваемая,
// уступают ей место на высоту одной строки (с зазором). Самой перетаскиваемой сдвиг задаёт курсор — здесь 0.
export function rowShift(j: number, from: number, to: number, step: number): number {
  if (j === from) return 0
  if (from < to && j > from && j <= to) return -step
  if (from > to && j >= to && j < from) return step
  return 0
}

// Новый порядок после переноса `from` → `to`; исходный массив не меняется.
export function moveTo<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list.slice()
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
