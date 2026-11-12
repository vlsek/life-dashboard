<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getLang, t } from '../lib/i18n'
import { defaultWeightUnit } from '../lib/weightUnit'
import { fmtVolume } from '../lib/summary'
import { delta, hasAnyTraining, monthlyVolumes, muscleBars, periodCompare, weeklyVolumes, type Delta, type StatsPeriod } from '../lib/weekNumbers'
import { parseIso } from '../lib/date'
import { muscleGoals } from '../lib/muscleGoals'
import type { DictKey } from '../lib/i18n'
import type { Exercise, WorkoutEntry } from '../lib/types'

// «Неделя в цифрах» (BACKLOG 69.14, срезы 1–2): три показателя периода с разницей к предыдущему и столбики объёма.
// Период — календарная неделя или месяц, назад листается стрелкой; вперёд, в будущее, нет.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today: string }>()
const kind = ref<StatsPeriod>('week')
const offset = ref(0)
watch(kind, () => (offset.value = 0))

const show = computed(() => hasAnyTraining(props.entries, props.exercises, props.today))
const cmp = computed(() => periodCompare(props.entries, props.exercises, kind.value, props.today, offset.value))
const bars = computed(() =>
  kind.value === 'week'
    ? weeklyVolumes(props.entries, props.exercises, cmp.value.to < props.today ? cmp.value.to : props.today, 8).map((b) => ({ key: b.monday, volume: b.volume, current: b.current, label: `${b.monday.slice(8, 10)}.${b.monday.slice(5, 7)}` }))
    : monthlyVolumes(props.entries, props.exercises, cmp.value.from, 6).map((b) => ({ key: b.monthStart, volume: b.volume, current: b.current, label: b.monthStart.slice(5, 7) + '.' + b.monthStart.slice(2, 4) })),
)
// подходы по группам мышц за выбранный период (недельная цель — только у недели)
const muscles = computed(() => muscleBars(props.entries, props.exercises, cmp.value.from, cmp.value.to, muscleGoals.value, kind.value === 'week'))
const maxSets = computed(() => Math.max(1, ...muscles.value.map((m) => Math.max(m.sets, m.target ?? 0))))
const maxVol = computed(() => Math.max(1, ...bars.value.map((b) => b.volume)))
const unit = defaultWeightUnit()

const ddmm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const title = computed(() => {
  if (kind.value === 'week') return `${ddmm(cmp.value.from)} – ${ddmm(cmp.value.to)}`
  const d = parseIso(cmp.value.from)
  return d.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'ru-RU', { month: 'long', year: 'numeric' })
})
const isNow = computed(() => offset.value === 0)

const tiles = computed(() => [
  { key: 'days', label: t('workouts_wk_days'), value: String(cmp.value.current.days), d: delta(cmp.value.current.days, cmp.value.previous.days), fmt: (n: number) => String(n) },
  { key: 'sets', label: t('workouts_wk_sets'), value: String(cmp.value.current.sets), d: delta(cmp.value.current.sets, cmp.value.previous.sets), fmt: (n: number) => String(n) },
  { key: 'volume', label: t('workouts_wk_volume'), value: cmp.value.current.volume ? `${fmtVolume(cmp.value.current.volume)} ${unit}` : '—', d: delta(cmp.value.current.volume, cmp.value.previous.volume), fmt: (n: number) => fmtVolume(n) },
])
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')
function deltaText(d: Delta, fmt: (n: number) => string): string {
  if (d.kind === 'same') return kind.value === 'week' ? t('workouts_wk_same') : t('workouts_wk_same_month')
  if (d.kind === 'new') return t('workouts_wk_new')
  const abs = fmt(Math.abs(d.diff))
  return `${sign(d.diff)}${abs}${d.pct !== null ? ` (${sign(d.diff)}${Math.abs(d.pct)} %)` : ''}`
}
const deltaColor = (d: Delta) => (d.kind === 'up' || d.kind === 'new' ? 'var(--success)' : 'var(--text-dim)')
const barLabel = (b: { label: string; volume: number }) => `${b.label}: ${b.volume ? fmtVolume(b.volume) + ' ' + unit : '0'}`
</script>

