<script setup lang="ts">
import { ref } from 'vue'
import { CHART_LINES, lineDefs, readChartLine, runParts, writeChartLine, type ChartLine, type Pt } from '../lib/chartLine'
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
  </div>
</template>
