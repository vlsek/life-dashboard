<script setup lang="ts">
import { computed } from 'vue'
import { heptagonGeometry } from '../lib/ringPlacement'

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
  shape?: 'circle' | 'heptagon' // heptagon — кольцо недели: 7 сторон = 7 дней (BACKLOG 2.3), линия толще
}>()

const r = computed(() => (props.size ?? 52) / 2 - 2)
const circumference = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => circumference.value * (1 - props.basePct))
const bonusFraction = computed(() => Math.min(1, props.bonusPct / 100))
const offsetBonus = computed(() => circumference.value * (1 - bonusFraction.value))
const center = computed(() => (props.size ?? 52) / 2)
const isHeptagon = computed(() => props.shape === 'heptagon')
const hept = computed(() => heptagonGeometry(center.value, center.value - 3, props.basePct, props.bonusPct))
</script>

<template>
  <div class="flex flex-col items-center gap-0.5 cursor-pointer" :title="title">
    <div class="relative" :style="{ width: (size ?? 52) + 'px', height: (size ?? 52) + 'px' }">
      <svg :width="size ?? 52" :height="size ?? 52" :viewBox="`0 0 ${size ?? 52} ${size ?? 52}`" :style="isHeptagon ? '' : 'transform: rotate(-90deg)'" :data-shape="isHeptagon ? 'heptagon' : 'circle'" data-test="progress-ring-svg">
        <template v-if="isHeptagon">
          <polygon :points="hept.points" fill="none" stroke="var(--border)" stroke-width="4.5" stroke-linejoin="round" data-test="hept-track" />
          <polygon :points="hept.points" fill="none" stroke="var(--accent)" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" :stroke-dasharray="hept.perimeter" :stroke-dashoffset="hept.offsetBase" data-test="hept-base" />
          <polygon v-if="bonusPct > 0" :points="hept.points" fill="none" class="ring-bonus" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" :stroke-dasharray="hept.perimeter" :stroke-dashoffset="hept.offsetBonus" data-test="hept-bonus" />
        </template>
        <template v-else>
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
          class="ring-bonus"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="offsetBonus"
        />
        </template>
      </svg>
      <div class="absolute inset-0 flex items-center justify-center text-xs font-bold">{{ totalPct }}%</div>
    </div>
    <div v-if="label" class="dim whitespace-nowrap" style="font-size: 0.65em">{{ label }}</div>
  </div>
</template>
