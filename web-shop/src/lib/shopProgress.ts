// Прогресс накопления на товар (BACKLOG 13 «Магазин: прогресс-бары под позициями»):
// сколько баллов уже есть от цены. Чистая функция, чтобы тестировать без сети и DOM.
export interface ItemProgress {
  pct: number // 0..100, округлённое вниз (99.9% не показываем как 100)
  canBuy: boolean
  missing: number // сколько баллов не хватает (0, если можно купить)
}

export function itemProgress(cost: number, balance: number): ItemProgress {
  if (!(cost > 0)) return { pct: 100, canBuy: true, missing: 0 }
  const have = Math.max(0, balance)
  const canBuy = have >= cost
  const pct = canBuy ? 100 : Math.min(99, Math.floor((have / cost) * 100))
  return { pct, canBuy, missing: canBuy ? 0 : cost - have }
}
