<script setup lang="ts">
import { computed } from 'vue'
import { prepareChartSeries, type ChartPoint } from '../lib/chart'
import MetricStreakBadge from './MetricStreakBadge.vue'
import { buildLegend, describeShares, escapeXml, hasNamedVariations, pieSlices } from '../lib/variationChart'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import type { VariationShare } from '../lib/variationChart'
import { t } from '../lib/i18n'
import { todayStr } from '../lib/date'
import MetricIcon from './MetricIcon.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    icon?: string | null // иконка метрики: svg или эмодзи, рисуется перед названием
    points: { date: string; y: number | null; shares?: VariationShare[] }[]
    unit?: string
    color?: string
    goalValue?: number | null
    goalLabel?: string | null
    note?: string | null // пояснение под графиком (например, «период расширен»)
    variations?: string[] | null // метрики-подходы: стабильный порядок особенностей (от него цвета точек и легенды)
    streak?: MetricStreakInfo | null // серия метрики: огонёк с числом рядом с названием графика (BACKLOG 23, 14:42)
    today?: string // «сегодня» для легенды (ISO); по умолчанию — реальная сегодняшняя дата, параметр нужен тестам
  }>(),
  { title: '', icon: null, unit: '', color: 'var(--accent)', goalValue: null, goalLabel: null, note: null, variations: null, streak: null, today: undefined },
)

const prepared = computed<ChartPoint[]>(() => prepareChartSeries(props.points))
// «Цветные» точки и легенда (BACKLOG 19, 11:41) — только если у подходов есть особенности с названием; иначе график как прежде.
const order = computed(() => props.variations ?? [])
const colored = computed(() => hasNamedVariations(props.points))
const legend = computed(() => (colored.value ? buildLegend(props.points, order.value, props.today ?? todayStr()) : []))
const hasGaps = computed(() => prepared.value.some((p) => p.y == null) && prepared.value.some((p) => p.y != null))

function fmtChartLabel(iso: string): string {
  const parts = iso.split('-')
  return `${parts[2]}.${parts[1]}`
}

// Точка-«мини-круг»: сектора по долям особенностей (одна особенность — сплошной круг её цвета). Подсказка <title> —
// «дд.мм: 50 классических · 30 алмазных · 20 на бицепс = 100»; названия — текст пользователя, поэтому экранируются.
function pieMarker(x: number, y: number, label: string, shares: VariationShare[]): string {
  const slices = pieSlices(shares, order.value, x, y, 6.5)
  if (!slices.length) return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${props.color}" />`
  const total = shares.reduce((n, s) => n + (s.reps > 0 ? s.reps : 0), 0)
  const tip = escapeXml(`${label}: ${describeShares(shares, t('chart_legend_none'))} = ${total}`)
  const parts = slices.map((s) =>
    s.full
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="${s.color}" stroke="var(--bg-card)" stroke-width="1.5" />`
      : `<path d="${s.path}" fill="${s.color}" stroke="var(--bg-card)" stroke-width="1" />`,
  )
  return `<g data-test="pie-point"><title>${tip}</title>${parts.join('')}</g>`
}

// Портировано 1:1 из svgLineChart() в config.js — строит только внутренность <svg>
// (линии/точки/подписи), сама обёртка — в шаблоне ниже.
const innerSvg = computed<string | null>(() => {
  const points = prepared.value
  const withValues = points.filter((p) => p.y != null)
  if (withValues.length < 2) return null

  const w = 620
  const h = 160
  const pad = 34
  const values = withValues.map((p) => p.y as number)
  if (props.goalValue != null) values.push(props.goalValue)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const range = max - min
  const stepX = (w - pad * 2) / (points.length - 1)

  const coords = points.map((p, i) => ({
    x: pad + i * stepX,
    y: p.y != null ? h - pad - ((p.y - min) / range) * (h - pad * 2) : null,
    label: fmtChartLabel(p.date),
    value: p.y,
    shares: p.shares,
  }))

  let svg = ''

  if (props.goalValue != null) {
    const gy = h - pad - ((props.goalValue - min) / range) * (h - pad * 2)
    svg += `<line x1="${pad}" y1="${gy.toFixed(1)}" x2="${(w - pad).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.85" />`
    const goalText = props.goalLabel || `${props.goalValue}${props.unit || ''}`
    const goalTextY = gy < pad + 10 ? gy + 12 : gy - 5
    svg += `<text x="${(w - pad).toFixed(1)}" y="${goalTextY.toFixed(1)}" font-size="10" fill="var(--text-dim)" text-anchor="end">${goalText}</text>`
  }

  let lastReal: { x: number; y: number } | null = null
  let gapBetween = false
  for (const c of coords) {
    if (c.y == null) {
      if (lastReal) gapBetween = true
      continue
    }
    if (lastReal) {
      const dash = gapBetween ? ` stroke-dasharray="5,4"` : ''
      svg += `<line x1="${lastReal.x.toFixed(1)}" y1="${lastReal.y.toFixed(1)}" x2="${c.x.toFixed(1)}" y2="${c.y.toFixed(1)}" stroke="${props.color}" stroke-width="2.5"${dash} opacity="${gapBetween ? 0.55 : 1}" />`
    }
    lastReal = { x: c.x, y: c.y }
    gapBetween = false
  }

  const labelEvery = Math.max(1, Math.ceil(coords.filter((c) => c.y != null).length / 12))
  let shown = 0
  for (const c of coords) {
    if (c.y == null) continue
    svg += colored.value && c.shares && c.shares.length ? pieMarker(c.x, c.y, c.label, c.shares) : `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="${props.color}" />`
    if (shown % labelEvery === 0) {
      svg += `<text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" font-size="11" fill="var(--text)" text-anchor="middle">${c.value}${props.unit || ''}</text>`
      svg += `<text x="${c.x.toFixed(1)}" y="${h - 8}" font-size="10" fill="var(--text-dim)" text-anchor="middle">${c.label}</text>`
    }
    shown++
  }
  return svg
})

const fallbackText = computed(() => {
  const withValues = props.points.filter((p) => p.y != null)
  if (withValues.length === 0) return t('chart_not_enough_data') + ' ' + t('chart_no_data')
  const last = withValues[withValues.length - 1]
  return `${t('chart_not_enough_data')} ${t('chart_last_value')} ${last.y}${props.unit || ''}`
})
</script>

<template>
  <div>
    <h4 v-if="title" class="mb-1.5 font-medium"><MetricIcon v-if="icon" :icon="icon" extra-style="margin-right:0.35em;" />{{ title }}<MetricStreakBadge v-if="streak" :info="streak" /></h4>
    <template v-if="innerSvg">
      <svg viewBox="0 0 620 160" width="100%" :height="160" v-html="innerSvg"></svg>
      <ul v-if="legend.length" class="m-0 mt-1 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs" data-test="chart-legend" :aria-label="t('chart_legend_aria')">
        <li v-for="(item, i) in legend" :key="i" class="flex items-center gap-1" data-test="legend-item">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: item.color }" aria-hidden="true"></span>
          {{ item.label ?? t('chart_legend_none') }}
          <span class="dim">· {{ item.reps }}</span>
          <span class="dim" data-test="legend-today">· {{ t('chart_legend_today') }} {{ item.today }}</span>
        </li>
      </ul>
      <p v-if="hasGaps" class="dim mt-0.5 text-xs">{{ t('chart_dashed_hint') }}</p>
      <p v-if="note" class="dim mt-0.5 text-xs" data-test="chart-note">{{ note }}</p>
    </template>
    <p v-else class="dim">{{ fallbackText }}</p>
  </div>
</template>
