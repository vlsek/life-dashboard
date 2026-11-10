<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { defaultWeightUnit } from '../lib/weightUnit'
import { fmtVolume } from '../lib/summary'
import { delta, hasAnyTraining, weekCompare, weeklyVolumes, type Delta } from '../lib/weekNumbers'
import type { Exercise, WorkoutEntry } from '../lib/types'

// «Неделя в цифрах» (BACKLOG 69.14, срез 1): три показателя недели с разницей к прошлой и столбики объёма за 8 недель.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today: string }>()
const show = computed(() => hasAnyTraining(props.entries, props.exercises, props.today))
const cmp = computed(() => weekCompare(props.entries, props.exercises, props.today))
const bars = computed(() => weeklyVolumes(props.entries, props.exercises, props.today))
const maxVol = computed(() => Math.max(1, ...bars.value.map((b) => b.volume)))
const unit = defaultWeightUnit()

const tiles = computed(() => [
  { key: 'days', label: t('workouts_wk_days'), value: String(cmp.value.current.days), d: delta(cmp.value.current.days, cmp.value.previous.days), fmt: (n: number) => String(n) },
  { key: 'sets', label: t('workouts_wk_sets'), value: String(cmp.value.current.sets), d: delta(cmp.value.current.sets, cmp.value.previous.sets), fmt: (n: number) => String(n) },
  { key: 'volume', label: t('workouts_wk_volume'), value: cmp.value.current.volume ? `${fmtVolume(cmp.value.current.volume)} ${unit}` : '—', d: delta(cmp.value.current.volume, cmp.value.previous.volume), fmt: (n: number) => fmtVolume(n) },
])
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')
function deltaText(d: Delta, fmt: (n: number) => string): string {
  if (d.kind === 'same') return t('workouts_wk_same')
  if (d.kind === 'new') return t('workouts_wk_new')
  const abs = fmt(Math.abs(d.diff))
  return `${sign(d.diff)}${abs}${d.pct !== null ? ` (${sign(d.diff)}${Math.abs(d.pct)} %)` : ''}`
}
const deltaColor = (d: Delta) => (d.kind === 'up' || d.kind === 'new' ? 'var(--success)' : d.kind === 'down' ? 'var(--text-dim)' : 'var(--text-dim)')
const barLabel = (b: { monday: string; volume: number }) => `${b.monday.slice(8, 10)}.${b.monday.slice(5, 7)}: ${b.volume ? fmtVolume(b.volume) + ' ' + unit : '0'}`
</script>

<template>
  <section v-if="show" class="mb-4 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-testid="week-numbers">
    <h2 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-dim)">{{ t('workouts_wk_title') }}</h2>
    <div class="grid grid-cols-3 gap-2">
      <div v-for="x in tiles" :key="x.key" :data-testid="'wk-tile-' + x.key">
        <div class="text-xs" style="color: var(--text-dim)">{{ x.label }}</div>
        <div class="text-lg font-bold" data-testid="wk-value">{{ x.value }}</div>
        <div class="text-xs" :style="{ color: deltaColor(x.d) }" data-testid="wk-delta">{{ deltaText(x.d, x.fmt) }}</div>
      </div>
    </div>
    <div class="mt-3 text-xs" style="color: var(--text-dim)">{{ t('workouts_wk_bars') }}</div>
    <div class="mt-1 flex h-14 items-end gap-1" role="img" :aria-label="t('workouts_wk_bars')" data-testid="wk-bars">
      <div v-for="b in bars" :key="b.monday" class="flex-1 rounded-t" :style="{ height: Math.max(b.volume ? 6 : 2, Math.round((b.volume / maxVol) * 100)) + '%', background: b.current ? 'var(--accent)' : 'var(--border)' }" :title="barLabel(b)" :data-current="b.current ? '1' : '0'" data-testid="wk-bar"></div>
    </div>
  </section>
</template>
