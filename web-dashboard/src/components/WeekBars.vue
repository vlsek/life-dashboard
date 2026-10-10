<script setup lang="ts">
import { computed } from 'vue'
import type { WeekDaySegment } from '../lib/progress'

// Неделя семью столбиками (BACKLOG 53.2, вид «Семь столбиков» из «Кастомизации»): столбик = день недели (пн…вс слева направо), заливка снизу вверх —
// прогресс своего дня; сегодняшний обведён, бонус ⭐ дня — золотая шапка столбика (на мелком значке < 44 px не рисуется). Анимаций нет.
// КОПИЯ в web-dashboard/src/components/WeekBars.vue (страж weekBadgeParity.test.ts там).
const props = defineProps<{ days: WeekDaySegment[]; size: number; stroke: number }>()

const gap = computed(() => (props.size - props.stroke * 7) / 8) // поровну между столбиками и у краёв
const bars = computed(() =>
  props.days.map((d, i) => {
    const x = gap.value + i * (props.stroke + gap.value)
    const full = props.size - 4 // высота дорожки, по 2 px сверху и снизу
    const h = Math.max(0, Math.min(1, d.fill)) * full
    const bonus = Math.max(0, Math.min(1, d.bonus)) * full
    return { x, full, h, bonus, today: d.state === 'today', date: d.date, state: d.state }
  }),
)
const showBonus = computed(() => props.size >= 44)
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" style="display: block" data-shape="bars" data-test="week-bars" aria-hidden="true">
    <g v-for="(b, i) in bars" :key="i" :data-day="b.date" :data-state="b.state" data-test="week-bar">
      <rect :x="b.x" y="2" :width="stroke" :height="b.full" :rx="stroke / 2" fill="var(--border, #333)" />
      <rect v-if="b.h > 0" :x="b.x" :y="2 + b.full - b.h" :width="stroke" :height="b.h" :rx="stroke / 2" fill="var(--accent, #6c8cff)" data-test="week-bar-fill" />
      <rect v-if="showBonus && b.bonus > 0" :x="b.x" :y="2 + b.full - b.bonus" :width="stroke" :height="b.bonus" :rx="stroke / 2" class="ring-bonus" fill="none" stroke-width="1.4" data-test="week-bar-bonus" />
      <rect v-if="b.today" :x="b.x - 1.5" y="0.5" :width="stroke + 3" :height="size - 1" :rx="(stroke + 3) / 2" fill="none" stroke="var(--text-dim, #999)" stroke-width="1" opacity="0.7" data-test="week-bar-today" />
    </g>
  </svg>
</template>
