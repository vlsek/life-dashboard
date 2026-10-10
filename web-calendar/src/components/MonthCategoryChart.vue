<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import type { HistoryContext } from '../lib/historyStats'
import { monthCategoryGroups } from '../lib/historyCategories'
import { donutArcs, groupPct } from '../lib/categoryDonut'

// «Диаграммы» в Истории (BACKLOG 656 в, срез 1): кольцо долей категорий метрик за выбранный месяц — как в окне сводки дня на главной
// (дуга на категорию: длина — доля отслеженных метрико-дней, закраска — выполненное) + легенда «сделано/всего · %». Меньше двух групп — не рисуем.
const props = defineProps<{ ctx: HistoryContext; year: number; month: number }>()
const groups = computed(() => monthCategoryGroups(props.ctx, props.ctx.categories || {}, props.year, props.month))
const arcs = computed(() => donutArcs(groups.value))
const show = computed(() => groups.value.length >= 2)
const R = 15.9155 // длина окружности = 100 → доли без пересчёта
const color = (hue: number) => `hsl(${hue} 65% 55%)`
const labelOf = (g: { kind: string; label: string }) => (g.kind === 'none' ? t('hist_cat_none') : g.label)
</script>

<template>
  <div v-if="show" class="mb-3 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-test="month-category-chart">
    <div class="mb-2 text-sm font-semibold">{{ t('hist_cat_h') }}</div>
    <div class="flex items-center gap-3">
      <svg width="84" height="84" viewBox="0 0 36 36" role="img" :aria-label="t('hist_cat_aria')" style="transform: rotate(-90deg)">
        <template v-for="a in arcs" :key="a.key">
          <circle cx="18" cy="18" :r="R" fill="none" :stroke="color(a.hue)" stroke-opacity="0.22" stroke-width="4" :stroke-dasharray="`${a.lenFrac * 100} ${100 - a.lenFrac * 100}`" :stroke-dashoffset="-a.startFrac * 100" data-test="donut-track" />
          <circle v-if="a.doneFrac > 0" cx="18" cy="18" :r="R" fill="none" :stroke="color(a.hue)" stroke-width="4" :stroke-dasharray="`${a.doneFrac * 100} ${100 - a.doneFrac * 100}`" :stroke-dashoffset="-a.startFrac * 100" data-test="donut-fill" />
        </template>
      </svg>
      <ul class="min-w-0 flex-1 text-xs" :aria-label="t('hist_cat_h')">
        <li v-for="(g, k) in groups" :key="g.key" class="flex items-center gap-1.5 py-px" data-test="donut-legend">
          <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: color(arcs[k]?.hue ?? 0) }" />
          <span class="min-w-0 flex-1 truncate">{{ labelOf(g) }}</span>
          <span class="whitespace-nowrap" style="color: var(--text-dim)">{{ g.done }}/{{ g.total }} · {{ groupPct(g) }}%</span>
        </li>
      </ul>
    </div>
    <p class="mt-2 text-[0.7em]" style="color: var(--text-dim)">{{ t('hist_cat_hint') }}</p>
  </div>
</template>
