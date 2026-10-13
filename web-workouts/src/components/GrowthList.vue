<script setup lang="ts">
import { computed } from 'vue'
import { capFirst } from '../lib/exerciseNames'
import { growthRows, type GrowthRow, type GrowthStatus } from '../lib/growth'
import { defaultWeightUnit } from '../lib/weightUnit'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import type { Exercise, WorkoutEntry } from '../lib/types'

// «Что растёт / стоит / просело» (BACKLOG 44.5д, срез 2): последние 28 дней против предыдущих 28 по лучшему подходу каждого упражнения.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[] }>()
const rows = computed<GrowthRow[]>(() => growthRows(props.entries, props.exercises, todayStr(), defaultWeightUnit()))
const name = (id: string) => capFirst(props.exercises.find((e) => e.id === id)?.name ?? '')
const ICON: Record<GrowthStatus, string> = { up: '▲', flat: '＝', down: '▼', new: '＋' }
const COLOR: Record<GrowthStatus, string> = { up: 'var(--success)', flat: 'var(--text-dim)', down: 'var(--danger, #e05555)', new: 'var(--accent)' }
const label = (r: GrowthRow) => (r.deltaPct == null ? t('workouts_growth_new') : (r.deltaPct > 0 ? '+' : '') + r.deltaPct + '%')
</script>

<template>
  <section class="mb-4 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="growth">
    <h3 class="m-0 font-bold">{{ t('workouts_growth_title') }}</h3>
    <p class="mb-2 mt-0.5 text-xs" style="color: var(--text-dim)">{{ t('workouts_growth_hint') }}</p>
    <p v-if="rows.length === 0" class="m-0 text-sm" style="color: var(--text-dim)" data-testid="growth-empty">{{ t('workouts_growth_empty') }}</p>
    <ul v-else class="m-0 list-none p-0">
      <li v-for="r in rows" :key="r.exerciseId" class="flex flex-wrap items-baseline gap-x-2 border-t py-1.5 text-sm first:border-0" style="border-color: var(--border)" :data-status="r.status" data-testid="growth-row">
        <span :style="{ color: COLOR[r.status] }" aria-hidden="true">{{ ICON[r.status] }}</span>
        <span class="flex-1 font-medium">{{ name(r.exerciseId) }}</span>
        <span :style="{ color: COLOR[r.status] }" data-testid="growth-delta">{{ label(r) }}</span>
        <span class="w-full pl-5 text-xs" style="color: var(--text-dim)" data-testid="growth-text">{{ r.prevText ? r.prevText + ' → ' + r.curText : r.curText }}</span>
      </li>
    </ul>
  </section>
</template>
