<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { prepareChartSeries, type ChartPoint } from '../lib/chart'
import MetricStreakBadge from './MetricStreakBadge.vue'
import { buildLegend, colorFor, describeShares, escapeXml, hasNamedVariations, pieSlices } from '../lib/variationChart'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import type { VariationShare } from '../lib/variationChart'
import { getLang, t } from '../lib/i18n'
import { todayStr } from '../lib/date'
import MetricIcon from './MetricIcon.vue'
import RecordBadge from './RecordBadge.vue'
import { RECORDS_EVENT, formatRecordDate, formatRecordValue, recordsEnabled, type RecordInfo } from '../lib/records'
import type { VariationRecord } from '../lib/variationChart'
import { markerDefs, markerParts, nextMarkerUid, readChartMarker } from '../lib/chartMarker'
import { FORECAST_DAYS, addDaysIso, barDefs, barPath, lineDefs, readChartAnim, readChartForecast, readChartKind, readChartLine, runParts, stackSpans, trendForecast, type Pt } from '../lib/chartLine'

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
    record?: RecordInfo | null // рекорд графика за всё время (BACKLOG раздел 28); показывается под названием, если не выключен в настройках
    variationRecords?: VariationRecord[] | null // рекорд за один подход по каждой особенности за всё время (BACKLOG 952); в легенде «рекорд: N»
    today?: string // «сегодня» для легенды (ISO); по умолчанию — реальная сегодняшняя дата, параметр нужен тестам
  }>(),
  { title: '', icon: null, unit: '', color: 'var(--accent)', goalValue: null, goalLabel: null, note: null, variations: null, streak: null, record: null, variationRecords: null, today: undefined },
)

const prepared = computed<ChartPoint[]>(() => prepareChartSeries(props.points))
// «Цветные» точки и легенда (BACKLOG 19, 11:41) — только если у подходов есть особенности с названием; иначе график как прежде.
const order = computed(() => props.variations ?? [])
const colored = computed(() => hasNamedVariations(props.points))
const legend = computed(() => (colored.value ? buildLegend(props.points, order.value, props.today ?? todayStr()) : []))
// «рекорд: N» у каждой особенности в легенде (BACKLOG 952): максимум повторений в одном подходе за всё время; выключается тем же
// выключателем «рекорды у графиков», что и строка рекорда под названием (реагирует сразу, без перезагрузки).
const recordsOn = ref(recordsEnabled('charts'))
const syncRecords = () => (recordsOn.value = recordsEnabled('charts'))
onMounted(() => window.addEventListener(RECORDS_EVENT, syncRecords))
onBeforeUnmount(() => window.removeEventListener(RECORDS_EVENT, syncRecords))
const NONE_KEY = '\u0000none'
const legendRecords = computed(() => {
  const map = new Map<string, VariationRecord>()
  if (recordsOn.value) for (const r of props.variationRecords ?? []) map.set(r.label ?? NONE_KEY, r)
  return map
})
function legendRecord(label: string | null): VariationRecord | undefined {
  return legendRecords.value.get(label ?? NONE_KEY)
}
const hasGaps = computed(() => prepared.value.some((p) => p.y == null) && prepared.value.some((p) => p.y != null))

function fmtChartLabel(iso: string): string {
  const parts = iso.split('-')
  return `${parts[2]}.${parts[1]}`
}

// Точка-«мини-круг»: сектора по долям особенностей (одна особенность — сплошной круг её цвета). Подсказка <title> —
// «дд.мм: 50 классических · 30 алмазных · 20 на бицепс = 100»; названия — текст пользователя, поэтому экранируются.
// Стиль маркеров-диаграмм (BACKLOG 13:54): выбирается в «Кастомизации» (localStorage `chart_marker`), по умолчанию — прежний плоский.
const markerStyle = readChartMarker()
const markerUid = nextMarkerUid()
// Стиль линии (55.2 срез 3): обычная (прежние отрезки, по умолчанию) · сглаженная · сглаженная с областью; `localStorage.chart_line`.
const lineStyle = readChartLine()
// Анимация появления (55.2 срез 4): класс `chart-draw` на svg включает CSS из style.css; при «уменьшить движение»/«Отключить анимации» CSS её гасит.
const drawAnim = readChartAnim() === 'draw'
// Прогноз вперёд (55.2 срез 6): `localStorage.chart_forecast` = trend → пунктир на 3 дня по линейному тренду; по умолчанию выключен.
const forecastOn = readChartForecast() === 'trend'
// Вид графика (55.2 срез 7): `localStorage.chart_kind` = bars → столбцы (с нуля, у метрик с особенностями — составные); по умолчанию линия. В столбцах прогноза нет.
const barsOn = readChartKind() === 'bars'

