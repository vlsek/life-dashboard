<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HistoryContext } from '../lib/historyStats'
import { periodRange, shiftPeriod, summarizePeriod, type MetricTrend, type PeriodKind } from '../lib/periodSummary'
import { buildStory, periodTitle, signedPoints, trendDelta, trendValue } from '../lib/periodSummaryText'
import { t } from '../lib/i18n'
import EmojiText from './EmojiText.vue'

// BACKLOG 73.1: сводка прогресса за неделю / месяц / год со сравнением с прошлым периодом (вариант А «плитки» + строка-«рассказ» Б + таблица «Все метрики» В).
// Счёт — чистый модуль periodSummary.ts; здесь только вид. Свой переключатель периода (по умолчанию «Месяц» текущего месяца), не зависит от сетки ниже.
const props = defineProps<{ ctx: HistoryContext }>()

const kind = ref<PeriodKind>('month')
const offset = ref(0) // сдвиг от текущего периода (≤ 0: в будущее не уходим)
const showTable = ref(false)

const range = computed(() => {
  let r = periodRange(kind.value, props.ctx.today)
  for (let i = 0; i < -offset.value; i++) r = shiftPeriod(r, -1)
  return r
})
const sum = computed(() => summarizePeriod(props.ctx, range.value))
const story = computed(() => buildStory(sum.value))
const kinds: PeriodKind[] = ['week', 'month', 'year']
const kindLabel = (k: PeriodKind) => t(`sum_${k}` as 'sum_week')

function setKind(k: PeriodKind) {
  kind.value = k
  offset.value = 0
  showTable.value = false
}
const noteKey = computed(() => (sum.value.state === 'few' ? 'sum_few' : sum.value.state === 'empty' ? 'sum_empty' : sum.value.compareBlock === 'no_prev' ? 'sum_no_prev' : sum.value.compareBlock === 'coverage' ? 'sum_coverage' : null))
const note = computed(() => (noteKey.value ? t(noteKey.value).replace('{n}', String(sum.value.cur.tracked)) : null))

// разница к прошлому периоду для плиток (только если сравнение разрешено)
const avgDelta = computed(() => (sum.value.compare && sum.value.cur.avgPct != null && sum.value.prev.avgPct != null ? sum.value.cur.avgPct - sum.value.prev.avgPct : null))
function countDelta(cur: number, prev: number): string | null {
  return sum.value.compare ? signedPoints(cur - prev) : null
}
const tiles = computed(() => {
  const s = sum.value
  return [
    { key: 'avg', v: s.cur.avgPct == null ? '—' : s.cur.avgPct + '%', l: t('sum_avg'), d: avgDelta.value == null ? null : `${signedPoints(avgDelta.value)} ${t('sum_pp')}` },
    { key: 'perfect', v: `${s.cur.perfectDays} / ${s.cur.scoredDays}`, l: t('sum_perfect'), d: countDelta(s.cur.perfectDays, s.prev.perfectDays) },
    { key: 'workouts', v: String(s.cur.workoutDays), l: t('sum_workouts'), d: countDelta(s.cur.workoutDays, s.prev.workoutDays) },
    { key: 'goals', v: String(s.cur.planGoalsDone), l: t('sum_goals'), d: countDelta(s.cur.planGoalsDone, s.prev.planGoalsDone) },
  ]
})
const rows = computed(() => (sum.value.metrics ? [...sum.value.metrics.better, ...sum.value.metrics.worse, ...sum.value.metrics.neutral, ...sum.value.metrics.same] : []))
const toneColor = (m: MetricTrend) => (m.tone === 'good' ? 'var(--hist-ok)' : m.tone === 'bad' ? 'var(--danger)' : 'var(--text-dim)')
const groups = computed(() => {
  const m = sum.value.metrics
  if (!m) return []
  return [
    { key: 'better', h: t('sum_better_h'), items: m.better },
    { key: 'worse', h: t('sum_worse_h'), items: m.worse },
    { key: 'neutral', h: t('sum_neutral_h'), items: m.neutral },
  ].filter((g) => g.items.length > 0)
})
</script>

