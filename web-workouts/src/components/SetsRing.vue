<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'

// Кольцо «подходов сегодня: сделано из N по плану» (BACKLOG 44.5а; план — metrics.planned_sets_log, миграция 041).
const props = defineProps<{ done: number; planned: number }>()
const R = 15
const C = 2 * Math.PI * R
const ratio = computed(() => (props.planned > 0 ? Math.min(props.done / props.planned, 1) : 0))
const complete = computed(() => props.planned > 0 && props.done >= props.planned)
const label = computed(() => t('workouts_ring_label').replace('{done}', String(props.done)).replace('{n}', String(props.planned)))
</script>

<template>
  <span class="inline-flex shrink-0 items-center" role="img" :aria-label="label" :title="label" data-testid="sets-ring" :data-complete="complete ? 'true' : 'false'">
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" :r="R" fill="none" stroke="var(--border)" stroke-width="4" />
      <circle
        cx="19"
        cy="19"
        :r="R"
        fill="none"
        :stroke="complete ? 'var(--success, #3fb27f)' : 'var(--accent)'"
        stroke-width="4"
        stroke-linecap="round"
        :stroke-dasharray="C"
        :stroke-dashoffset="C * (1 - ratio)"
        transform="rotate(-90 19 19)"
        data-testid="sets-ring-arc"
      />
      <text x="19" y="23" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">{{ done }}/{{ planned }}</text>
    </svg>
  </span>
</template>