function pieMarker(x: number, y: number, label: string, shares: VariationShare[]): string {
  const slices = pieSlices(shares, order.value, x, y, 6.5)
  if (!slices.length) return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${props.color}" />`
  const total = shares.reduce((n, s) => n + (s.reps > 0 ? s.reps : 0), 0)
  const tip = escapeXml(`${label}: ${describeShares(shares, t('chart_legend_none'))} = ${total}`)
  return `<g data-test="pie-point"><title>${tip}</title>${markerParts(markerStyle, slices, x, y, 6.5, markerUid)}</g>`
}

// Портировано 1:1 из svgLineChart() в config.js — строит только внутренность <svg>
// (линии/точки/подписи), сама обёртка — в шаблоне ниже.
const CH_W = 620
const CH_H = 160
const CH_PAD = 34

// Геометрия графика: координаты точек (общие для рисунка и для подсказки с перекрестием, BACKLOG 55.2 срез 2).
const geom = computed(() => {
  const points = prepared.value
  const withValues = points.filter((p) => p.y != null)
  if (withValues.length < 2) return null
  const w = CH_W
  const h = CH_H
  const pad = CH_PAD
  const values = withValues.map((p) => p.y as number)
  if (props.goalValue != null) values.push(props.goalValue)
  // прогноз вперёд (необязательный): строится от последнего дня графика, учитывается в масштабе и сдвигает шаг по X
  const fcValues = forecastOn && !barsOn
    ? trendForecast(
        points.flatMap((p, i) => (p.y != null ? [[i, p.y as number] as Pt] : [])),
        points.length - 1,
        FORECAST_DAYS,
      )
    : null
  if (fcValues) values.push(...fcValues)
  if (barsOn) values.push(0) // столбцы растут от нуля: высота не должна врать
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const range = max - min
  const stepX = (w - pad * 2) / (points.length - 1 + (fcValues ? FORECAST_DAYS : 0))
  const yOf = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2)

  const coords = points.map((p, i) => ({
    x: pad + i * stepX,
    y: p.y != null ? yOf(p.y) : null,
    label: fmtChartLabel(p.date),
    value: p.y,
    shares: p.shares,
  }))
  const lastDate = points[points.length - 1].date
  const fc = fcValues ? fcValues.map((v, k) => ({ x: pad + (points.length + k) * stepX, y: yOf(v), value: v, label: fmtChartLabel(addDaysIso(lastDate, k + 1)) })) : []
  return { w, h, pad, min, range, coords, fc }
})

// Столбцы (55.2 срез 7): по столбцу на день с данными, от нуля, скруглённая верхушка; у метрик с «особенностями» подходов — сегменты в цветах легенды.
function barsSvg(g: NonNullable<typeof geom.value>): string {
  const { w, h, pad, min, range, coords } = g
  const yOf = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2)
  const yBase = yOf(0)
  const stepX = coords.length > 1 ? coords[1].x - coords[0].x : w
  const bw = Math.max(4, Math.min(34, stepX * 0.62))
  let svg = ''
  if (!(colored.value && coords.some((c) => c.shares && c.shares.length))) svg += barDefs(markerUid, props.color)
  const labelEvery = Math.max(1, Math.ceil(coords.filter((c) => c.y != null).length / 12))
  let shown = 0
  for (const c of coords) {
    if (c.y == null || c.value == null) continue
    const top = Math.min(c.y, yBase)
    const bottom = Math.max(c.y, yBase)
    if (colored.value && c.shares && c.shares.length) {
      const spans = stackSpans(c.shares.map((s) => s.reps), top, bottom)
      const lastIdx = spans.map((s, i) => (s ? i : -1)).filter((i) => i >= 0).pop()
      const tip = escapeXml(`${c.label}: ${describeShares(c.shares, t('chart_legend_none'))} = ${c.value}`)
      svg += `<g class="ch-bar" data-test="bar-point"><title>${tip}</title>`
      c.shares.forEach((s, i) => {
        const sp = spans[i]
        if (!sp) return
        const d = i === lastIdx ? barPath(c.x, bw, sp[0], sp[1]) : barPath(c.x, bw, sp[0], sp[1], 0)
        svg += `<path d="${d}" fill="${colorFor(s.label, order.value)}" stroke="var(--bg-card)" stroke-width="0.8" />`
      })
      svg += '</g>'
    } else {
      svg += `<path class="ch-bar" data-test="bar-point" d="${barPath(c.x, bw, top, bottom)}" fill="url(#${markerUid}-bar)" />`
    }
    if (shown % labelEvery === 0) {
      svg += `<text x="${c.x.toFixed(1)}" y="${(top - 6).toFixed(1)}" font-size="11" fill="var(--text)" text-anchor="middle">${c.value}${props.unit || ''}</text>`
      svg += `<text x="${c.x.toFixed(1)}" y="${h - 8}" font-size="10" fill="var(--text-dim)" text-anchor="middle">${c.label}</text>`
    }
    shown++
  }
  // нулевая линия (основание столбцов)
  svg += `<line x1="${pad}" y1="${yBase.toFixed(1)}" x2="${(w - pad).toFixed(1)}" y2="${yBase.toFixed(1)}" stroke="var(--border)" stroke-width="1" />`
  return svg
}

