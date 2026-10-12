<script setup lang="ts">
import { ref } from 'vue'
import { CHART_ANIMS, CHART_FORECASTS, CHART_KINDS, CHART_LINES, barDefs, barPath, lineDefs, readChartAnim, readChartForecast, readChartKind, readChartLine, runParts, writeChartAnim, writeChartForecast, writeChartKind, writeChartLine, type ChartAnim, type ChartForecast, type ChartKind, type ChartLine, type Pt } from '../lib/chartLine'
import { t } from '../lib/i18n'

// Выбор стиля ЛИНИИ графика (BACKLOG 55.2 срез 3): обычная · сглаженная · сглаженная с областью. Бесплатно; localStorage `chart_line`;
// графики подхватывают выбор при открытии страницы. Предпросмотр рисуют те же функции, что и график (lib/chartLine.ts — копия из Дашборда).
const current = ref<ChartLine>(readChartLine())
const saved = ref(true)
const label = (v: ChartLine): string => t(('chart_line_' + v) as never)
const choose = (v: ChartLine) => {
  saved.value = writeChartLine(v)
  if (saved.value) current.value = v
}

// Анимация появления (55.2 срез 4): «Без анимации» (по умолчанию) / «Линия рисуется». Гасится при «уменьшить движение» и «Отключить анимации».
const anim = ref<ChartAnim>(readChartAnim())
const animSaved = ref(true)
const animLabel = (v: ChartAnim): string => t(('chart_anim_' + v) as never)
const chooseAnim = (v: ChartAnim) => {
  animSaved.value = writeChartAnim(v)
  if (animSaved.value) anim.value = v
}

// Прогноз вперёд (55.2 срез 6): «Без прогноза» (по умолчанию) / «Тренд на 3 дня» — пунктир по линейному тренду последних точек.
const forecast = ref<ChartForecast>(readChartForecast())
const forecastSaved = ref(true)
const forecastLabel = (v: ChartForecast): string => t(('chart_forecast_' + v) as never)
const chooseForecast = (v: ChartForecast) => {
  forecastSaved.value = writeChartForecast(v)
  if (forecastSaved.value) forecast.value = v
}

// Вид графика (55.2 срез 7): «Линия» (по умолчанию) / «Столбцы» — столбец на день с данными, от нуля; у метрик с особенностями подходов — составной.
const kind = ref<ChartKind>(readChartKind())
const kindSaved = ref(true)
const kindLabel = (v: ChartKind): string => t(('chart_kind_' + v) as never)
const chooseKind = (v: ChartKind) => {
  kindSaved.value = writeChartKind(v)
  if (kindSaved.value) kind.value = v
}
const BAR_SAMPLE = [22, 34, 28, 40, 18, 36]
const kindPreview = (v: ChartKind): string => {
  if (v === 'line') {
    const pts = BAR_SAMPLE.map((y, i) => [14 + i * 32, 48 - y] as Pt)
    let s = pts.slice(1).map((p, i) => `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${p[0]}" y2="${p[1]}" stroke="var(--accent)" stroke-width="2.5" />`).join('')
    for (const [x, y] of pts) s += `<circle cx="${x}" cy="${y}" r="3.2" fill="var(--accent)" />`
    return s
  }
  let s = barDefs('kp', 'var(--accent)')
  BAR_SAMPLE.forEach((y, i) => {
    s += `<path d="${barPath(14 + i * 32, 18, 48 - y, 48)}" fill="url(#kp-bar)" />`
  })
  return s + '<line x1="2" y1="48" x2="186" y2="48" stroke="var(--border)" stroke-width="1" />'
}

const SAMPLE: Pt[] = [[14, 36], [46, 14], [78, 32], [110, 18], [142, 40], [174, 20]]
const preview = (v: ChartLine): string => {
  const uid = 'lp-' + v
  const color = 'var(--accent)'
  let svg = lineDefs(v, uid, 'var(--accent)')
  if (v === 'line') {
    for (let i = 1; i < SAMPLE.length; i++)
      svg += `<line x1="${SAMPLE[i - 1][0]}" y1="${SAMPLE[i - 1][1]}" x2="${SAMPLE[i][0]}" y2="${SAMPLE[i][1]}" stroke="${color}" stroke-width="2.5" />`
  } else {
    svg += runParts(v, SAMPLE, color, 48, uid)
  }
  for (const [x, y] of SAMPLE) svg += `<circle cx="${x}" cy="${y}" r="3.2" fill="${color}" />`
  return svg
}
</script>

<template>
  <div data-testid="line-picker">
    <h4 class="mb-1 text-sm font-semibold">{{ t('cust_sub_kind') }}</h4>
    <p class="dim mb-2 text-xs">{{ t('cust_sec_kind_hint') }}</p>
    <p v-if="!kindSaved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="kind-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="mb-5 grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr))">
      <div
        v-for="v in CHART_KINDS"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: kind === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'kind-' + v"
        :data-active="kind === v"
      >
        <svg viewBox="0 0 188 52" width="100%" height="52" role="img" :aria-label="kindLabel(v)" v-html="kindPreview(v)"></svg>
        <p class="m-0 text-sm font-medium">{{ kindLabel(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="kind === v"
          :aria-pressed="kind === v"
          :aria-label="kindLabel(v) + ': ' + (kind === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="kind-choose"
          @click="chooseKind(v)"
        >
          {{ kind === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
    <h4 class="mb-1 text-sm font-semibold">{{ t('cust_sub_lines') }}</h4>
    <p class="dim mb-2 text-xs">{{ t('cust_sec_lines_hint') }}</p>
    <p v-if="!saved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="line-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr))">
      <div
        v-for="v in CHART_LINES"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'line-' + v"
        :data-active="current === v"
      >
        <svg viewBox="0 0 188 52" width="100%" height="52" role="img" :aria-label="label(v)" v-html="preview(v)"></svg>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="line-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
    <h4 class="mb-1 mt-5 text-sm font-semibold">{{ t('cust_sub_anim') }}</h4>
    <p class="dim mb-2 text-xs">{{ t('cust_sec_anim_hint') }}</p>
    <p v-if="!animSaved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="anim-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr))">
      <div
        v-for="v in CHART_ANIMS"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: anim === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'anim-' + v"
        :data-active="anim === v"
      >
        <p class="m-0 text-sm font-medium">{{ animLabel(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="anim === v"
          :aria-pressed="anim === v"
          :aria-label="animLabel(v) + ': ' + (anim === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="anim-choose"
          @click="chooseAnim(v)"
        >
          {{ anim === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
    <h4 class="mb-1 mt-5 text-sm font-semibold">{{ t('cust_sub_forecast') }}</h4>
    <p class="dim mb-2 text-xs">{{ t('cust_sec_forecast_hint') }}</p>
    <p v-if="!forecastSaved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="forecast-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr))">
      <div
        v-for="v in CHART_FORECASTS"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: forecast === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'forecast-' + v"
        :data-active="forecast === v"
      >
        <p class="m-0 text-sm font-medium">{{ forecastLabel(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="forecast === v"
          :aria-pressed="forecast === v"
          :aria-label="forecastLabel(v) + ': ' + (forecast === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="forecast-choose"
          @click="chooseForecast(v)"
        >
          {{ forecast === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
  </div>
</template>