<template>
  <section class="no-edge-swipe mb-3 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-no-swipe data-test="hist-summary">
    <h2 class="mb-2 text-base font-bold"><EmojiText :text="t('sum_h')" /></h2>

    <div class="mb-2 flex gap-1 rounded-xl p-1" style="background: var(--bg)" role="group" :aria-label="t('sum_h')">
      <button
        v-for="k in kinds"
        :key="k"
        type="button"
        class="min-h-11 flex-1 rounded-lg text-sm"
        :class="kind === k ? 'font-bold' : ''"
        :style="{ background: kind === k ? 'var(--bg-card)' : 'transparent', color: 'var(--text)', boxShadow: kind === k ? '0 1px 2px rgba(0,0,0,0.2)' : 'none' }"
        :aria-pressed="kind === k"
        :data-test="`sum-kind-${k}`"
        @click="setKind(k)"
      >
        {{ kindLabel(k) }}
      </button>
    </div>

    <div class="mb-2 flex items-center justify-between gap-2">
      <button type="button" class="min-h-11 min-w-11 rounded-lg border" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" :aria-label="t('sum_prev')" data-test="sum-prev" @click="offset--">‹</button>
      <div class="font-bold" data-test="sum-title">{{ periodTitle(range) }}</div>
      <button type="button" class="min-h-11 min-w-11 rounded-lg border disabled:opacity-40" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" :disabled="offset >= 0" :aria-label="t('sum_next')" data-test="sum-next" @click="offset++">›</button>
    </div>

    <p v-if="sum.state !== 'ok'" class="text-sm" style="color: var(--text-dim)" data-test="sum-note">{{ note }}</p>

    <template v-else>
      <p v-if="story" class="mb-2 text-sm leading-relaxed" data-test="sum-story">{{ story }}</p>
      <div class="grid grid-cols-2 gap-2" data-test="sum-tiles">
        <div v-for="x in tiles" :key="x.key" class="rounded-xl p-2.5" style="background: var(--bg)" :data-test="`sum-tile-${x.key}`">
          <div class="text-xl font-bold">{{ x.v }}</div>
          <div class="text-[0.7em]" style="color: var(--text-dim)">{{ x.l }}</div>
          <div v-if="x.d" class="text-[0.7em]" style="color: var(--text-dim)">{{ x.d }} · {{ t('sum_vs_prev') }}</div>
        </div>
      </div>
      <p class="mt-2 text-[0.75em]" style="color: var(--text-dim)" data-test="sum-tracked">{{ t('sum_tracked').replace('{a}', String(sum.cur.tracked)).replace('{b}', String(sum.cur.possible)) }}</p>
      <p v-if="note" class="mt-1 text-sm" style="color: var(--text-dim)" data-test="sum-note">{{ note }}</p>

      <template v-if="sum.metrics">
        <div v-for="g in groups" :key="g.key" class="mt-3" :data-test="`sum-group-${g.key}`">
          <div class="text-[0.75em]" style="color: var(--text-dim)">{{ g.h }}</div>
          <div v-for="m in g.items" :key="m.id" class="flex min-h-11 items-center justify-between gap-2 border-t py-1.5 text-sm" style="border-color: var(--border)">
            <span class="min-w-0 truncate"><EmojiText :text="`${m.icon} ${m.name}`" /></span>
            <span class="shrink-0 text-right" :style="{ color: toneColor(m) }">{{ trendDelta(m) }}<span class="block text-[0.75em]" style="color: var(--text-dim)">{{ trendValue(m) }}<template v-if="m.kind === 'share'">{{ ' ' + t('sum_share_unit') }}</template></span></span>
          </div>
        </div>
        <p v-if="groups.length === 0" class="mt-3 text-sm" style="color: var(--text-dim)">{{ t('sum_none_better') }}</p>
        <div v-if="sum.metrics.insufficient.length" class="mt-3" data-test="sum-group-insufficient">
          <div class="text-[0.75em]" style="color: var(--text-dim)">{{ t('sum_insuff_h') }}</div>
          <div class="text-sm" style="color: var(--text-dim)"><EmojiText :text="sum.metrics.insufficient.map((x) => `${x.icon} ${x.name}`).join(', ')" /></div>
        </div>

        <button v-if="rows.length" type="button" class="mt-3 min-h-11 rounded-lg border px-3 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" :aria-expanded="showTable" data-test="sum-table-toggle" @click="showTable = !showTable">
          {{ showTable ? t('sum_all_hide') : t('sum_all') }}
        </button>
        <div v-if="showTable" class="mt-2 overflow-x-auto" data-test="sum-table">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[0.75em]" style="color: var(--text-dim)">
                <th class="py-1 font-semibold">{{ t('sum_col_metric') }}</th>
                <th class="whitespace-nowrap py-1 pl-2 text-right font-semibold">{{ t('sum_col_prev') }} → {{ t('sum_col_now') }}</th>
                <th class="py-1 text-right font-semibold">{{ t('sum_col_delta') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in rows" :key="m.id" class="border-t" style="border-color: var(--border)">
                <td class="py-2"><EmojiText :text="`${m.icon} ${m.name}`" /></td>
                <td class="whitespace-nowrap py-2 pl-2 text-right">{{ trendValue(m) }}</td>
                <td class="whitespace-nowrap py-2 pl-2 text-right" :style="{ color: toneColor(m) }">{{ trendDelta(m) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </section>
</template>
