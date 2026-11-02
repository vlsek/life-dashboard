<script setup lang="ts">
import { computed } from 'vue'
import { isSkewed, muscleBalance, type Pair } from '../lib/muscleBalance'
import { t } from '../lib/i18n'
import type { Exercise, WorkoutEntry } from '../lib/types'

// Баланс нагрузки за период (BACKLOG 80.6): три полоски. Мало подходов — «нет данных», не перекос.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today: string; since: string; days: number }>()
const bal = computed(() => muscleBalance(props.entries, props.exercises, props.today, props.since))

interface Row { id: string; left: string; right: string; pair: Pair; extra?: string }
const rows = computed<Row[]>(() => {
  const b = bal.value
  const gap = b.leftRight.gapPct
  return [
    { id: 'pushpull', left: t('workouts_bal_push'), right: t('workouts_bal_pull'), pair: b.pushPull },
    { id: 'upperlower', left: t('workouts_bal_upper'), right: t('workouts_bal_lower'), pair: b.upperLower },
    { id: 'leftright', left: t('workouts_bal_left'), right: t('workouts_bal_right'), pair: b.leftRight, extra: gap !== null && gap >= 10 ? t(b.leftRight.aReps < b.leftRight.bReps ? 'workouts_bal_left_less' : 'workouts_bal_right_less').replace('{n}', String(gap)) : undefined },
  ]
})
const pct = (p: Pair) => (p.share === null ? 0 : Math.round(p.share * 100))
</script>

<template>
  <section class="mt-3 rounded-lg border p-3" style="border-color: var(--border); background: var(--bg)" data-testid="muscle-balance">
    <div class="mb-2 text-[0.85em] font-semibold">{{ t('workouts_bal_title').replace('{n}', String(days)) }}</div>
    <div v-for="r in rows" :key="r.id" class="mb-2 last:mb-0" :data-id="r.id" data-testid="balance-row">
      <div class="flex justify-between text-[0.8em]" style="color: var(--text-dim)">
        <span>{{ r.left }} · {{ r.pair.a }}</span>
        <span>{{ r.pair.b }} · {{ r.right }}</span>
      </div>
      <div v-if="r.pair.share !== null" class="mt-1 flex h-2 overflow-hidden rounded-full" role="img" :aria-label="r.left + ' ' + pct(r.pair) + '%, ' + r.right + ' ' + (100 - pct(r.pair)) + '%'" style="background: color-mix(in srgb, var(--text-dim) 25%, transparent)">
        <div :style="{ width: pct(r.pair) + '%', background: isSkewed(r.pair.share) ? 'var(--accent)' : 'var(--success)' }"></div>
      </div>
      <div v-else class="mt-1 text-[0.8em]" style="color: var(--text-dim)" data-testid="balance-nodata">{{ t('workouts_bal_nodata') }}</div>
      <div v-if="r.extra" class="mt-1 text-[0.8em]" style="color: var(--accent)" data-testid="balance-extra">{{ r.extra }}</div>
    </div>
    <p class="m-0 mt-2 text-[0.75em]" style="color: var(--text-dim)">{{ t('workouts_bal_note') }}</p>
  </section>
</template>
