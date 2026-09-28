<script setup lang="ts">
import { computed } from 'vue'
import { prepareChartSeries, type ChartPoint } from '../lib/chart'
import { t } from '../lib/i18n'

const props = withDefaults(
  defineProps<{
    title?: string
    points: { date: string; y: number | null }[]
    unit?: string
    color?: string
    goalValue?: number | null
    goalLabel?: string | null
  }>(),
  { title: '', unit: '', color: 'var(--accent)', goalValue: null, goalLabel: null },
)

const prepared = computed<ChartPoint[]>(() => prepareChartSeries(props.points))
const hasGaps = computed(() => prepared.value.some((p) => p.y == null) && prepared.value.some((p) => p.y != null))

function fmtChartLabel(iso: string): string {
  const parts = iso.split('-')
  return `${parts[2]}.${parts[1]}`
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
    svg += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="${props.color}" />`
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
    <h4 v-if="title" class="mb-1.5 font-medium">{{ title }}</h4>
    <template v-if="innerSvg">
      <svg viewBox="0 0 620 160" width="100%" :height="160" v-html="innerSvg"></svg>
      <p v-if="hasGaps" class="dim mt-0.5 text-xs">{{ t('chart_dashed_hint') }}</p>
    </template>
    <p v-else class="dim">{{ fallbackText }}</p>
  </div>
</template>
