// Вид страницы «Магазин» (BACKLOG 392, решение владельца 2026-10-03: оба макета, переключатель; 67.2, 2026-10-21: добавлен «Цель» и он главный по умолчанию):
// 'focus' — «Цель» (крупная карточка ближайшей награды + список),
// 'grid' — «Витрина» (чипы-фильтры и сетка карточек), 'list' — «Список с копилкой» (полоса цели и разделы).
// Хранится на устройстве, без миграции; сломанное значение или недоступный localStorage — витрина по умолчанию.
export type ShopView = 'focus' | 'grid' | 'list'

export const SHOP_VIEW_KEY = 'shop_view'
export const DEFAULT_SHOP_VIEW: ShopView = 'focus'

export function parseShopView(raw: unknown): ShopView {
  return raw === 'list' || raw === 'grid' || raw === 'focus' ? raw : DEFAULT_SHOP_VIEW
}

export function loadShopView(): ShopView {
  try {
    return parseShopView(localStorage.getItem(SHOP_VIEW_KEY))
  } catch {
    return DEFAULT_SHOP_VIEW
  }
}

export function saveShopView(view: ShopView): void {
  try {
    localStorage.setItem(SHOP_VIEW_KEY, view)
  } catch {
    /* приватный режим / переполненное хранилище — вид просто не запомнится */
  }
}
