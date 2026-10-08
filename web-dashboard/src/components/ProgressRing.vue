<script setup lang="ts">
import { computed } from 'vue'
import { heptagonGeometry, heptagonSegments } from '../lib/ringPlacement'
import { weekDaysAriaLabel, type WeekDaySegment } from '../lib/progress'
import { t } from '../lib/i18n'

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
  days?: WeekDaySegment[] | null // у heptagon: прогресс каждого дня → каждая сторона заливается по СВОЕМУ дню (BACKLOG 17:05); нет — общий процент по периметру
}>()

const r = computed(() => (props.size ?? 52) / 2 - 2)
const circumference = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => circumference.value * (1 - props.basePct))
const bonusFraction = computed(() => Math.min(1, props.bonusPct / 100))
const offsetBonus = computed(() => circumference.value * (1 - bonusFraction.value))
const center = computed(() => (props.size ?? 52) / 2)
const isHeptagon = computed(() => props.shape === 'heptagon')
const perDay = computed(() => isHeptagon.value && props.days?.length === 7)
const segs = computed(() =>
  perDay.value && props.days
    ? heptagonSegments(center.value, center.value - 3, props.days.map((d) => d.fill), props.days.map((d) => d.bonus), 0) // gap 0: грани сходятся в скруглённых углах цельного контура
    : [],
)
const segPoints = computed(() => segs.value.map((s) => `${s.x1.toFixed(2)},${s.y1.toFixed(2)}`).join(' '))
const segWidth = 4.5
const showBonus = computed(() => (props.size ?? 52) >= 44)
// скринридер: итог + каждый день недели («Пн 100 %, Вт 60 % …»)
const aria = computed(() => (perDay.value && props.days ? `${props.title}. ${weekDaysAriaLabel(props.days, t('dash_summary_weekdays'))}` : props.title))
const hept = computed(() => heptagonGeometry(center.value, center.value - 3, props.basePct, props.bonusPct))
</script>

<template>
  <div class="flex flex-col items-center gap-0.5 cursor-pointer" :title="title" :aria-label="aria">
    <div class="relative" :style="{ width: (size ?? 52) + 'px', height: (size ?? 52) + 'px' }">
      <svg :width="size ?? 52" :height="size ?? 52" :viewBox="`0 0 ${size ?? 52} ${size ?? 52}`" :style="isHeptagon ? '' : 'transform: rotate(-90deg)'" :data-shape="isHeptagon ? 'heptagon' : 'circle'" data-test="progress-ring-svg">
        <template v-if="perDay">
          <!-- цельный контур как у прежнего кольца недели; заливка по граням: грань = день, её заливка = выполненность этого дня (BACKLOG 45.3) -->
          <polygon :points="segPoints" fill="none" stroke="var(--border)" :stroke-width="segWidth" stroke-linejoin="round" data-test="week-track" />
          <g v-for="(s, i) in segs" :key="i" :data-day="days![i].date" :data-state="days![i].state" data-test="week-face">
            <line v-if="days![i].state === 'today'" :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" stroke="var(--text-dim)" :stroke-width="segWidth" stroke-linecap="round" opacity="0.55" data-test="week-seg-today" />
            <line v-if="days![i].fill > 0" :x1="s.x1" :y1="s.y1" :x2="s.fx" :y2="s.fy" stroke="var(--accent)" :stroke-width="segWidth" stroke-linecap="round" data-test="week-seg-fill" />
            <line v-if="showBonus && days![i].bonus > 0" :x1="s.x1" :y1="s.y1" :x2="s.bx" :y2="s.by" class="ring-bonus" :stroke-width="Math.max(1.4, segWidth * 0.4)" stroke-linecap="round" data-test="week-seg-bonus" />
          </g>
        </template>
        <template v-else-if="isHeptagon">
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