const innerSvg = computed<string | null>(() => {
  const g = geom.value
  if (!g) return null
  const { w, h, pad, min, range, coords, fc } = g

  let svg = (colored.value ? markerDefs(markerStyle, markerUid) : '') + lineDefs(lineStyle, markerUid, props.color)

  let goal = '' // линия цели: у линейного графика рисуется под линией, у столбцов — поверх них (иначе подпись прячется за столбцом)
  if (props.goalValue != null) {
    const gy = h - pad - ((props.goalValue - min) / range) * (h - pad * 2)
    goal += `<line x1="${pad}" y1="${gy.toFixed(1)}" x2="${(w - pad).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.85" />`
    const goalText = props.goalLabel || `${props.goalValue}${props.unit || ''}`
    const goalTextY = gy < pad + 10 ? gy + 12 : gy - 5
    goal += `<text x="${(w - pad).toFixed(1)}" y="${goalTextY.toFixed(1)}" font-size="10" fill="var(--text-dim)"${barsOn ? ' stroke="var(--bg-card)" stroke-width="3" paint-order="stroke"' : ''} text-anchor="end">${goalText}</text>`
  }

  if (!barsOn) svg += goal

  if (barsOn) return svg + barsSvg(g) + goal

  let lastReal: { x: number; y: number } | null = null
  let gapBetween = false
  let run: Pt[] = [] // участок без пропусков — для сглаженных стилей
  const flushRun = () => {
    svg += runParts(lineStyle, run, props.color, h - pad, markerUid)
    run = []
  }
  for (const c of coords) {
    if (c.y == null) {
      if (lastReal) gapBetween = true
      continue
    }
    if (lastReal) {
      if (lineStyle === 'line' || gapBetween) {
        const dash = gapBetween ? ` stroke-dasharray="5,4"` : ''
        if (lineStyle !== 'line') flushRun() // участок закончился на пропуске: пунктирный мостик остаётся прямым, как раньше
        svg += `<line class="${gapBetween ? 'ch-bridge' : 'ch-line'}"${gapBetween ? '' : ' pathLength="1"'} x1="${lastReal.x.toFixed(1)}" y1="${lastReal.y.toFixed(1)}" x2="${c.x.toFixed(1)}" y2="${c.y.toFixed(1)}" stroke="${props.color}" stroke-width="2.5"${dash} opacity="${gapBetween ? 0.55 : 1}" />`
      }
    }
    if (lineStyle !== 'line') run.push([c.x, c.y])
    lastReal = { x: c.x, y: c.y }
    gapBetween = false
  }
  if (lineStyle !== 'line') flushRun()

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

  // прогноз: приглушённый пунктир от последней реальной точки, пустой кружок в конце и подпись «прогноз»
  if (fc.length && lastReal) {
    const pts = [lastReal, ...fc].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const end = fc[fc.length - 1]
    svg += `<polyline class="ch-bridge" data-test="chart-forecast" points="${pts}" fill="none" stroke="${props.color}" stroke-width="2" stroke-dasharray="1.5,5" stroke-linecap="round" opacity="0.7" />`
    svg += `<circle class="ch-bridge" cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="3.5" fill="var(--bg-card)" stroke="${props.color}" stroke-width="1.6" />`
    // подпись — по ту сторону линии, где она не лежит на пунктире: при росте над точкой, при спаде под ней; контур цвета карточки — для читаемости
    const rising = end.y <= lastReal.y
    const ty = rising ? (end.y < pad + 14 ? end.y + 16 : end.y - 12) : end.y + 17
    svg += `<text class="ch-bridge" x="${end.x.toFixed(1)}" y="${ty.toFixed(1)}" font-size="10" fill="var(--text-dim)" stroke="var(--bg-card)" stroke-width="3" paint-order="stroke" text-anchor="end">${t('chart_forecast_label')} ${end.value}${props.unit || ''}</text>`
  }
  return svg
})

