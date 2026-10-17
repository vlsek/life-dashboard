<script setup lang="ts">
import { computed } from 'vue'
import type { WeekDaySegment } from '../lib/progress'

// Ещё два вида спидометра недели из «Кастомизации» (BACKLOG 59.3): «Семь точек» — точки по кругу (первая сверху, дальше по часовой, пн…вс), каждая
// заполняется кругом внутри по прогрессу СВОЕГО дня; «Ступеньки» — семь столбиков растущей высоты (лесенка к воскресенью), заливка снизу вверх по
// дню. Сегодняшний день обведён; бонус ⭐ дня — золотая обводка (только на значках от 44 px). Анимаций нет.
// КОПИЯ в web-dashboard/src/components/WeekAlt.vue (страж weekBadgeParity.test.ts там).
const props = defineProps<{ days: WeekDaySegment[]; size: number; variant: 'dots' | 'steps' | 'wave' | 'teeth' | 'valley' | 'slope' }>()

const clamp = (n: number) => Math.max(0, Math.min(1, n))

// Высота столбика дня i (0..6) в долях полной: «Ступеньки» — лесенка вверх, «Волна» — дугой (ниже по краям, выше в середине недели),
// «Зубцы» — через один высокий и низкий, «Долина» — перевёрнутой дугой (выше по краям, ниже в середине), «Спуск» — лесенка вниз к воскресенью.
function trackShare(variant: 'dots' | 'steps' | 'wave' | 'teeth' | 'valley' | 'slope', i: number): number {
  const arc = Math.sin((Math.PI * (i + 0.5)) / 7)
  if (variant === 'wave') return 0.4 + 0.6 * arc
  if (variant === 'teeth') return i % 2 === 0 ? 1 : 0.55
  if (variant === 'valley') return 1 - 0.6 * arc
  if (variant === 'slope') return 0.34 + (0.66 * (6 - i)) / 6
  return 0.34 + (0.66 * i) / 6
}
const showBonus = computed(() => props.size >= 44)

const dots = computed(() => {
  const c = props.size / 2
  const rd = props.size * 0.1 // радиус точки
  const R = c - rd - 2.6 // запас под обводку сегодняшнего дня
  return props.days.map((d, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7
    return { cx: c + R * Math.cos(a), cy: c + R * Math.sin(a), r: rd, fill: clamp(d.fill), bonus: clamp(d.bonus), today: d.state === 'today', date: d.date, state: d.state }
  })
})

const steps = computed(() => {
  const gap = props.size * 0.06
  const w = (props.size - gap * 8) / 7
  const full = props.size - 4
  return props.days.map((d, i) => {
    const track = full * trackShare(props.variant, i)
    return { x: gap + i * (w + gap), w, y: 2 + full - track, track, h: track * clamp(d.fill), bonus: track * clamp(d.bonus), today: d.state === 'today', date: d.date, state: d.state }
  })
})
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" style="display: block" :data-shape="variant" :data-test="'week-' + variant" aria-hidden="true">
    <template v-if="variant === 'dots'">
      <g v-for="(p, i) in dots" :key="i" :data-day="p.date" :data-state="p.state" data-test="week-dot">
        <circle :cx="p.cx" :cy="p.cy" :r="p.r" fill="var(--border, #333)" />
        <circle v-if="p.fill > 0" :cx="p.cx" :cy="p.cy" :r="Math.max(0.8, p.r * Math.sqrt(p.fill))" fill="var(--accent, #6c8cff)" data-test="week-dot-fill" />
        <circle v-if="showBonus && p.bonus > 0" :cx="p.cx" :cy="p.cy" :r="p.r + 1.2" fill="none" class="ring-bonus" stroke-width="1.3" data-test="week-dot-bonus" />
        <circle v-if="p.today" :cx="p.cx" :cy="p.cy" :r="p.r + 2.2" fill="none" stroke="var(--text-dim, #999)" stroke-width="1" opacity="0.7" data-test="week-dot-today" />
      </g>
    </template>
    <template v-else>
      <g v-for="(b, i) in steps" :key="i" :data-day="b.date" :data-state="b.state" data-test="week-step">
        <rect :x="b.x" :y="b.y" :width="b.w" :height="b.track" :rx="Math.min(2, b.w / 2)" fill="var(--border, #333)" />
        <rect v-if="b.h > 0" :x="b.x" :y="b.y + b.track - b.h" :width="b.w" :height="b.h" :rx="Math.min(2, b.w / 2)" fill="var(--accent, #6c8cff)" data-test="week-step-fill" />
        <rect v-if="showBonus && b.bonus > 0" :x="b.x" :y="b.y + b.track - b.bonus" :width="b.w" :height="b.bonus" :rx="Math.min(2, b.w / 2)" fill="none" class="ring-bonus" stroke-width="1.3" data-test="week-step-bonus" />
        <rect v-if="b.today" :x="b.x - 1.5" :y="b.y - 1.5" :width="b.w + 3" :height="b.track + 3" :rx="Math.min(3, b.w / 2 + 1)" fill="none" stroke="var(--text-dim, #999)" stroke-width="1" opacity="0.7" data-test="week-step-today" />
      </g>
    </template>
  </svg>
</template>
