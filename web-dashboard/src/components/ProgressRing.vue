<script setup lang="ts">
import { computed } from 'vue'

// Один компонент на оба случая (день/неделя) — отличаются только радиусом/размером и тем,
// что вызывающий код передаёт готовые проценты. Портировано из renderDayProgressRing() и
// renderWeekProgress() (кружковый режим — "avatar"/"profile") в dashboard.js; режим "header"
// (маленький бейдж в шапке) сюда пока не перенесён — карточки профиля/шапки ещё нет в этом
// пилоте, см. ROADMAP.md.
const props = defineProps<{
  basePct: number // 0..1
  bonusPct: number // проценты сверху (0..100+)
  totalPct: number // итоговое число для подписи в центре
  size?: number // размер SVG в px
  title: string
  label?: string // подпись под кольцом (например "Неделя") — если не задана, не рисуется
}>()

const r = computed(() => (props.size ?? 52) / 2 - 2)
const circumference = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => circumference.value * (1 - props.basePct))
const bonusFraction = computed(() => Math.min(1, props.bonusPct / 100))
const offsetBonus = computed(() => circumference.value * (1 - bonusFraction.value))
const center = computed(() => (props.size ?? 52) / 2)
</script>

<template>
  <div class="flex flex-col items-center gap-0.5 cursor-pointer" :title="title">
    <div class="relative" :style="{ width: (size ?? 52) + 'px', height: (size ?? 52) + 'px' }">
      <svg :width="size ?? 52" :height="size ?? 52" :viewBox="`0 0 ${size ?? 52} ${size ?? 52}`" style="transform: rotate(-90deg)">
        <circle :cx="center" :cy="center" :r="r" fill="none" stroke="var(--border)" stroke-width="3" />
        <circle
          :cx="center"
          :cy="center"
          :r="r"
          fill="none"
          stroke="var(--accent)"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="offset"
        />
        <circle
          v-if="bonusPct > 0"
          :cx="center"
          :cy="center"
          :r="r"
          fill="none"
          stroke="#d6336c"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="offsetBonus"
        />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center text-xs font-bold">{{ totalPct }}%</div>
    </div>
    <div v-if="label" class="dim whitespace-nowrap" style="font-size: 0.65em">{{ label }}</div>
  </div>
</template>
