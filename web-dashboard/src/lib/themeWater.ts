// ГЕНЕРИРУЕТСЯ scripts/apply_themes.py из THEME_WATER (scripts/themes_data.py) — НЕ править руками (BACKLOG 55.5: анимация воды у большой темы).
// Копии лежат в web-header/src/lib, web-dashboard/src/lib и web-customization/src/lib (их читает waterAnim.ts: сохранённый выбор → вариант темы → волна).
export const THEME_WATER: Record<string, 'wave' | 'drops' | 'ripple'> = {
  emerald: 'ripple',
  moonlight: 'drops',
  phosphor: 'ripple',
  nightfall: 'wave',
  velvet: 'drops',
  frost: 'ripple',
  alpine: 'wave',
  matcha: 'drops',
  cyberday: 'ripple',
  vintage: 'wave',
  glass: 'wave',
  meadow: 'ripple',
  autumn: 'drops',
  sakura: 'ripple',
  snow: 'wave',
  ember: 'drops',
}
