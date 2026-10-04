import { loadOpenShopItems, type ShopOption } from './savingsWidget'
import { loadSkillOptions, type SkillOption } from './useSkillsWidget'
import { loadLangOptions, type LangOption } from './useLanguagesWidget'

// Данные для выбора виджетов в окне «Настроить дашборд»: навыки пользователя, не купленные товары магазина и языки с невыученными словами.
// Грузятся при открытии окна; сбой одного источника не мешает другому (он вернёт пустой список).
export interface WidgetOptions {
  skills: SkillOption[]
  shop: ShopOption[]
  languages: LangOption[]
}

export async function loadWidgetOptions(userId: string): Promise<WidgetOptions> {
  const [skills, shop, languages] = await Promise.all([loadSkillOptions(userId), loadOpenShopItems(userId), loadLangOptions(userId)])
  return { skills, shop, languages }
}
