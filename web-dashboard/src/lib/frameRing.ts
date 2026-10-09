// Цвета выбранной рамки аватарки для кольца прогресса дня на Дашборде (BACKLOG раздел 43, 9:40): «если куплена рамка и включено
// отображение прогресса дня вокруг аватарки — прогресс рисуется стилем рамки». Сама рамка — box-shadow (FRAME_SHADOWS в
// web-customization/src/lib/frames.ts), а кольцо — SVG-дуга, поэтому здесь отдельная таблица: цвета дуги и свечение.
// Страж frameRing.test.ts сверяет ключи и основной цвет с таблицей рамок: добавили рамку — добавь строку и сюда.
export interface FrameRingStyle {
  stops: string[] // один цвет — сплошная дуга, несколько — градиент вдоль дуги
  glow: string | null // свечение (drop-shadow), если у рамки оно есть
  anim: string | null // CSS-класс анимации дуги (keyframes в style.css) у анимированных рамок; null — дуга статична (BACKLOG 43.3)
}

const RING: Record<string, FrameRingStyle> = {
  frame_neon: { stops: ['#ff4fa3'], glow: 'rgba(255, 79, 163, 0.6)', anim: null },
  frame_aurora: { stops: ['#4fd1ff', '#8a7dff'], glow: null, anim: null },
  frame_gold: { stops: ['#e0b23c'], glow: 'rgba(224, 178, 60, 0.6)', anim: null },
  frame_flame: { stops: ['#ff7a1a'], glow: 'rgba(255, 98, 20, 0.6)', anim: 'ring-frame-flame' },
  frame_rainbow: { stops: ['#ff4f4f', '#ffd23c', '#4fe08a', '#4fd1ff', '#8a7dff'], glow: null, anim: 'ring-frame-rainbow' },
  frame_inferno: { stops: ['#ff3b1a'], glow: 'rgba(255, 60, 20, 0.7)', anim: 'ring-frame-inferno' },
  frame_pulse: { stops: ['#3df0ff'], glow: 'rgba(61, 240, 255, 0.55)', anim: 'ring-frame-pulse' },
  frame_royal: { stops: ['#e0b23c'], glow: 'rgba(224, 178, 60, 0.6)', anim: 'ring-frame-royal' },
  frame_ink: { stops: ['#2b3a67', '#8fa3d9'], glow: null, anim: null },
  frame_neuron: { stops: ['#a46bff', '#ff7ad9'], glow: 'rgba(164, 107, 255, 0.5)', anim: null },
  frame_target: { stops: ['#e5383b'], glow: null, anim: null },
  frame_gear: { stops: ['#8a97a8', '#b8c3d1'], glow: null, anim: null },
  frame_bookmark: { stops: ['#8c2f39', '#d9b36a'], glow: null, anim: null },
  frame_steel: { stops: ['#4b5563', '#9ca3af'], glow: 'rgba(75, 85, 99, 0.5)', anim: null },
  frame_cup: { stops: ['#f2a900', '#c26a00'], glow: 'rgba(242, 169, 0, 0.5)', anim: null },
  frame_beacon: { stops: ['#1f4fa8', '#ffe27a'], glow: 'rgba(255, 226, 122, 0.6)', anim: null },
  frame_rare_challenges: { stops: ['#2ecc71'], glow: 'rgba(46, 204, 113, 0.6)', anim: 'ring-frame-victory' },
  frame_rare_milestones: { stops: ['#2aa7ff'], glow: 'rgba(42, 167, 255, 0.6)', anim: 'ring-frame-course' },
  // рамки за монеты, серия 46.2(а)
  frame_mint: { stops: ['#3ecf9a'], glow: null, anim: null },
  frame_sky: { stops: ['#4aa8ff'], glow: 'rgba(74, 168, 255, 0.45)', anim: null },
  frame_graphite: { stops: ['#3b4252', '#aab2c0'], glow: null, anim: null },
  frame_coral: { stops: ['#ff7a6b'], glow: 'rgba(255, 122, 107, 0.5)', anim: null },
  frame_sunset: { stops: ['#ff9a3c', '#ff4f8b'], glow: 'rgba(255, 79, 139, 0.4)', anim: null },
  frame_breath: { stops: ['#2fd1c5'], glow: 'rgba(47, 209, 197, 0.5)', anim: 'ring-frame-breath' },
  frame_comet: { stops: ['#7cc4ff'], glow: 'rgba(124, 196, 255, 0.65)', anim: 'ring-frame-comet' },
  frame_glitch: { stops: ['#00e5ff'], glow: null, anim: 'ring-frame-glitch' },
}

export const FRAME_RING_KEYS = Object.keys(RING)

// Стиль дуги для ключа рамки; нет рамки или неизвестный ключ (предмет убрали из реестра) — null, кольцо остаётся обычным.
export function frameRing(key: string | null | undefined): FrameRingStyle | null {
  return (key && RING[key]) || null
}