<template>
  <section v-if="show" class="mb-4 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-testid="week-numbers">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 class="m-0 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-dim)">{{ kind === 'week' ? t('workouts_wk_title') : t('workouts_wk_title_month') }}</h2>
      <div class="flex gap-1" role="group" :aria-label="t('workouts_wk_period')">
        <button v-for="k in (['week', 'month'] as const)" :key="k" type="button" class="rounded-full border px-2.5 py-0.5 text-xs" :aria-pressed="kind === k" :style="kind === k ? 'border-color: var(--accent); color: var(--accent); background: transparent' : 'border-color: var(--border); color: var(--text-dim); background: transparent'" :data-testid="'wk-kind-' + k" @click="kind = k">{{ k === 'week' ? t('workouts_wk_kind_week') : t('workouts_wk_kind_month') }}</button>
      </div>
    </div>
    <div class="mb-2 flex items-center justify-between text-sm">
      <button type="button" class="border-0 bg-transparent px-2 py-1" style="color: var(--text)" :aria-label="t('workouts_wk_prev')" data-testid="wk-prev" @click="offset--">‹</button>
      <span class="font-medium" data-testid="wk-title">{{ title }}</span>
      <button type="button" class="border-0 bg-transparent px-2 py-1" :style="{ color: 'var(--text)', opacity: isNow ? 0.3 : 1 }" :aria-label="t('workouts_wk_next')" :disabled="isNow" data-testid="wk-next" @click="offset++">›</button>
    </div>
    <div class="grid grid-cols-3 gap-2">
      <div v-for="x in tiles" :key="x.key" :data-testid="'wk-tile-' + x.key">
        <div class="text-xs" style="color: var(--text-dim)">{{ x.label }}</div>
        <div class="text-lg font-bold" data-testid="wk-value">{{ x.value }}</div>
        <div class="text-xs" :style="{ color: deltaColor(x.d) }" data-testid="wk-delta">{{ deltaText(x.d, x.fmt) }}</div>
      </div>
    </div>
    <div v-if="muscles.length" class="mt-3" data-testid="wk-muscles">
      <div class="mb-1 text-xs" style="color: var(--text-dim)">{{ t('workouts_wk_muscles') }}</div>
      <div v-for="m in muscles" :key="m.muscle" class="mb-1 flex items-center gap-2 text-xs" data-testid="wk-muscle-row">
        <span class="w-24 shrink-0 truncate">{{ t(('workouts_muscle_' + m.muscle) as DictKey) }}</span>
        <span class="relative h-2 flex-1 rounded" style="background: var(--border)">
          <span class="absolute left-0 top-0 h-2 rounded" :style="{ width: Math.round((m.sets / maxSets) * 100) + '%', background: m.target !== null && m.sets >= m.target ? 'var(--success)' : 'var(--accent)' }" data-testid="wk-muscle-fill"></span>
          <span v-if="m.target !== null" class="absolute top-[-2px] h-3 w-px" :style="{ left: Math.round((m.target / maxSets) * 100) + '%', background: 'var(--text-dim)' }"></span>
        </span>
        <span class="w-10 shrink-0 text-right" data-testid="wk-muscle-num">{{ m.sets }}<template v-if="m.target !== null">/{{ m.target }}</template></span>
      </div>
    </div>
    <div class="mt-3 text-xs" style="color: var(--text-dim)">{{ kind === 'week' ? t('workouts_wk_bars') : t('workouts_wk_bars_month') }}</div>
    <div class="mt-1 flex h-14 items-end gap-1" role="img" :aria-label="kind === 'week' ? t('workouts_wk_bars') : t('workouts_wk_bars_month')" data-testid="wk-bars">
      <div v-for="b in bars" :key="b.key" class="flex-1 rounded-t" :style="{ height: Math.max(b.volume ? 6 : 2, Math.round((b.volume / maxVol) * 100)) + '%', background: b.current ? 'var(--accent)' : 'var(--border)' }" :title="barLabel(b)" :data-current="b.current ? '1' : '0'" data-testid="wk-bar"></div>
    </div>
  </section>
</template>
