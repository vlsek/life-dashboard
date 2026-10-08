<script setup lang="ts">
import { computed } from 'vue'
import { heptagonSegments } from '../lib/ringPlacement'
import type { WeekDaySegment } from '../lib/progress'

// Неделя семиугольником (BACKLOG 17:05, переделано по 45.3): ЦЕЛЬНЫЙ контур как у прежнего кольца недели (дорожка `--border`, скруглённые
// углы и концы), а заливка идёт ПО ГРАНЯМ — грань = день недели (пн…вс по часовой от верхней вершины), её заливка = выполненность ЭТОГО дня.
// Сегодняшняя грань — на дорожке светлее (`--text-dim`), будущие дни — просто пустая дорожка. Бонус ⭐ дня — тонкая золотая линия поверх
// заливки (на мелком значке ≥ 44 px не рисуется — там это шум). Анимаций нет.
const props = defineProps<{ days: WeekDaySegment[]; size: number; radius: number; stroke: number }>()

// gap = 0: каждая грань идёт от вершины до вершины, соседние сходятся в скруглённом углу
const segs = computed(() =>
  heptagonSegments(
    props.size / 2,
    props.radius,
    props.days.map((d) => d.fill),
    props.days.map((d) => d.bonus),
    0,
  ),
)
const points = computed(() => segs.value.map((s) => `${s.x1.toFixed(2)},${s.y1.toFixed(2)}`).join(' '))
const showBonus = computed(() => props.size >= 44)
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" style="display: block" data-shape="heptagon" data-test="week-heptagon" aria-hidden="true">
    <polygon :points="points" fill="none" stroke="var(--border, #333)" :stroke-width="stroke" stroke-linejoin="round" data-test="week-track" />
    <g v-for="(s, i) in segs" :key="i" :data-day="days[i]?.date" :data-state="days[i]?.state" data-test="week-face">
      <line v-if="days[i]?.state === 'today'" :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" stroke="var(--text-dim, #999)" :stroke-width="stroke" stroke-linecap="round" opacity="0.55" data-test="week-seg-today" />
      <line v-if="(days[i]?.fill ?? 0) > 0" :x1="s.x1" :y1="s.y1" :x2="s.fx" :y2="s.fy" stroke="var(--accent, #6c8cff)" :stroke-width="stroke" stroke-linecap="round" data-test="week-seg-fill" />
      <line v-if="showBonus && (days[i]?.bonus ?? 0) > 0" :x1="s.x1" :y1="s.y1" :x2="s.bx" :y2="s.by" class="ring-bonus" :stroke-width="Math.max(1.4, stroke * 0.4)" stroke-linecap="round" data-test="week-seg-bonus" />
    </g>
  </svg>
</template>
