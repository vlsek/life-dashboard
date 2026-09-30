<script setup lang="ts">
import { computed } from 'vue'
import { circleGeometry, squareGeometry } from '../lib/ringPlacement'

// Бейдж прогресса в шапке: день — круг, неделя — скруглённый квадрат с пунктирной дорожкой (как в Дашборде).
// Копия HeaderProgressBadge.vue без Teleport: контейнер уже стоит внутри #topbar-right.
const props = defineProps<{ kind: 'day' | 'week'; basePct: number; bonusPct: number; totalPct: number; title: string }>()
const emit = defineEmits<{ click: [] }>()

const circle = computed(() => circleGeometry(13, props.basePct, props.bonusPct))
const square = computed(() => squareGeometry(24, 6, props.basePct, props.bonusPct))
</script>

<template>
  <button type="button" class="gh-badge" :data-kind="kind" :title="title" :aria-label="title" @click="emit('click')">
    <svg width="32" height="32" viewBox="0 0 32 32" style="transform: rotate(-90deg); display: block">
      <template v-if="kind === 'day'">
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--border, #333)" stroke-width="3" />
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent, #6c8cff)" stroke-width="3" stroke-linecap="round" :stroke-dasharray="circle.circumference" :stroke-dashoffset="circle.offsetBase" />
        <circle v-if="bonusPct > 0" cx="16" cy="16" r="13" fill="none" class="ring-bonus" stroke="#f5b301" stroke-width="3" stroke-linecap="round" :stroke-dasharray="circle.circumference" :stroke-dashoffset="circle.offsetBonus" />
      </template>
      <template v-else>
        <rect x="4" y="4" width="24" height="24" rx="6" fill="none" stroke="var(--border, #333)" stroke-width="4" stroke-dasharray="3 3" />
        <rect x="4" y="4" width="24" height="24" rx="6" fill="none" stroke="var(--accent, #6c8cff)" stroke-width="4" stroke-linecap="round" :stroke-dasharray="square.perimeter" :stroke-dashoffset="square.offsetBase" />
        <rect v-if="bonusPct > 0" x="4" y="4" width="24" height="24" rx="6" fill="none" class="ring-bonus" stroke="#f5b301" stroke-width="4" stroke-linecap="round" :stroke-dasharray="square.perimeter" :stroke-dashoffset="square.offsetBonus" />
      </template>
    </svg>
    <span class="gh-badge-pct">{{ totalPct }}%</span>
  </button>
</template>
