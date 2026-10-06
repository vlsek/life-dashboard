<script setup lang="ts">
import { computed } from 'vue'
import { circleGeometry, squareGeometry } from '../lib/ringPlacement'
import { weekDaysAriaLabel, type WeekDaySegment } from '../lib/progress'
import { t } from '../lib/i18n'
import type { WeekShape } from '../lib/progressSettings'
import WeekHeptagon from './WeekHeptagon.vue'

// Бейдж прогресса в шапке: день — круг, неделя — скруглённый квадрат с пунктирной дорожкой (как в Дашборде).
// Копия HeaderProgressBadge.vue без Teleport: контейнер уже стоит внутри #topbar-right.
const props = defineProps<{ kind: 'day' | 'week'; basePct: number; bonusPct: number; totalPct: number; title: string; shape?: WeekShape; days?: WeekDaySegment[] | null }>()
const emit = defineEmits<{ click: [] }>()

const circle = computed(() => circleGeometry(13, props.basePct, props.bonusPct))
const hept = computed(() => props.kind === 'week' && props.shape !== 'classic' && props.days?.length === 7)
// скринридер: общий итог + каждый день недели («Пн 100 %, Вт 60 % …»)
const aria = computed(() => (hept.value && props.days ? `${props.title}. ${weekDaysAriaLabel(props.days, t('dash_summary_weekdays'))}` : props.title))
const square = computed(() => squareGeometry(24, 6, props.basePct, props.bonusPct))
</script>

<template>
  <button type="button" class="gh-badge" :data-kind="kind" :title="title" :aria-label="aria" @click="emit('click')">
    <WeekHeptagon v-if="hept && days" :days="days" :size="32" :radius="13.5" :stroke="3.2" />
    <svg v-else width="32" height="32" viewBox="0 0 32 32" style="transform: rotate(-90deg); display: block">
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
