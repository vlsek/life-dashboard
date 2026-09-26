<script setup lang="ts">
import { computed } from 'vue'
import type { HistoryContext } from '../lib/stats'
import { dayStats, hasData, plannedItemDone, plannedOf } from '../lib/stats'
import { isMetricDone, metricExpectedOn, metricSchedule } from '../lib/metrics'
import type { Metric, MetricValue, SetEntry } from '../lib/types'
import { locale, t } from '../lib/i18n'

const props = defineProps<{ ctx: HistoryContext; dateStr: string }>()
const emit = defineEmits<{ close: [] }>()

const isFuture = computed(() => props.dateStr > props.ctx.today)
const hasStats = computed(() => hasData(props.ctx, props.dateStr))
const stats = computed(() => dayStats(props.ctx, props.dateStr))
const fill = computed(() => Math.min(100, stats.value.pct))

const dateLabel = computed(() => {
  const d = new Date(props.dateStr + 'T00:00:00')
  const s = d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

const metricRows = computed(() => {
  const vals = props.ctx.byDate[props.dateStr] || {}
  return props.ctx.metrics.map((m) => {
    const v = vals[m.id]
    const done = isMetricDone(m, v)
    const expected = metricExpectedOn(m, props.dateStr)
    const sc = metricSchedule(m)
    return {
      metric: m,
      done,
      expected,
      offLabel: !expected && !done ? (sc?.type === 'weekly' ? `${sc.min}${t('dash_schedule_weekly_short')}` : t('hist_not_scheduled')) : null,
      valueText: fmtMetricValue(m, v),
    }
  })
})

function fmtMetricValue(m: Metric, v: MetricValue): string {
  if (v == null) return '—'
  if (m.type === 'boolean') return v === true ? '✓' : '—'
  if (m.type === 'multiselect') {
    if (!Array.isArray(v) || (v as string[]).length === 0) return '—'
    return (v as string[]).map((k) => (m.options || []).find((o) => (o.key ?? o.label) === k)?.label ?? k).join(', ')
  }
  if (m.type === 'sets') {
    const sets = v as SetEntry[]
    if (!Array.isArray(sets) || sets.length === 0) return '—'
    const reps = sets.reduce((sum, s) => sum + (s?.reps || 0), 0)
    const times = sets.map((s) => s?.time).filter(Boolean)
    return `${sets.length} ${t('hist_sets_word')} · ${reps} ${t('hist_reps_word')}` + (times.length ? `\n${times.join(', ')}` : '')
  }
  const goal = m.goal_value ? ` / ${m.goal_direction === 'at_most' ? '< ' : ''}${m.goal_value}` : ''
  return `${v}${m.unit ? ' ' + m.unit : ''}${goal}`
}

const plannedRows = computed(() =>
  plannedOf(props.ctx, props.dateStr).map((item) => ({
    item,
    done: plannedItemDone(props.ctx, item),
  })),
)

const notes = computed<string[]>(() => {
  const raw = props.ctx.notesByDate[props.dateStr]?.items || []
  return raw.map((n) => (typeof n === 'string' ? n : (n?.text ?? '')))
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ dateLabel }}</h3>

      <p v-if="isFuture" class="text-sm" style="color: var(--text-dim)">{{ t('hist_future_day') }}</p>
      <p v-else-if="!hasStats" class="text-sm" style="color: var(--text-dim)">{{ t('hist_no_data') }}</p>

      <template v-else>
        <div class="flex items-baseline gap-2.5">
          <span class="text-2xl font-bold">{{ stats.pct }}%</span>
          <span class="text-sm" style="color: var(--text-dim)">
            {{ t('hist_done_of') }} {{ stats.done }} / {{ stats.total }}<template v-if="stats.bonusPct"> · +{{ stats.bonusPct }}%</template>
          </span>
        </div>
        <div class="my-3 h-2.5 overflow-hidden rounded-md border" style="border-color: var(--border); background: var(--bg)">
          <div class="h-full rounded-md" :style="{ width: fill + '%', background: stats.pct >= 100 ? 'var(--hist-ok)' : 'var(--accent)' }"></div>
        </div>

        <template v-if="ctx.metrics.length">
          <h4 class="mb-1.5 mt-3 font-semibold">{{ t('hist_metrics_h') }}</h4>
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="r in metricRows" :key="r.metric.id">
                <td class="w-[1%] pr-2 align-top">
                  <span v-if="r.done" style="color: var(--hist-ok)">✓</span>
                  <span v-else-if="r.expected" style="color: var(--text-dim); opacity: 0.6">✕</span>
                  <span v-else style="color: var(--text-dim)">–</span>
                </td>
                <td class="py-1 align-top">
                  <span>{{ r.metric.icon }} {{ r.metric.name }}</span>
                  <div v-if="r.offLabel" class="text-[0.75em]" style="color: var(--text-dim)">{{ r.offLabel }}</div>
                </td>
                <td class="whitespace-pre-line py-1 text-right align-top">{{ r.valueText }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-if="plannedRows.length">
          <h4 class="mb-1.5 mt-3.5 font-semibold">{{ t('hist_planned_h') }}</h4>
          <div v-for="(r, i) in plannedRows" :key="i" class="flex items-center gap-2 py-0.5">
            <span v-if="r.done === null" style="color: #e0a93b">⚠</span>
            <span v-else-if="r.done" style="color: var(--hist-ok)">✓</span>
            <span v-else style="color: var(--text-dim); opacity: 0.6">✕</span>
            <span :style="{ opacity: r.done ? 0.7 : 1 }">
              {{ r.item.text }}<template v-if="r.item.type === 'goal'"> ({{ t('cal_goal_suffix') }})</template>
            </span>
            <span v-if="r.item.bonus" style="color: #e0a93b">★</span>
          </div>
        </template>

        <template v-if="notes.length">
          <h4 class="mb-1.5 mt-3.5 font-semibold">{{ t('hist_notes_h') }}</h4>
          <ul class="list-disc pl-5">
            <li v-for="(n, i) in notes" :key="i">{{ n }}</li>
          </ul>
        </template>
      </template>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm"
          style="border-color: var(--border); background: var(--bg); color: var(--text)"
          @click="emit('close')"
        >
          {{ t('dash_close_btn') }}
        </button>
      </div>
    </div>
  </div>
</template>
