// ГЕНЕРИРУЕТСЯ scripts/apply_themes.py из CHAR (scripts/themes_data.py) — НЕ править руками (BACKLOG 55.1: что именно меняет большая тема).
export type ThemeTrait = 'palette' | 'corners_sharp' | 'dashed_borders' | 'mono_headings' | 'snappy_anim' | 'corners_soft' | 'neon_glow' | 'dot_pattern' | 'bouncy_anim' | 'mono_all' | 'scanlines' | 'soft_shadows' | 'active_outline' | 'smooth_anim' | 'flat_cards' | 'grain'

// Большие темы и их возможности по порядку показа в карточке. Подписи: theme_trait_<имя> в i18n.ts.
export const THEME_TRAITS: Record<string, ThemeTrait[]> = {
  emerald: ['palette', 'corners_sharp', 'dashed_borders', 'mono_headings', 'snappy_anim'],
  moonlight: ['palette', 'corners_soft', 'neon_glow', 'dot_pattern', 'bouncy_anim'],
  phosphor: ['palette', 'corners_sharp', 'mono_all', 'scanlines', 'snappy_anim'],
  nightfall: ['palette', 'soft_shadows', 'active_outline', 'smooth_anim'],
  velvet: ['palette', 'corners_soft', 'flat_cards', 'bouncy_anim'],
  frost: ['palette', 'flat_cards', 'grain', 'smooth_anim'],
  alpine: ['palette', 'flat_cards', 'smooth_anim'],
}
