// ГЕНЕРИРУЕТСЯ scripts/apply_themes.py из THEME_LOADER (scripts/themes_data.py) — НЕ править руками (BACKLOG 55.5: заставка загрузки у большой темы).
// Копии лежат в web-dashboard/src/lib и web-customization/src/lib; то же значение вставлено в скрипт выбора заставки каждой web-*/index.html.
export const THEME_LOADER: Record<string, 'classic' | 'flame' | 'ring' | 'tongues'> = {
  emerald: 'ring',
  moonlight: 'tongues',
  phosphor: 'classic',
  nightfall: 'flame',
  velvet: 'flame',
  frost: 'ring',
  alpine: 'classic',
  matcha: 'flame',
  cyberday: 'tongues',
  vintage: 'classic',
  glass: 'ring',
  meadow: 'flame',
  autumn: 'flame',
  sakura: 'ring',
  snow: 'classic',
  ember: 'flame',
}
