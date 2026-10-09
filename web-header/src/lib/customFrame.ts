// КОПИЯ web-customization/src/lib/frames.ts (BACKLOG 491, агент 2): рамка аватарки для левого меню. Менять ВМЕСТЕ; страж — web-customization/src/lib/frames.test.ts.
export const FRAME_SHADOWS: Record<string, string> = {
  frame_neon: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff4fa3, 0 0 12px 2px rgba(255, 79, 163, 0.55)',
  frame_aurora: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #4fd1ff, 0 0 0 6px var(--bg-card, #fff), 0 0 0 8px #8a7dff',
  frame_gold: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #e0b23c, 0 0 14px 3px rgba(224, 178, 60, 0.6)',
  // Анимированные (BACKLOG 34): здесь — статичный вид (его видно при «уменьшить движение» и «отключить все анимации»), само движение —
  // CSS-класс из frameClass() (keyframes `cust-frame-*` в style.css каждого пилота, где рисуется аватар).
  frame_flame: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff7a1a, 0 0 12px 3px rgba(255, 98, 20, 0.6)',
  frame_rainbow: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #8a7dff, 0 0 12px 2px rgba(138, 125, 255, 0.55)',
  // Анимированные ЗА ДОСТИЖЕНИЯ (решение владельца 2026-10-04: «анимированные за достижения будет вообще круто»): не продаются.
  frame_inferno: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff3b1a, 0 0 0 6px rgba(255, 74, 26, 0.35), 0 0 14px 3px rgba(255, 60, 20, 0.7)',
  frame_pulse: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #3df0ff, 0 0 12px 2px rgba(61, 240, 255, 0.55)',
  frame_royal: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #e0b23c, 0 0 14px 3px rgba(224, 178, 60, 0.6)',
  // Рамки-награды лесенок «Достижений» (BACKLOG 37): статичные за 3-ю ступень, две «редкие» (последние) анимированы — см. FRAME_ANIMATIONS.
  frame_ink: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #2b3a67, 0 0 0 5px #8fa3d9, 0 0 10px 2px rgba(43, 58, 103, 0.5)',
  frame_neuron: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #a46bff, 0 0 0 6px var(--bg-card, #fff), 0 0 0 7px #ff7ad9, 0 0 12px 3px rgba(164, 107, 255, 0.5)',
  frame_target: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #e5383b, 0 0 0 6px var(--bg-card, #fff), 0 0 0 8px #e5383b',
  frame_gear: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #8a97a8, 0 0 0 5px #3d4857, 0 0 0 7px #b8c3d1',
  frame_bookmark: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #8c2f39, 0 0 0 6px var(--bg-card, #fff), 0 0 0 7px #d9b36a',
  frame_steel: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #4b5563, 0 0 0 5px #e5e7eb, 0 0 0 6px #374151, 0 0 8px 2px rgba(75, 85, 99, 0.5)',
  frame_cup: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #f2a900, 0 0 0 6px var(--bg-card, #fff), 0 0 0 7px #c26a00, 0 0 12px 2px rgba(242, 169, 0, 0.5)',
  frame_beacon: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #1f4fa8, 0 0 0 5px #ffe27a, 0 0 14px 4px rgba(255, 226, 122, 0.6)',
  frame_rare_challenges: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #2ecc71, 0 0 14px 3px rgba(46, 204, 113, 0.6)',
  frame_rare_milestones: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #2aa7ff, 0 0 14px 3px rgba(42, 167, 255, 0.6)',
  // Рамки за монеты, серия 46.2(а) — «МНОГО предметов за монеты» (ответ владельца 2026-10-07): разные цвета и анимации по тарифам 100/150/250.
  frame_mint: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #3ecf9a, 0 0 0 6px var(--bg-card, #fff), 0 0 0 7px #3ecf9a',
  frame_sky: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #4aa8ff, 0 0 10px 2px rgba(74, 168, 255, 0.45)',
  frame_graphite: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #3b4252, 0 0 0 6px #aab2c0',
  frame_coral: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff7a6b, 0 0 12px 3px rgba(255, 122, 107, 0.5)',
  frame_sunset: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #ff9a3c, 0 0 0 6px var(--bg-card, #fff), 0 0 0 7px #ff4f8b, 0 0 12px 2px rgba(255, 79, 139, 0.4)',
  frame_breath: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #2fd1c5, 0 0 10px 2px rgba(47, 209, 197, 0.5)',
  frame_comet: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #7cc4ff, 8px -6px 10px 1px rgba(124, 196, 255, 0.65)',
  frame_glitch: '0 0 0 2px var(--bg-card, #fff), 0 0 0 4px #00e5ff, 2px 0 0 4px rgba(255, 0, 170, 0.8)',
}

// Какие рамки анимированы: ключ → имя CSS-класса с animation.
export const FRAME_ANIMATIONS: Record<string, string> = {
  frame_flame: 'cust-frame-flame',
  frame_rainbow: 'cust-frame-rainbow',
  frame_inferno: 'cust-frame-inferno',
  frame_pulse: 'cust-frame-pulse',
  frame_royal: 'cust-frame-royal',
  frame_rare_challenges: 'cust-frame-victory',
  frame_rare_milestones: 'cust-frame-course',
  frame_breath: 'cust-frame-breath',
  frame_comet: 'cust-frame-comet',
  frame_glitch: 'cust-frame-glitch',
}

// box-shadow для выбранной рамки; нет рамки или неизвестный ключ (предмет убрали из реестра) — пустая строка.
export function frameShadow(key: string | null | undefined): string {
  return (key && FRAME_SHADOWS[key]) || ''
}

// CSS-класс анимации выбранной рамки; у статичных рамок и неизвестных ключей — пустая строка.
export function frameClass(key: string | null | undefined): string {
  return (key && FRAME_SHADOWS[key] && FRAME_ANIMATIONS[key]) || ''
}
