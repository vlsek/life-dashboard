// Рамки аватарки (BACKLOG 491): чистая отрисовка через box-shadow — работает и на <img>, и на круге с инициалами, без обёртки.
// КОПИЯ живёт в web-header/src/lib/customFrame.ts и web-community/src/lib/customFrame.ts (аватар в левом меню и в Сообществе);
// менять ВМЕСТЕ — страж frames.test.ts сверяет таблицы.
export const FRAME_SHADOWS: Record<string, string> = {
  frame_neon: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff4fa3, 0 0 12px 2px rgba(255, 79, 163, 0.55)',
  frame_aurora: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #4fd1ff, 0 0 0 6px var(--bg-card, #fff), 0 0 0 8px #8a7dff',
  frame_gold: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #e0b23c, 0 0 14px 3px rgba(224, 178, 60, 0.6)',
  // Анимированные (BACKLOG 34): здесь — статичный вид (его видно при «уменьшить движение» и «отключить все анимации»), само движение —
  // CSS-класс из frameClass() (keyframes `cust-frame-*` в style.css каждого пилота, где рисуется аватар).
  frame_flame: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff7a1a, 0 0 12px 3px rgba(255, 98, 20, 0.6)',
  frame_rainbow: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #8a7dff, 0 0 12px 2px rgba(138, 125, 255, 0.55)',
}

// Какие рамки анимированы: ключ → имя CSS-класса с animation.
export const FRAME_ANIMATIONS: Record<string, string> = {
  frame_flame: 'cust-frame-flame',
  frame_rainbow: 'cust-frame-rainbow',
}

// box-shadow для выбранной рамки; нет рамки или неизвестный ключ (предмет убрали из реестра) — пустая строка.
export function frameShadow(key: string | null | undefined): string {
  return (key && FRAME_SHADOWS[key]) || ''
}

// CSS-класс анимации выбранной рамки; у статичных рамок и неизвестных ключей — пустая строка.
export function frameClass(key: string | null | undefined): string {
  return (key && FRAME_SHADOWS[key] && FRAME_ANIMATIONS[key]) || ''
}
