<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { getLang, t, type DictKey } from '../lib/i18n'
import { addDaysIso } from '../lib/date'
import { PERFECT_MODE, buildYearGrid, gridMetrics, type CellState, type GridCell, type YearGridData } from '../lib/yearGrid'

// Год-сетка (BACKLOG 75.8): квадраты по дням за год. Состояние читается и без цвета: у каждого свой рисунок (заливка / контур / точка / пунктир)
// и подпись в легенде и в деталях дня. Клетки — ячейки сетки, а не кнопки: 371 кнопка перегрузила бы Tab, а блок «минимум цели нажатия»
// раздул бы их до 32 px; вместо этого сетка одна в Tab-порядке, стрелки двигают выбранный день (←→ неделя, ↑↓ день).
const props = defineProps<{ data: YearGridData | null }>()

const MODE_KEY = 'dash_year_grid_mode'
const mode = ref<string>(localStorage.getItem(MODE_KEY) || PERFECT_MODE)
const options = computed(() => gridMetrics(props.data?.metrics ?? []))
const currentMode = computed(() => (mode.value === PERFECT_MODE || options.value.some((m) => m.id === mode.value) ? mode.value : PERFECT_MODE))
function onMode(e: Event) {
  mode.value = (e.target as HTMLSelectElement).value
  try { localStorage.setItem(MODE_KEY, mode.value) } catch { /* приватный режим — выбор просто не запомнится */ }
}

const grid = computed(() => (props.data ? buildYearGrid(props.data.metrics, props.data.byDay, currentMode.value, props.data.today) : null))
const cells = computed<GridCell[]>(() => grid.value?.weeks.flat() ?? [])
const metricOf = computed(() => options.value.find((m) => m.id === currentMode.value) ?? null)

// Сетка длинная — по умолчанию показываем последние недели (справа), а не год назад
const scroller = ref<HTMLElement | null>(null)
const toEnd = () => nextTick(() => { if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth })
onMounted(toEnd)
watch(() => [props.data, currentMode.value], toEnd)

const selected = ref<string | null>(null)
const selCell = computed(() => cells.value.find((c) => c.date === selected.value) ?? null)
const todayIso = computed(() => (cells.value.length ? cells.value.filter((c) => c.state !== 'future').slice(-1)[0]?.date ?? null : null))
function select(c: GridCell) {
  if (c.state !== 'future') selected.value = c.date
}
function onKey(e: KeyboardEvent) {
  const step: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
  const n = step[e.key]
  if (n === undefined || !grid.value) return
  e.preventDefault()
  const from = selected.value ?? todayIso.value
  if (!from) return
  const next = addDaysIso(from, n)
  const c = cells.value.find((x) => x.date === next)
  if (c && c.state !== 'future') selected.value = next
}

