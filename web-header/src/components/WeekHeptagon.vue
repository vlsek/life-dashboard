<script setup lang="ts">
import { computed } from 'vue'
import { heptagonSegments } from '../lib/ringPlacement'
import type { WeekDaySegment } from '../lib/progress'

// Неделя семиугольником: 7 сторон = пн…вс, заливка стороны = доля выполненного В ЭТОТ день (BACKLOG 17:05).
// Будущие дни тусклые, сегодняшний толще, золотая полоска — бонус ⭐ того дня. Анимаций нет (data-motion=off не нужен).
const props = defineProps<{ days: WeekDaySegment[]; size: number; radius: number; stroke: number }>()

const segs = computed(() =>
  heptagonSegments(
    props.size / 2,
    props.radius,
    props.days.map((d) => d.fill),
    props.days.map((d) => d.bonus),
  ),
)
const width = (i: number) => (props.days[i]?.state === 'today' ? props.stroke + props.stroke * 0.35 : props.stroke)
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" style="display: block" data-shape="heptagon" data-test="week-heptagon" aria-hidden="true">
    <template v-for="(s, i) in segs" :key="i">
      <line :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" stroke="var(--border, #333)" :stroke-width="width(i)" :opacity="days[i]?.state === 'future' ? 0.35 : 1" :data-day="days[i]?.date" :data-state="days[i]?.state" />
      <line v-if="(days[i]?.fill ?? 0) > 0" :x1="s.x1" :y1="s.y1" :x2="s.fx" :y2="s.fy" stroke="var(--accent, #6c8cff)" :stroke-width="width(i)" data-test="week-seg-fill" />
      <line v-if="(days[i]?.bonus ?? 0) > 0" :x1="s.x1" :y1="s.y1" :x2="s.bx" :y2="s.by" class="ring-bonus" stroke="#f5b301" :stroke-width="Math.max(1.4, width(i) * 0.45)" />
    </template>
  </svg>
</template>
