<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { categoryGroups, donutArcs, groupPct } from '../lib/categoryDonut'
import type { SummaryItem } from '../lib/progressSummary'

// «Прогресс дня по категориям» (BACKLOG 656 а): кольцо — дуга на категорию (длина = доля веса, закраска = выполнено), рядом легенда с
// процентами. Один пункт (одна группа) — диаграмма не нужна, компонент ничего не рисует. Цвета — оттенки на HSL, читаются на любых темах.
const props = defineProps<{ items: SummaryItem[] }>()
const groups = computed(() => categoryGroups(props.items))
const arcs = computed(() => donutArcs(groups.value))
const show = computed(() => groups.value.length >= 2)
const R = 15.9155 // длина окружности = 100 → доли без пересчёта
const labelOf = (g: { kind: string; label: string }) => (g.kind === 'plans' ? t('dash_summary_cat_plans') : g.kind === 'none' ? t('dash_summary_cat_none') : g.label)
const color = (hue: number, light = 55) => `hsl(${hue} 65% ${light}%)`
</script>

<template>
  <div v-if="show" class="mb-3 flex items-center gap-3" data-test="category-donut">
    <svg width="76" height="76" viewBox="0 0 36 36" role="img" :aria-label="t('dash_summary_cat_aria')" style="transform: rotate(-90deg)">
      <template v-for="a in arcs" :key="a.key">
        <circle cx="18" cy="18" :r="R" fill="none" :stroke="color(a.hue, 55)" stroke-opacity="0.22" stroke-width="4" :stroke-dasharray="`${a.lenFrac * 100} ${100 - a.lenFrac * 100}`" :stroke-dashoffset="-a.startFrac * 100" data-test="donut-track" />
        <circle v-if="a.doneFrac > 0" cx="18" cy="18" :r="R" fill="none" :stroke="color(a.hue, 55)" stroke-width="4" :stroke-dasharray="`${a.doneFrac * 100} ${100 - a.doneFrac * 100}`" :stroke-dashoffset="-a.startFrac * 100" data-test="donut-fill" />
      </template>
    </svg>
    <ul class="min-w-0 flex-1 text-xs" :aria-label="t('dash_summary_by_cat_h')">
      <li v-for="(g, k) in groups" :key="g.key" class="flex items-center gap-1.5 py-px" data-test="donut-legend">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: color(arcs[k]?.hue ?? 0) }" />
        <span class="min-w-0 flex-1 truncate">{{ labelOf(g) }}</span>
        <span class="dim whitespace-nowrap">{{ g.done }}/{{ g.total }} · {{ groupPct(g) }}%</span>
      </li>
    </ul>
  </div>
</template>
