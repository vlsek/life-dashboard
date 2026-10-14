<script setup lang="ts">
import { computed } from 'vue'
import { weekStreak } from '../lib/weekStreak'
import { fmtRu, todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import type { WorkoutEntry } from '../lib/types'

// «Серия по неделям» (BACKLOG 44.5д, срез 3): недели подряд с тренировкой, лучшая серия, дни этой недели и 8 последних недель столбиками.
const props = defineProps<{ entries: WorkoutEntry[] }>()
const info = computed(() => weekStreak(props.entries, todayStr()))
const maxDays = computed(() => Math.max(1, ...info.value.bars.map((b) => b.days)))
const barTitle = (monday: string, days: number) => t('workouts_streak_bar_title').replace('{date}', fmtRu(monday)).replace('{n}', String(days))
</script>

<template>
  <section v-if="entries.length > 0" class="mb-4 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="week-streak">
    <h3 class="m-0 font-bold">{{ t('workouts_streak_title') }}</h3>
    <div class="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
      <div>
        <div class="text-2xl font-bold leading-none" style="color: var(--accent)" data-testid="streak-current">{{ info.current }}</div>
        <div class="mt-1 text-xs" style="color: var(--text-dim)">{{ t('workouts_streak_current') }}</div>
      </div>
      <div>
        <div class="text-lg font-semibold leading-none" data-testid="streak-best">{{ info.best }}</div>
        <div class="mt-1 text-xs" style="color: var(--text-dim)">{{ t('workouts_streak_best') }}</div>
      </div>
      <div>
        <div class="text-lg font-semibold leading-none" data-testid="streak-week">{{ info.thisWeekDays }}</div>
        <div class="mt-1 text-xs" style="color: var(--text-dim)">{{ t('workouts_streak_week') }}</div>
      </div>
      <div class="flex h-12 items-end gap-1" role="img" :aria-label="t('workouts_streak_bars_aria')" data-testid="streak-bars">
        <span
          v-for="b in info.bars"
          :key="b.monday"
          class="inline-block w-3 rounded-sm"
          :style="{ height: b.days > 0 ? Math.max(18, Math.round((b.days / maxDays) * 100)) + '%' : '8%', background: b.days > 0 ? 'var(--accent)' : 'var(--border)' }"
          :title="barTitle(b.monday, b.days)"
          :data-days="b.days"
        />
      </div>
    </div>
    <p class="mb-0 mt-2 text-xs" style="color: var(--text-dim)">{{ t('workouts_streak_hint') }}</p>
  </section>
</template>