// ── Подсказка с перекрестием (BACKLOG 55.2 срез 2): наведение мышью, касание, стрелки на клавиатуре ──────────────
// Рисуется отдельным слоем поверх графика (сам график не меняется): вертикальная линия, кольцо вокруг точки и плашка
// со значением и датой (у метрик с «особенностями» — ещё разбивка по ним). Касание держит плашку 3,5 с.
type Coord = NonNullable<typeof geom.value>['coords'][number]
const chartEl = ref<SVGSVGElement | null>(null)
const active = ref<number | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const realIdx = computed<number[]>(() => (geom.value ? geom.value.coords.flatMap((c, i) => (c.y != null ? [i] : [])) : []))
const activeCoord = computed<(Coord & { y: number }) | null>(() => {
  const c = geom.value && active.value != null ? geom.value.coords[active.value] : null
  return c && c.y != null ? (c as Coord & { y: number }) : null
})
const tipText = computed(() => {
  const c = activeCoord.value
  if (!c) return ''
  const extra = colored.value && c.shares && c.shares.length ? ` · ${describeShares(c.shares, t('chart_legend_none'))}` : ''
  return `${c.label}: ${c.value}${props.unit || ''}${extra}`
})
const tipStyle = computed(() => {
  const c = activeCoord.value
  if (!c) return {}
  const left = Math.min(86, Math.max(14, (c.x / CH_W) * 100))
  const below = c.y < 46
  return { left: left + '%', top: (c.y / CH_H) * 100 + '%', transform: below ? 'translate(-50%, 14px)' : 'translate(-50%, calc(-100% - 12px))' }
})

function nearestIndex(clientX: number): number | null {
  const g = geom.value
  const el = chartEl.value
  if (!g || !el || !realIdx.value.length) return null
  const r = el.getBoundingClientRect()
  if (!r.width) return null
  const x = ((clientX - r.left) / r.width) * CH_W
  let best = realIdx.value[0]
  for (const i of realIdx.value) if (Math.abs(g.coords[i].x - x) < Math.abs(g.coords[best].x - x)) best = i
  return best
}
function clearHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
}
function onPointer(e: PointerEvent) {
  clearHide()
  active.value = nearestIndex(e.clientX)
  if (e.pointerType === 'touch') hideTimer = setTimeout(() => (active.value = null), 3500)
}
function onLeave(e: PointerEvent) {
  if (e.pointerType !== 'touch') active.value = null
}
function onKey(e: KeyboardEvent) {
  const list = realIdx.value
  if (!list.length) return
  const pos = active.value == null ? -1 : list.indexOf(active.value)
  let next: number | null | undefined
  if (e.key === 'ArrowRight') next = list[Math.min(list.length - 1, pos + 1)]
  else if (e.key === 'ArrowLeft') next = list[pos <= 0 ? 0 : pos - 1]
  else if (e.key === 'Home') next = list[0]
  else if (e.key === 'End') next = list[list.length - 1]
  else if (e.key === 'Escape') next = null
  else return
  e.preventDefault()
  clearHide()
  active.value = next
}
onBeforeUnmount(clearHide)

// ── Доступность (BACKLOG 55.2 срез 5): скрытая от глаз сводка и таблица данных для скринридеров ──────────────────────────
// Рисунок графика — картинка; здесь те же значения текстом: «минимум, максимум, последнее» и таблица «дата — значение» (только дни с данными).
const a11yRows = computed(() =>
  prepared.value
    .filter((p) => p.y != null)
    .map((p) => ({
      label: fmtChartLabel(p.date),
      value: `${p.y}${props.unit || ''}`,
      extra: colored.value && p.shares && p.shares.length ? describeShares(p.shares, t('chart_legend_none')) : '',
    })),
)
const a11ySummary = computed(() => {
  const ys = prepared.value.filter((p) => p.y != null).map((p) => p.y as number)
  if (!ys.length) return ''
  const u = props.unit || ''
  const fcList = geom.value?.fc ?? []
  const fcText = fcList.length ? `, ${t('chart_forecast_label')} ${fcList[fcList.length - 1].label}: ${fcList[fcList.length - 1].value}${u}` : ''
  return `${t('chart_sum_min')} ${Math.min(...ys)}${u}, ${t('chart_sum_max')} ${Math.max(...ys)}${u}, ${t('chart_sum_last')} ${ys[ys.length - 1]}${u}${fcText}`
})
const sumId = markerUid + '-sum'

