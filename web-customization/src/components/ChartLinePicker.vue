<script setup lang="ts">
import { ref } from 'vue'
import { CHART_KINDS, CHART_LINES, barDefs, barPath, lineDefs, readChartAnim, readChartForecast, readChartGoalZone, readChartKind, readChartLine, readChartSparks, runParts, writeChartAnim, writeChartForecast, writeChartGoalZone, writeChartKind, writeChartLine, writeChartSparks, type ChartKind, type ChartLine, type Pt } from '../lib/chartLine'
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

// «Дополнения» (55.2 срезы 4, 6, 8, 9): четыре вкл/выкл-настройки одним списком переключателей вместо трёх групп карточек (раздел короче, 61.6).
// Все выключены по умолчанию и независимы; каждая — свой ключ localStorage (chart_anim / chart_forecast / chart_goalzone).
type ExtraKey = 'anim' | 'forecast' | 'goalzone' | 'sparks'
const EXTRAS: { key: ExtraKey; on: () => boolean; save: (v: boolean) => boolean }[] = [
  { key: 'anim', on: () => readChartAnim() === 'draw', save: (v) => writeChartAnim(v ? 'draw' : 'none') },
  { key: 'forecast', on: () => readChartForecast() === 'trend', save: (v) => writeChartForecast(v ? 'trend' : 'off') },
  { key: 'goalzone', on: () => readChartGoalZone() === 'on', save: (v) => writeChartGoalZone(v ? 'on' : 'off') },
  { key: 'sparks', on: () => readChartSparks() === 'on', save: (v) => writeChartSparks(v ? 'on' : 'off') },
]
const extras = ref<Record<ExtraKey, boolean>>({ anim: EXTRAS[0].on(), forecast: EXTRAS[1].on(), goalzone: EXTRAS[2].on(), sparks: EXTRAS[3].on() })
const extrasSaved = ref(true)
const toggleExtra = (key: ExtraKey) => {
  const e = EXTRAS.find((x) => x.key === key)!
  const next = !extras.value[key]
  extrasSaved.value = e.save(next)
  if (extrasSaved.value) extras.value[key] = next
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
    <h4 class="mb-1 mt-5 text-sm font-semibold">{{ t('cust_sub_extras') }}</h4>
    <p class="dim mb-2 text-xs">{{ t('cust_sec_extras_hint') }}</p>
    <p v-if="!extrasSaved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="extras-save-error">{{ t('cust_splash_save_error') }}</p>
    <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
      <li
        v-for="e in EXTRAS"
        :key="e.key"
        class="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
        :style="{ background: 'var(--bg-card)', borderColor: extras[e.key] ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'extra-' + e.key"
        :data-active="extras[e.key]"
      >
        <span class="text-sm">{{ t(('chart_extra_' + e.key) as never) }}</span>
        <button
          type="button"
          role="switch"
          class="secondary px-2 py-1 text-sm"
          :aria-checked="extras[e.key]"
          :aria-label="t(('chart_extra_' + e.key) as never)"
          data-testid="extra-toggle"
          @click="toggleExtra(e.key)"
        >
          {{ extras[e.key] ? t('cust_extra_on') : t('cust_extra_off') }}
        </button>
      </li>
    </ul>
  </div>
</template>
