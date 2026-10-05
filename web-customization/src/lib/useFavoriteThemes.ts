import { computed, onMounted, onUnmounted, ref } from 'vue'
import { FAVORITE_THEMES_EVENT, MAX_FAVORITE_THEMES, getTheme, readFavoriteThemes, setTheme, writeFavoriteThemes, type ThemeKey } from './theme'

// Темы в «Кастомизации» (решение владельца 2026-10-04): все темы бесплатны; человек применяет любую и отмечает до 4 «любимых» —
// только они попадают в выпадающий список тем в боковом меню. Хранится на устройстве (localStorage), без сервера.
export function useFavoriteThemes() {
  const current = ref<ThemeKey>(getTheme())
  const favorites = ref<ThemeKey[]>(readFavoriteThemes())

  const sync = () => (favorites.value = readFavoriteThemes())
  onMounted(() => window.addEventListener(FAVORITE_THEMES_EVENT, sync))
  onUnmounted(() => window.removeEventListener(FAVORITE_THEMES_EVENT, sync))

  const full = computed(() => favorites.value.length >= MAX_FAVORITE_THEMES)
  const isFavorite = (key: ThemeKey) => favorites.value.includes(key)
  // Можно ли переключить сердечко: убрать любимую можно всегда, кроме последней; добавить — пока нет четырёх.
  const canToggle = (key: ThemeKey) => (isFavorite(key) ? favorites.value.length > 1 : !full.value)

  function toggleFavorite(key: ThemeKey) {
    if (!canToggle(key)) return
    favorites.value = writeFavoriteThemes(isFavorite(key) ? favorites.value.filter((k) => k !== key) : [...favorites.value, key])
  }
  function apply(key: ThemeKey) {
    setTheme(key)
    current.value = key
  }

  return { current, favorites, full, isFavorite, canToggle, toggleFavorite, apply, max: MAX_FAVORITE_THEMES }
}
