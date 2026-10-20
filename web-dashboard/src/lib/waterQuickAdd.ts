// Быстрое добавление воды из напоминания (BACKLOG 67.1). Плашка не пишет воду сама: она шлёт событие, а блок «Вода» (WaterSection) —
// единственный владелец записи воды на странице — добавляет объём обычным путём (стакан, анимация, баллы, «Отменить», очередь офлайн).
import { MAX_DAY_ML } from './waterUndo'

export const WATER_QUICK_ADD_EVENT = 'ld:water-quick-add'
export const QUICK_ADD_PRESETS_ML = [200, 1000] as const

export function requestWaterAdd(ml: number): boolean {
  if (!Number.isFinite(ml) || ml <= 0 || ml > MAX_DAY_ML) return false
  window.dispatchEvent(new CustomEvent(WATER_QUICK_ADD_EVENT, { detail: { ml: Math.round(ml) } }))
  return true
}

// Подписка для блока «Вода»; возвращает отписку.
export function onWaterAddRequest(cb: (ml: number) => void): () => void {
  const h = (e: Event) => {
    const ml = (e as CustomEvent<{ ml?: unknown }>).detail?.ml
    if (typeof ml === 'number' && Number.isFinite(ml) && ml > 0 && ml <= MAX_DAY_ML) cb(Math.round(ml))
  }
  window.addEventListener(WATER_QUICK_ADD_EVENT, h)
  return () => window.removeEventListener(WATER_QUICK_ADD_EVENT, h)
}

// Ввод «своё»: целое число мл от 1 до потолка; иначе null.
export function parseCustomMl(raw: string): number | null {
  const ml = Math.floor(Number(String(raw).trim().replace(',', '.')))
  return Number.isFinite(ml) && ml > 0 && ml <= MAX_DAY_ML ? ml : null
}
