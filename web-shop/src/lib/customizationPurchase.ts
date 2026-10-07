// Покупки «Кастомизации» (темы, рамки аватарки и т. п.) записываются в ту же таблицу shop_items строкой redeemed=true с именем
// «Кастомизация: <предмет>» / «Customization: <item>» (web-customization/useCustomization.buy) — так баллы списываются из общего баланса.
// В «Мои покупки» магазина эти строки попадать не должны (BACKLOG 44.11, решение владельца: в магазине только магазинное, в кастомизации
// только кастомизация). Баланс считает ВСЕ redeemed-строки отдельным запросом и фильтром не затрагивается.
// Префиксы — те же, что `cust_shop_prefix` в web-customization/src/lib/i18n.ts (страж customizationPurchase.test.ts сверяет).
export const CUSTOMIZATION_PURCHASE_PREFIXES = ['Кастомизация:', 'Customization:'] as const

export function isCustomizationPurchase(name: string | null | undefined): boolean {
  const n = (name ?? '').trimStart()
  return CUSTOMIZATION_PURCHASE_PREFIXES.some((p) => n.startsWith(p))
}