const fallbackText = computed(() => {
  const withValues = props.points.filter((p) => p.y != null)
  if (withValues.length === 0) return t('chart_not_enough_data') + ' ' + t('chart_no_data')
  const last = withValues[withValues.length - 1]
  return `${t('chart_not_enough_data')} ${t('chart_last_value')} ${last.y}${props.unit || ''}`
})
</script>

<template>
  <div>
    <h4 v-if="title" class="mb-1.5 text-base font-semibold"><MetricIcon v-if="icon" :icon="icon" extra-style="margin-right:0.35em;" />{{ title }}<MetricStreakBadge v-if="streak" :info="streak" /></h4>
    <RecordBadge v-if="record" kind="charts" :record="record" :unit="unit" class="mb-1.5" />
    <template v-if="innerSvg">
      <div class="relative" data-test="chart-wrap">
        <svg
          ref="chartEl"
          viewBox="0 0 620 160"
          width="100%"
          :height="160"
          tabindex="0"
          style="touch-action: pan-y; outline-offset: 2px"
          :aria-label="title ? title + ': ' + t('chart_hover_hint') : t('chart_hover_hint')"
          data-test="chart-svg"
          :aria-describedby="a11ySummary ? sumId : undefined"
          :class="{ 'chart-draw': drawAnim }"
          @pointermove="onPointer"
          @pointerdown="onPointer"
          @pointerleave="onLeave"
          @keydown="onKey"
          @blur="active = null"
          v-html="innerSvg"
        ></svg>
        <svg v-if="activeCoord" viewBox="0 0 620 160" width="100%" :height="160" class="pointer-events-none absolute left-0 top-0" aria-hidden="true" data-test="chart-cross">
          <line :x1="activeCoord.x" y1="8" :x2="activeCoord.x" :y2="CH_H - 20" stroke="var(--text-dim)" stroke-width="1" stroke-dasharray="3,3" opacity=".75" />
          <circle :cx="activeCoord.x" :cy="activeCoord.y" r="8.5" fill="none" stroke="var(--accent)" stroke-width="1.6" />
        </svg>
        <div
          v-if="activeCoord"
          class="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border px-2 py-1 text-xs shadow-md"
          style="background: var(--bg-card); border-color: var(--border); color: var(--text)"
          :style="tipStyle"
          role="status"
          data-test="chart-tip"
        >
          {{ tipText }}
        </div>
      </div>
      <p v-if="a11ySummary" :id="sumId" class="sr-only" data-test="chart-summary">{{ a11ySummary }}</p>
      <!-- таблицу прячет ОБЁРТКА: у display:table класс sr-only не обрезает содержимое (в Chromium таблица занимала 239×240 px) -->
      <div v-if="a11yRows.length" class="sr-only" data-test="chart-table-wrap">
        <table data-test="chart-table">
          <caption>{{ title }}: {{ t('chart_table_caption') }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ t('chart_table_date') }}</th>
              <th scope="col">{{ t('chart_table_value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in a11yRows" :key="i">
              <th scope="row">{{ r.label }}</th>
              <td>{{ r.value }}<template v-if="r.extra"> ({{ r.extra }})</template></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul v-if="legend.length" class="m-0 mt-1.5 flex list-none flex-col gap-y-1.5 p-0 text-xs" data-test="chart-legend" :aria-label="t('chart_legend_aria')">
        <li v-for="(item, i) in legend" :key="i" class="flex flex-wrap items-center gap-x-1 gap-y-0.5" data-test="legend-item">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: item.color }" aria-hidden="true"></span>
          {{ item.label ?? t('chart_legend_none') }}
          <span class="dim">· {{ item.reps }}</span>
          <span class="dim" data-test="legend-today">· {{ t('chart_legend_today') }} {{ item.today }}</span>
          <span v-if="legendRecord(item.label)" class="dim" data-test="legend-record" :title="t('chart_legend_record_title') + ' · ' + formatRecordDate(legendRecord(item.label)!.date, getLang())">· {{ t('chart_legend_record') }} {{ formatRecordValue(legendRecord(item.label)!.y, getLang()) }}</span>
        </li>
      </ul>
      <p v-if="hasGaps" class="dim mt-0.5 text-xs">{{ t('chart_dashed_hint') }}</p>
      <p v-if="note" class="dim mt-0.5 text-xs" data-test="chart-note">{{ note }}</p>
    </template>
    <p v-else class="dim">{{ fallbackText }}</p>
  </div>
</template>