const STATE_KEY: Record<CellState, DictKey> = { done: 'yg_done', missed: 'yg_missed', rest: 'yg_rest', pending: 'yg_pending', none: 'yg_none', future: 'yg_none' }
const label = (s: CellState) => t(STATE_KEY[s])
const fmtDay = (iso: string) => new Intl.DateTimeFormat(getLang() === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00'))
const cellLabel = (c: GridCell) => `${fmtDay(c.date)}: ${label(c.state)}`
const summary = computed(() => (grid.value && grid.value.countedDays > 0 ? `${t('yg_done_prefix')} ${grid.value.doneDays} ${t('yg_of')} ${grid.value.countedDays} ${t('yg_days_counted')}` : ''))
const detail = computed(() => {
  const c = selCell.value
  if (!c) return null
  const parts: string[] = []
  if (metricOf.value) {
    if (c.value != null) {
      const g = metricOf.value.goal_value
      parts.push(`${c.value}${g ? ' / ' + g : ''}${metricOf.value.unit ? ' ' + metricOf.value.unit : ''}`)
    }
  } else if (c.total > 0) parts.push(`${c.done} ${t('yg_of')} ${c.total}`)
  return { title: fmtDay(c.date), state: label(c.state), extra: parts.join(' · '), notes: props.data?.notes[c.date] ?? [] }
})
</script>

<template>
  <section v-if="grid" class="yg" data-test="year-grid" :aria-label="t('yg_title')">
    <div class="yg-head">
      <h3 class="yg-title">{{ t('yg_title') }}</h3>
      <select class="yg-mode" :value="currentMode" :aria-label="t('yg_mode_label')" data-test="yg-mode" @change="onMode">
        <option :value="PERFECT_MODE">{{ t('yg_perfect') }}</option>
        <option v-for="m in options" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </div>
    <p v-if="grid.first === null" class="dim yg-empty" data-test="yg-empty">{{ t('yg_empty') }}</p>
    <template v-else>
      <p v-if="summary" class="dim yg-summary" data-test="yg-summary">{{ summary }}</p>
      <div ref="scroller" class="yg-scroll">
        <div class="yg-grid" role="grid" tabindex="0" :aria-label="t('yg_title')" data-test="yg-grid" @keydown="onKey">
          <div
            v-for="c in cells"
            :key="c.date"
            role="gridcell"
            class="yg-cell"
            :class="['s-' + c.state, { sel: c.date === selected }]"
            :aria-label="c.state === 'future' ? undefined : cellLabel(c)"
            :aria-hidden="c.state === 'future' ? 'true' : undefined"
            :aria-selected="c.date === selected"
            :data-date="c.date"
            :data-state="c.state"
            @click="select(c)"
          ></div>
        </div>
      </div>
      <ul class="yg-legend dim" data-test="yg-legend">
        <li><i class="yg-cell s-done"></i>{{ t('yg_done') }}</li>
        <li><i class="yg-cell s-missed"></i>{{ t('yg_missed') }}</li>
        <li><i class="yg-cell s-rest"></i>{{ t('yg_rest') }}</li>
        <li><i class="yg-cell s-pending"></i>{{ t('yg_pending') }}</li>
      </ul>
      <div class="yg-detail" aria-live="polite" data-test="yg-detail">
        <template v-if="detail">
          <strong>{{ detail.title }}</strong> — {{ detail.state }}<template v-if="detail.extra"> ({{ detail.extra }})</template>
          <div v-if="detail.notes.length" class="yg-notes"><span class="dim">{{ t('yg_notes') }}:</span> {{ detail.notes.join('; ') }}</div>
        </template>
        <span v-else class="dim">{{ t('yg_hint') }}</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.yg { margin-top: 16px; }
.yg-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.yg-title { font-weight: 600; margin: 0; }
.yg-mode { max-width: 60%; }
.yg-summary, .yg-empty { margin: 6px 0; }
.yg-scroll { overflow-x: auto; padding-bottom: 4px; }
.yg-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 12px); grid-auto-columns: 12px; gap: 3px; width: max-content; outline-offset: 3px; }
.yg-cell { box-sizing: border-box; width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid transparent; display: inline-block; }
.yg-grid .yg-cell { cursor: pointer; }
.s-done { background: var(--accent); border-color: var(--accent); }
.s-missed { background: transparent; border-color: var(--text-dim); }
.s-rest { background: radial-gradient(circle, var(--text-dim) 0 1.6px, transparent 2px); border-color: color-mix(in srgb, var(--border) 70%, transparent); }
.s-pending { background: transparent; border: 1.5px dashed var(--accent); }
.s-none { background: color-mix(in srgb, var(--border) 35%, transparent); }
.s-future { visibility: hidden; }
.yg-cell.sel { outline: 2px solid var(--text); outline-offset: 1px; }
.yg-legend { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.85em; }
.yg-legend li { display: inline-flex; align-items: center; gap: 5px; }
.yg-detail { margin-top: 8px; min-height: 1.6em; }
.yg-notes { margin-top: 2px; }
</style>
