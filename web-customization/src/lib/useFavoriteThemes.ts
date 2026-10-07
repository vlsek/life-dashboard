import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  FAVORITE_THEMES_EVENT,
  MAX_FAVORITE_THEMES,
  THEME_UNLOCK,
  UNLOCKED_THEMES_EVENT,
  getTheme,
  isThemeLocked,
  readFavoriteThemes,
  readUnlockedThemes,
  setTheme,
  unlockedThemesFromAchievements,
  writeFavoriteThemes,
  writeUnlockedThemes,
  type ThemeKey,
} from './theme'

// Темы в «Кастомизации» (решение владельца 2026-10-04): все темы бесплатны; человек применяет любую и отмечает до 4 «любимых» —
// только они попадают в выпадающий список тем в боковом меню. Хранится на устройстве (localStorage), без сервера.
export function useFavoriteThemes() {
  const current = ref<ThemeKey>(getTheme())
  const favorites = ref<ThemeKey[]>(readFavoriteThemes())

  const unlocked = ref<ThemeKey[]>(readUnlockedThemes())

  const sync = () => (favorites.value = readFavoriteThemes())
  const syncUnlocked = () => (unlocked.value = readUnlockedThemes())
  onMounted(() => {
    window.addEventListener(FAVORITE_THEMES_EVENT, sync)
    window.addEventListener(UNLOCKED_THEMES_EVENT, syncUnlocked)
  })
  onUnmounted(() => {
    window.removeEventListener(FAVORITE_THEMES_EVENT, sync)
    window.removeEventListener(UNLOCKED_THEMES_EVENT, syncUnlocked)
  })

  const isLocked = (key: ThemeKey) => isThemeLocked(key, unlocked.value)
  // Любимые, которые ещё закрыты (отмечены до введения замка), не считаются: их нет в списке меню и они не занимают места.
  const shownFavorites = computed(() => favorites.value.filter((k) => !isLocked(k)))
  const full = computed(() => shownFavorites.value.length >= MAX_FAVORITE_THEMES)
  const isFavorite = (key: ThemeKey) => shownFavorites.value.includes(key)
  // Можно ли переключить сердечко: закрытую — нельзя; убрать любимую можно всегда, кроме последней; добавить — пока нет четырёх.
  const canToggle = (key: ThemeKey) => (isLocked(key) ? false : isFavorite(key) ? shownFavorites.value.length > 1 : !full.value)

  function toggleFavorite(key: ThemeKey) {
    if (!canToggle(key)) return
    favorites.value = writeFavoriteThemes(isFavorite(key) ? shownFavorites.value.filter((k) => k !== key) : [...shownFavorites.value, key])
  }
  function apply(key: ThemeKey) {
    if (isLocked(key)) return
    setTheme(key)
    current.value = key
  }

  // Страница знает полученные достижения точнее всего: после загрузки обновляем список открытых тем (его же читают шапка и меню).
  function setUnlocksFromAchievements(earned: Iterable<string>) {
    unlocked.value = writeUnlockedThemes(unlockedThemesFromAchievements(earned))
  }

  return { current, favorites: shownFavorites, full, isFavorite, canToggle, toggleFavorite, apply, isLocked, unlocked, setUnlocksFromAchievements, lockedCount: Object.keys(THEME_UNLOCK).length, max: MAX_FAVORITE_THEMES }
}
