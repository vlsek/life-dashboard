<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { fmtRu } from '../lib/date'
import { prSetText } from '../lib/records'
import { defaultWeightUnit } from '../lib/weightUnit'
import { dayKind, recentCards } from '../lib/startHome'
import type { Exercise, WorkoutEntry } from '../lib/types'
import type { WorkoutSession } from '../lib/sessionContract'

// «Недавние тренировки» на главной (BACKLOG 69.17, срез 2, макет v2): две последние тренировки карточками; полный список — в «Журнале».
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; sessions: WorkoutSession[]; today: string; nowMs?: number }>()
const emit = defineEmits<{ 'open-journal': [] }>()
const cards = computed(() => recentCards(props.entries, props.exercises, props.sessions, props.nowMs ?? Date.now()))
const when = (date: string) => {
  const k = dayKind(date, props.today)
  return k === 'today' ? t('workouts_start_today') : k === 'yesterday' ? t('workouts_start_yesterday') : fmtRu(date).slice(0, 5)
}
const fmtVol = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ${defaultWeightUnit()}`
</script>

<template>
  <section v-if="cards.length" class="mb-3" data-testid="recent-workouts">
    <div class="mb-1 flex items-baseline justify-between">
      <h2 class="m-0 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-dim)">{{ t('workouts_start_recent') }}</h2>
      <button type="button" class="border-0 bg-transparent p-0 text-xs" style="color: var(--accent)" data-testid="recent-all" @click="emit('open-journal')">{{ t('workouts_start_all') }}</button>
    </div>
    <div v-for="c in cards" :key="c.key" class="mb-2 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-testid="recent-card">
      <div class="flex items-baseline justify-between gap-2">
        <b data-testid="recent-name">{{ c.name || t('workouts_start_workout') }}</b>
        <span class="text-xs" style="color: var(--text-dim)" data-testid="recent-when">{{ when(c.date) }}<template v-if="c.minutes"> · {{ c.minutes }} {{ t('workouts_start_min') }}</template></span>
      </div>
      <div class="text-xs" style="color: var(--text-dim)" data-testid="recent-stats"><template v-if="c.volume">{{ t('workouts_journal_volume') }} {{ fmtVol(c.volume) }} · </template>{{ c.sets }} {{ t('workouts_start_sets') }}</div>
      <div v-if="c.top.length" class="mt-1 text-sm" data-testid="recent-top">{{ c.top.map((x) => x.name + ' — ' + prSetText(x.best, defaultWeightUnit())).join(' · ') }}</div>
      <div v-if="c.records" class="mt-1 text-xs font-semibold" style="color: var(--warn, #d9a400)" data-testid="recent-records">★ {{ t('workouts_start_records').replace('{n}', String(c.records)) }}</div>
    </div>
  </section>
</template>
