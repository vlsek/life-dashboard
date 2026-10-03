import { loadOpenShopItems, type ShopOption } from './savingsWidget'
import { loadSkillOptions, type SkillOption } from './useSkillsWidget'

// Данные для выбора виджетов в окне «Настроить дашборд»: навыки пользователя и не купленные товары магазина.
// Грузятся при открытии окна; сбой одного источника не мешает другому (он вернёт пустой список).
export interface WidgetOptions {
  skills: SkillOption[]
  shop: ShopOption[]
}

export async function loadWidgetOptions(userId: string): Promise<WidgetOptions> {
  const [skills, shop] = await Promise.all([loadSkillOptions(userId), loadOpenShopItems(userId)])
  return { skills, shop }
}
