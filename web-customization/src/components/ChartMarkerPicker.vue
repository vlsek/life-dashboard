<script setup lang="ts">
import { ref } from 'vue'
import { CHART_MARKERS, markerDefs, markerParts, previewSlices, readChartMarker, writeChartMarker, type ChartMarker } from '../lib/chartMarker'
import { t } from '../lib/i18n'

// Выбор стиля маркеров-мини-диаграмм на графиках (BACKLOG 13:54; владелец 2026-10-10: «мне все варианты нравятся, давай добавим
// в раздел кастомизации»). Бесплатно; localStorage `chart_marker`; графики берут стиль при открытии страницы. Предпросмотр —
// те же функции, что рисуют маркеры на графике (lib/chartMarker.ts, копия из Дашборда).
const current = ref<ChartMarker>(readChartMarker())
const saved = ref(true)
const label = (v: ChartMarker): string => t(('chart_marker_' + v) as never)
const choose = (v: ChartMarker) => {
  saved.value = writeChartMarker(v)
  if (saved.value) current.value = v
}

const SAMPLE = [[5, 3, 2], [4, 4, 0, 2], [8, 1, 1], [3, 3, 3, 1], [6, 2, 0, 0]]
const XS = [26, 62, 98, 134, 170]
const YS = [38, 24, 32, 14, 22]
// Мини-график из пяти точек: линия + маркеры выбранного стиля (uid — на карточку, чтобы градиенты не пересекались).
const preview = (v: ChartMarker): string => {
  const uid = 'pv-' + v
  let svg = markerDefs(v, uid)
  svg += `<polyline points="${XS.map((x, i) => x + ',' + YS[i]).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-opacity=".8" />`
  SAMPLE.forEach((reps, i) => {
    svg += markerParts(v, previewSlices(reps, XS[i], YS[i], 6.5), XS[i], YS[i], 6.5, uid)
  })
  return svg
}
</script>

<template>
  <div data-testid="marker-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_markers_hint') }}</p>
    <p v-if="!saved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="marker-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr))">
      <div
        v-for="v in CHART_MARKERS"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'marker-' + v"
        :data-active="current === v"
      >
        <svg viewBox="0 0 196 52" width="100%" height="52" role="img" :aria-label="label(v)" v-html="preview(v)"></svg>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="marker-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
  </div>
</template>
