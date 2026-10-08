// Быстрая правка параметра тела из блока «Профиль» (BACKLOG 46.1): разбор введённого числа.
// Принимает запятую и точку («72,5» и «72.5»), пробелы по краям и внутри («1 072,5»), округляет до сотых.
// Границы грубые: единица может быть любой (кг, фунты, см), поэтому проверяем только «число больше нуля и не абсурдно большое».
export const BODY_VALUE_MAX = 1000

export function parseBodyValue(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Math.round(parseFloat(s) * 100) / 100
  if (!Number.isFinite(n) || n <= 0 || n > BODY_VALUE_MAX) return null
  return n
}

// Значение для поля ввода: целое без «.0», дробное с запятой (как пишут по-русски); парсер понимает оба варианта.
export function bodyValueInput(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  return String(Math.round(n * 100) / 100).replace('.', ',')
}
