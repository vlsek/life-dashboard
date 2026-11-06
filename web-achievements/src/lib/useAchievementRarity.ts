import { ref } from 'vue'
import { sb } from './supabase'
import { toPeerMap } from './rarityPeers'

// Редкость достижений по данным (BACKLOG 78.8). Нет функции (миграция 118 не применена), мало людей (база молчит) или сеть оборвалась —
// карта пуста и строки на карточках просто нет; страница работает как раньше. Загрузчик не бросает исключений.
export function useAchievementRarity() {
  const percents = ref<Record<string, number>>({})
  const available = ref(false)

  async function load() {
    try {
      const { data, error } = await sb.rpc('achievement_rarity')
      if (error) {
        percents.value = {}
        available.value = false
        return
      }
      percents.value = toPeerMap(data)
      available.value = Object.keys(percents.value).length > 0
    } catch {
      percents.value = {}
      available.value = false
    }
  }

  // Процент для карточки; null — строки нет (не показываем «0%» из-за отсутствия данных)
  const percentOf = (key: string): number | null => (key in percents.value ? percents.value[key] : null)

  return { percents, available, load, percentOf }
}
