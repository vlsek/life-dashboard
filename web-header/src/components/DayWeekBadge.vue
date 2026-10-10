<script setup lang="ts">
import { computed } from 'vue'
import { circleGeometry, squareGeometry } from '../lib/ringPlacement'
import { weekDaysAriaLabel, type WeekDaySegment } from '../lib/progress'
import { t } from '../lib/i18n'
import type { WeekGaugeStyle } from '../lib/weekGauge'
import WeekHeptagon from './WeekHeptagon.vue'
import WeekBars from './WeekBars.vue'
import { daySegments, DAY_GLOW_FILTER } from '../lib/dayGauge'
import { dayGaugeStyle } from '../lib/useDayGauge'

// Бейдж прогресса в шапке: день — круг, неделя — скруглённый квадрат с пунктирной дорожкой (как в Дашборде).
// Копия HeaderProgressBadge.vue без Teleport: контейнер уже стоит внутри #topbar-right.
const props = defineProps<{ kind: 'day' | 'week'; basePct: number; bonusPct: number; totalPct: number; title: string; shape?: WeekGaugeStyle; days?: WeekDaySegment[] | null }>()
const emit = defineEmits<{ click: [] }>()

const circle = computed(() => circleGeometry(13, props.basePct, props.bonusPct))
const sevenDays = computed(() => props.kind === 'week' && props.days?.length === 7)
const hept = computed(() => sevenDays.value && (props.shape ?? 'heptagon') === 'heptagon')
const bars = computed(() => sevenDays.value && props.shape === 'bars')
// скринридер: общий итог + каждый день недели («Пн 100 %, Вт 60 % …»)
const aria = computed(() => ((hept.value || bars.value) && props.days ? `${props.title}. ${weekDaysAriaLabel(props.days, t('dash_summary_weekdays'))}` : props.title))
const daySegs = computed(() => daySegments(16, 16, 13, props.basePct, props.bonusPct))
const square = computed(() => squareGeometry(24, 6, props.basePct, props.bonusPct))
</script>

<template>
  <button type="button" class="gh-badge" :data-kind="kind" :title="title" :aria-label="aria" @click="emit('click')">
    <WeekHeptagon v-if="hept && days" :days="days" :size="32" :radius="13.5" :stroke="3.2" />
    <WeekBars v-else-if="bars && days" :days="days" :size="32" :stroke="3" />
    <svg v-else width="32" height="32" viewBox="0 0 32 32" style="transform: rotate(-90deg); display: block">
      <template v-if="kind === 'day'">
        <template v-if="dayGaugeStyle === 'dashed'">
          <g v-for="(s, i) in daySegs" :key="i" data-test="day-seg">
            <path :d="s.d" fill="none" stroke="var(--border, #333)" stroke-width="3" stroke-linecap="round" />
            <path v-if="s.base" :d="s.d" fill="none" stroke="var(--accent, #6c8cff)" stroke-width="3" stroke-linecap="round" />
            <path v-if="s.bonus" :d="s.d" fill="none" class="ring-bonus" stroke="#f5b301" stroke-width="1.4" stroke-linecap="round" />
          </g>
        </template>
        <template v-else>
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--border, #333)" stroke-width="3" />
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent, #6c8cff)" stroke-width="3" stroke-linecap="round" :style="dayGaugeStyle === 'glow' ? { filter: DAY_GLOW_FILTER } : undefined" :stroke-dasharray="circle.circumference" :stroke-dashoffset="circle.offsetBase" />
          <circle v-if="bonusPct > 0" cx="16" cy="16" r="13" fill="none" class="ring-bonus" stroke="#f5b301" stroke-width="3" stroke-linecap="round" :stroke-dasharray="circle.circumference" :stroke-dashoffset="circle.offsetBonus" />
        </template>
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
