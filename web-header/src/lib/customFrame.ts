// КОПИЯ web-customization/src/lib/frames.ts (BACKLOG 491, агент 2): рамка аватарки для левого меню. Менять ВМЕСТЕ; страж — web-customization/src/lib/frames.test.ts.
export const FRAME_SHADOWS: Record<string, string> = {
  frame_neon: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff4fa3, 0 0 12px 2px rgba(255, 79, 163, 0.55)',
  frame_aurora: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #4fd1ff, 0 0 0 6px var(--bg-card, #fff), 0 0 0 8px #8a7dff',
  frame_gold: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #e0b23c, 0 0 14px 3px rgba(224, 178, 60, 0.6)',
}

// box-shadow для выбранной рамки; нет рамки или неизвестный ключ (предмет убрали из реестра) — пустая строка.
export function frameShadow(key: string | null | undefined): string {
  return (key && FRAME_SHADOWS[key]) || ''
}
