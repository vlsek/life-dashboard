<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { RARITY_COLOR, type Rarity } from '../lib/rewards'

// Значок достижения по ГРЕЙДУ (BACKLOG 44.12): форма и цвет зависят от грейда — обычное: круг; необычное: круг с внутренним кольцом;
// редкое: шестиугольник; эпическое: звезда-вспышка со свечением; легендарное: солнце с лучами, кольцом и мягким пульсом свечения.
// Закрытое достижение — та же форма, но пунктиром и без цвета (видно, какой грейд ждёт). Цвет грейда — только метка (форма, обводка,
// иконка), текст остаётся цветом темы; пульс гасится и общим выключателем анимаций (html[data-motion=off]), и prefers-reduced-motion.
const props = withDefaults(defineProps<{ grade: Rarity; icon: string; unlocked: boolean; size?: number }>(), { size: 56 })

// Лучи: n вершин, чередуем внешний и внутренний радиус (центр 32,32 в системе 64×64)
function burst(n: number, rOut: number, rIn: number): string {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn
    const a = (Math.PI * i) / n - Math.PI / 2
    pts.push(`${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}
const HEX = '32,3 57.1,17.5 57.1,46.5 32,61 6.9,46.5 6.9,17.5'
const EPIC = burst(10, 31, 25)
const LEGEND = burst(14, 31.5, 26.5)
const color = computed(() => RARITY_COLOR[props.grade])
</script>

<template>
  <div
    class="grade-badge ach-badge"
    :class="[unlocked ? 'is-on' : 'is-off', 'g-' + grade]"
    :data-grade="grade"
    :data-state="unlocked ? 'on' : 'off'"
    :style="{ width: size + 'px', height: size + 'px', '--g': color }"
  >
    <svg class="gb-shape" viewBox="0 0 64 64" aria-hidden="true">
      <circle v-if="grade === 'common' || grade === 'uncommon'" class="gb-body" cx="32" cy="32" r="28" />
      <circle v-if="grade === 'uncommon'" class="gb-inner" cx="32" cy="32" r="22" />
      <polygon v-if="grade === 'rare'" class="gb-body" :points="HEX" />
      <polygon v-if="grade === 'epic'" class="gb-body" :points="EPIC" />
      <polygon v-if="grade === 'legendary'" class="gb-body" :points="LEGEND" />
      <circle v-if="grade === 'legendary'" class="gb-inner" cx="32" cy="32" r="20" />
    </svg>
    <span class="gb-icon" :style="{ fontSize: Math.round(size * 0.44) + 'px' }"><Icon :name="icon" /></span>
  </div>
</template>

<style scoped>
.grade-badge {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
}
.gb-shape {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
/* закрытое: контур пунктиром нейтрального цвета */
.gb-body {
  fill: transparent;
  stroke: var(--border);
  stroke-width: 2;
  stroke-dasharray: 4 3;
  stroke-linejoin: round;
}
.gb-inner {
  fill: none;
  stroke: var(--border);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}
.gb-icon {
  position: relative;
  display: inline-flex;
  color: var(--text-dim);
}
/* открытое: цвет грейда */
.is-on .gb-body {
  fill: color-mix(in srgb, var(--g) 18%, transparent);
  stroke: var(--g);
  stroke-width: 2.5;
  stroke-dasharray: none;
}
.is-on .gb-inner {
  stroke: var(--g);
  stroke-dasharray: none;
  opacity: 0.7;
}
.is-on .gb-icon {
  color: var(--g);
}
.is-on.g-epic {
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--g) 55%, transparent));
}
.is-on.g-legendary {
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--g) 70%, transparent));
  animation: gb-glow 2.6s ease-in-out infinite alternate;
}
@keyframes gb-glow {
  from { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--g) 55%, transparent)); }
  to { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--g) 85%, transparent)); }
}
@media (prefers-reduced-motion: reduce) {
  .grade-badge { animation: none; }
}
</style>
