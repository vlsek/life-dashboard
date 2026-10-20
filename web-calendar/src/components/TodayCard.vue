<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { parseIso } from '../lib/date'
import type { TodaySummary, UpcomingGoal } from '../lib/todaySummary'

// Карточка «Сегодня» над сеткой «Календаря» (BACKLOG 44.8, срез 4): планы на сегодня и ближайшие сроки целей. Только показ; день открывает кнопка.
const props = defineProps<{ summary: TodaySummary; date: string }>()
const emit = defineEmits<{ open: [date: string] }>()
const title = computed(() => t('cal_today_title') + ', ' + parseIso(props.date).toLocaleDateString(localStorage.getItem('site_lang') === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' }))
const pct = computed(() => (props.summary.plannedTotal ? Math.round((props.summary.plannedDone / props.summary.plannedTotal) * 100) : 0))
const empty = computed(() => !props.summary.plannedTotal)
function due(g: UpcomingGoal): string {
  if (g.kind === 'overdue') return t('cal_due_overdue').replace('{n}', String(-g.daysLeft))
  if (g.kind === 'today') return t('cal_due_today')
  if (g.kind === 'tomorrow') return t('cal_due_tomorrow')
  return t('cal_due_soon').replace('{n}', String(g.daysLeft))
}
</script>

<template>
  <section class="mb-4 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-test="today-card">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 class="m-0 text-base font-medium" data-test="today-title">{{ title }}</h2>
      <button type="button" class="shrink-0 px-3 py-1.5 text-sm" data-test="today-open" @click="emit('open', date)">{{ empty ? t('cal_today_plan') : t('cal_today_open') }}</button>
    </div>

    <p v-if="empty" class="dim m-0 text-sm" data-test="today-none">{{ t('cal_today_none') }}</p>
    <template v-else>
      <p class="m-0 mb-1 text-sm" data-test="today-progress">{{ t('cal_today_plans').replace('{done}', String(summary.plannedDone)).replace('{total}', String(summary.plannedTotal)) }}</p>
      <div class="mb-2 h-1.5 overflow-hidden rounded-full" style="background: var(--border)" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full" :style="{ width: pct + '%', background: 'var(--accent)' }"></div>
      </div>
      <ul class="m-0 list-none p-0 text-sm" data-test="today-plans">
        <li v-for="(p, i) in summary.plans" :key="i" class="flex gap-2" :style="{ color: p.done ? 'var(--text-dim)' : 'var(--text)', textDecoration: p.done ? 'line-through' : 'none' }">
          <span aria-hidden="true">{{ p.done ? '✓' : '○' }}</span><span class="min-w-0 break-words">{{ p.text }}</span>
        </li>
      </ul>
      <p v-if="summary.planMore" class="dim m-0 mt-1 text-xs" data-test="today-plans-more">{{ t('cal_today_more').replace('{n}', String(summary.planMore)) }}</p>
    </template>

    <div v-if="summary.upcoming.length" class="mt-3" data-test="today-deadlines">
      <p class="dim m-0 mb-1 text-xs">{{ t('cal_today_deadlines') }}</p>
      <ul class="m-0 list-none p-0 text-sm">
        <li v-for="g in summary.upcoming" :key="g.id" class="flex justify-between gap-2" :data-kind="g.kind" :data-test="'today-due-' + g.id">
          <span class="min-w-0 break-words">{{ g.name }}</span>
          <span class="shrink-0" :style="{ color: g.kind === 'overdue' ? 'var(--danger)' : 'var(--text-dim)' }">{{ due(g) }}</span>
        </li>
      </ul>
      <p v-if="summary.upcomingMore" class="dim m-0 mt-1 text-xs">{{ t('cal_today_more').replace('{n}', String(summary.upcomingMore)) }}</p>
    </div>
  </section>
</template>
